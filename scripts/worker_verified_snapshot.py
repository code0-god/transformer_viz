# /// script
# requires-python = ">=3.11"
# dependencies = []
# ///
# --- How to run ---
# python3 scripts/worker_verified_snapshot.py ROOT OUTPUT -- COMMAND...

from __future__ import annotations

import json
import os
import subprocess
import sys
import tempfile
from dataclasses import dataclass
from pathlib import Path
from typing import Final

from worker_artifact_install import exclusive_write
from worker_artifact_provenance import ARTIFACT_NAMES, ArtifactSnapshot, validate_artifacts

WORKER_TOKEN: Final = "{verified-worker}"
TSCONFIG_TOKEN: Final = "{verified-tsconfig}"


@dataclass(frozen=True, slots=True)
class SnapshotUseError(RuntimeError):
    reason: str

    def __str__(self) -> str:
        return self.reason


def _write_snapshot(root: Path, directory: Path, snapshot: ArtifactSnapshot) -> Path:
    directory.chmod(0o700)
    directory_fd = os.open(directory, os.O_RDONLY | os.O_DIRECTORY | os.O_NOFOLLOW)
    try:
        for name in ARTIFACT_NAMES:
            exclusive_write(directory_fd, name, snapshot.content(name))
        config = {
            "extends": str(root / "apps/web/tsconfig.json"),
            "compilerOptions": {"paths": {"#worker/*": [str(directory / "*")]}},
            "exclude": [str(root / "apps/web/src/generated/worker")],
        }
        exclusive_write(directory_fd, "tsconfig.json", (json.dumps(config, sort_keys=True) + "\n").encode())
    finally:
        os.close(directory_fd)
    return directory / "tsconfig.json"


def run_verified(root_value: Path, output: Path, command: tuple[str, ...]) -> int:
    root = root_value.resolve(strict=True)
    before = validate_artifacts(root, output)
    if before is None:
        raise SnapshotUseError("Worker cache is not valid before use")
    with tempfile.TemporaryDirectory(prefix=".worker-snapshot.", dir=root / "apps/web") as temporary:
        snapshot_dir = Path(temporary)
        tsconfig = _write_snapshot(root, snapshot_dir, before)
        replacements = {WORKER_TOKEN: str(snapshot_dir), TSCONFIG_TOKEN: str(tsconfig)}
        resolved = tuple(replacements.get(argument, argument) for argument in command)
        environment = os.environ.copy()
        environment["TRANSFORMER_VIZ_VERIFIED_WORKER_DIR"] = str(snapshot_dir)
        completed = subprocess.run(resolved, cwd=root, env=environment, check=False)
        after = validate_artifacts(root, output)
        if after != before:
            raise SnapshotUseError("Worker source or cache drifted during verified use")
        return completed.returncode


def main(arguments: list[str]) -> int:
    if len(arguments) < 4 or arguments[2] != "--":
        print("usage: worker_verified_snapshot.py ROOT OUTPUT -- COMMAND...", file=sys.stderr)
        return 2
    return run_verified(Path(arguments[0]), Path(arguments[1]), tuple(arguments[3:]))


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
