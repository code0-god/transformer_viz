# /// script
# requires-python = ">=3.12"
# dependencies = []
# ///
# ─── How to run ───
# Imported by scripts/browser_acceptance.py.
"""Acceptance provenance, hashing, artifact, and cleanup receipts."""

from __future__ import annotations

import hashlib
import json
import os
import shutil
import socket
import subprocess
import tempfile
from collections.abc import Iterator
from contextlib import contextmanager
from dataclasses import dataclass
from pathlib import Path
from typing import Any


@dataclass(frozen=True, slots=True)
class EvidenceDestinationExists(RuntimeError):
    """Refuse to mutate a previously published evidence destination."""

    destination: Path

    def __str__(self) -> str:
        return f"acceptance evidence destination already exists: {self.destination}"


def sha256(path: Path) -> str:
    """Hash one immutable artifact."""
    digest = hashlib.sha256()
    with path.open("rb") as source:
        for chunk in iter(lambda: source.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def command(argv: list[str], cwd: Path) -> dict[str, Any]:
    """Run one bounded prerequisite and preserve its complete result."""
    result = subprocess.run(
        argv, cwd=cwd, text=True, capture_output=True, timeout=900, check=False
    )
    return {
        "command": argv,
        "returncode": result.returncode,
        "stdout": result.stdout,
        "stderr": result.stderr,
    }


def provenance(
    root: Path, expected_head: str | None
) -> tuple[dict[str, Any], list[str]]:
    """Record HEAD plus a synthetic Git tree for the true nonignored working tree."""
    failures = []
    head = subprocess.check_output(
        ["git", "rev-parse", "HEAD"], cwd=root, text=True
    ).strip()
    head_tree = subprocess.check_output(
        ["git", "rev-parse", "HEAD^{tree}"], cwd=root, text=True
    ).strip()
    with tempfile.NamedTemporaryFile(
        prefix="transformer-viz-index-", delete=False
    ) as index:
        index_path = Path(index.name)
    try:
        shutil.copy2(root / ".git/index", index_path)
        env = os.environ | {"GIT_INDEX_FILE": str(index_path)}
        subprocess.run(
            ["git", "add", "-A"], cwd=root, env=env, check=True, capture_output=True
        )
        tree = subprocess.check_output(
            ["git", "write-tree"], cwd=root, env=env, text=True
        ).strip()
    finally:
        index_path.unlink(missing_ok=True)
    clean = not subprocess.check_output(
        ["git", "status", "--porcelain"], cwd=root, text=True
    ).strip()
    if expected_head is not None:
        if head != expected_head:
            failures.append(f"HEAD {head} != requested {expected_head}")
        if not clean:
            failures.append("frozen --head mode requires a clean repository")
        if tree != head_tree:
            failures.append(
                "frozen --head mode synthetic working tree differs from HEAD tree"
            )
    return {
        "head": head,
        "headTree": head_tree,
        "workingTree": tree,
        "clean": clean,
        "mode": "frozen" if expected_head is not None else "dry-run",
        "dryRun": expected_head is None,
    }, failures


def deployed_hashes(dist: Path) -> dict[str, str]:
    """Hash executable app/Worker JS and WASM release artifacts."""
    files = sorted(
        path
        for path in dist.rglob("*")
        if path.is_file() and path.suffix in {".js", ".wasm"}
    )
    return {str(path.relative_to(dist)): sha256(path) for path in files}


@contextmanager
def publication_staging(final: Path) -> Iterator[Path]:
    """Own a fresh sibling staging directory and remove it unless published."""
    if final.exists() or final.is_symlink():
        raise EvidenceDestinationExists(final)
    final.parent.mkdir(parents=True, exist_ok=True)
    staging = Path(tempfile.mkdtemp(prefix=f".{final.name}-staging-", dir=final.parent))
    try:
        yield staging
    finally:
        if staging.exists():
            shutil.rmtree(staging)


def publish_artifacts(staging: Path, final: Path) -> None:
    """Atomically publish sealed staging only while the destination is absent."""
    if final.exists() or final.is_symlink():
        raise EvidenceDestinationExists(final)
    os.replace(staging, final)


def write_artifacts(
    output: Path, provenance_data: dict[str, Any], payloads: dict[str, Any]
) -> None:
    """Write every receipt with identical source provenance and a hash manifest."""
    for name, value in payloads.items():
        document = {"provenance": provenance_data, "data": value}
        (output / name).write_text(
            json.dumps(document, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
        )
    hashes = {
        path.name: sha256(path)
        for path in sorted(output.iterdir())
        if path.is_file() and path.name != "manifest.json"
    }
    manifest = {"provenance": provenance_data, "artifacts": hashes}
    (output / "manifest.json").write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )


def cleanup_receipt(port: int, temporary: Path, profile: Path) -> dict[str, Any]:
    """Prove owned server, dist, Chrome profile, and port are gone."""
    probe = socket.socket()
    probe.settimeout(0.2)
    try:
        port_closed = probe.connect_ex(("127.0.0.1", port)) != 0
    finally:
        probe.close()
    return {
        "port": port,
        "portClosed": port_closed,
        "temporaryDistAbsent": not temporary.exists(),
        "chromeProfileAbsent": not profile.exists(),
        "appsWebDistAbsent": not Path("apps/web/dist").exists(),
    }
