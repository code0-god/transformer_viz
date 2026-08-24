# /// script
# requires-python = ">=3.11"
# dependencies = []
# ///
# --- How to run ---
# Imported by scripts/test_worker_*.py

from __future__ import annotations

import shutil
import subprocess
import tempfile
from pathlib import Path
from typing import Final

from worker_artifact_install import write_manifest
from worker_artifact_provenance import ARTIFACT_NAMES, MANIFEST_NAME
from worker_source_fingerprint import FIXED_INPUTS

JS_BYTES: Final = b"export default function worker() {}\n"
DTS_BYTES: Final = b"export default function worker(): void;\n"
WASM_BYTES: Final = b"\x00asmfixture"


class WorkerFixture:  # noqa: MUTABLE_OK
    """Owns a mutable isolated Cargo workspace and Worker cache for each test."""

    def __init__(self) -> None:
        self.temporary = tempfile.TemporaryDirectory()
        self.root = Path(self.temporary.name).resolve()
        self.output = self.root / "apps/web/src/generated/worker"
        self._write_workspace()
        self.write_valid_set()

    def cleanup(self) -> None:
        self.temporary.cleanup()

    def _write_workspace(self) -> None:
        files = {
            "Cargo.toml": (
                "[workspace]\nmembers = ['apps/worker', 'crates/dep', 'crates/unrelated']\nresolver = '3'\n"
                "[workspace.package]\nversion = '0.1.0'\nedition = '2024'\n"
            ),
            "rust-toolchain.toml": "[toolchain]\nchannel = '1.94.0'\n",
            ".cargo/config.toml": "[term]\ncolor = 'never'\n",
            "apps/worker/Cargo.toml": (
                "[package]\nname = 'transformer-viz-worker'\nversion.workspace = true\nedition.workspace = true\n"
                "[dependencies]\ndep = { path = '../../crates/dep' }\n"
            ),
            "apps/worker/src/lib.rs": 'const INPUT: &str = include_str!("../../../assets/input.txt");\n',
            "crates/dep/Cargo.toml": "[package]\nname = 'dep'\nversion.workspace = true\nedition.workspace = true\n",
            "crates/dep/src/lib.rs": "pub fn dependency() {}\n",
            "crates/unrelated/Cargo.toml": "[package]\nname = 'unrelated'\nversion.workspace = true\nedition.workspace = true\n",
            "crates/unrelated/src/lib.rs": "pub fn unrelated() {}\n",
            "assets/input.txt": "embedded build input\n",
            "apps/web/package.json": "{}\n",
            "apps/web/tsconfig.json": "{}\n",
            "apps/web/vite.config.ts": "export default {};\n",
            "apps/web/src/worker/worker-entry.ts": "export {};\n",
        }
        source_scripts = Path(__file__).parent
        copied_scripts = {
            "scripts/build-web.sh",
            "scripts/build-worker-wasm.sh",
            "scripts/check.sh",
            "scripts/ensure-worker-wasm.sh",
            "scripts/worker_artifact_install.py",
            "scripts/worker_artifact_provenance.py",
            "scripts/worker_source_fingerprint.py",
            "scripts/worker_verified_snapshot.py",
        }
        for relative in FIXED_INPUTS:
            if relative not in files and relative not in copied_scripts:
                files[relative] = f"fixture input: {relative}\n"
        for relative, content in files.items():
            path = self.root / relative
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_text(content, encoding="utf-8")
        for relative in copied_scripts:
            destination = self.root / relative
            destination.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(source_scripts / Path(relative).name, destination)
        self.output.mkdir(parents=True)
        subprocess.run(["cargo", "generate-lockfile"], cwd=self.root, check=True, capture_output=True)

    def write_candidate(self, directory: Path, *, alternate: bool = False) -> None:
        directory.mkdir(parents=True, exist_ok=True)
        suffix = b" alternate" if alternate else b""
        (directory / "worker.js").write_bytes(JS_BYTES + suffix)
        (directory / "worker.d.ts").write_bytes(DTS_BYTES + suffix)
        (directory / "worker_bg.wasm").write_bytes(WASM_BYTES + suffix)

    def write_valid_set(self) -> None:
        for name in (*ARTIFACT_NAMES, MANIFEST_NAME):
            path = self.output / name
            if path.exists() or path.is_symlink():
                path.unlink()
        self.write_candidate(self.output)
        write_manifest(self.root, self.output)

    def regenerate_lock(self) -> None:
        subprocess.run(["cargo", "generate-lockfile"], cwd=self.root, check=True, capture_output=True)
