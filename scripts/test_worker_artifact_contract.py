# /// script
# requires-python = ">=3.11"
# dependencies = []
# ///
# --- How to run ---
# python3 scripts/test_worker_artifact_contract.py

from __future__ import annotations

import json
import shutil
import subprocess
import tempfile
import unittest
from pathlib import Path

from worker_artifact_provenance import (
    ARTIFACT_NAMES,
    MANIFEST_NAME,
    validate_artifacts,
    write_manifest,
)


class WorkerArtifactContractTests(unittest.TestCase):
    def setUp(self) -> None:
        self.temporary_directory = tempfile.TemporaryDirectory()
        self.addCleanup(self.temporary_directory.cleanup)
        self.root = Path(self.temporary_directory.name)
        self.output = self.root / "apps/web/src/generated/worker"
        self._create_source_tree()
        self._write_valid_set()

    def _create_source_tree(self) -> None:
        files = {
            "Cargo.toml": "[workspace]\n",
            "Cargo.lock": "version = 4\n",
            "rust-toolchain.toml": "[toolchain]\nchannel = '1.94.0'\n",
            ".cargo/config.toml": "[term]\ncolor = 'always'\n",
            "scripts/build-worker-wasm.sh": "#!/usr/bin/env bash\n",
            "assets/input.txt": "embedded build input\n",
        }
        package_dirs = (
            "apps/worker",
            "crates/nanogpt-model",
            "crates/nanogpt-schema",
            "crates/nanogpt-tokenizer",
        )
        for package in package_dirs:
            files[f"{package}/Cargo.toml"] = "[package]\nname = 'fixture'\n"
            files[f"{package}/src/lib.rs"] = "pub fn fixture() {}\n"
        files["apps/worker/src/lib.rs"] += 'const INPUT: &str = include_str!("../../../assets/input.txt");\n'
        module_source = Path(__file__).with_name("worker_artifact_provenance.py")
        for relative, content in files.items():
            path = self.root / relative
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_text(content, encoding="utf-8")
        shutil.copy2(module_source, self.root / "scripts/worker_artifact_provenance.py")
        self.output.mkdir(parents=True)

    def _write_valid_set(self) -> None:
        (self.output / "worker.js").write_text("export default function worker() {}\n", encoding="utf-8")
        (self.output / "worker.d.ts").write_text("export default function worker(): void;\n", encoding="utf-8")
        (self.output / "worker_bg.wasm").write_bytes(b"\x00asmfixture")
        write_manifest(self.root, self.output)

    def test_valid_current_set_is_reused(self) -> None:
        # Given: a coherent current artifact set.
        # When: the validator checks its provenance and bytes.
        valid = validate_artifacts(self.root, self.output)
        # Then: the set is reusable.
        self.assertTrue(valid)

    def test_missing_set_and_manifest_are_rejected(self) -> None:
        # Given: no generated output.
        shutil.rmtree(self.output)
        # When: the validator checks the absent set.
        valid = validate_artifacts(self.root, self.output)
        # Then: reuse is rejected.
        self.assertFalse(valid)

    def test_partial_set_is_rejected_for_each_artifact(self) -> None:
        for name in ARTIFACT_NAMES:
            with self.subTest(name=name):
                # Given: a manifest whose artifact set is missing one file.
                self._write_valid_set()
                (self.output / name).unlink()
                # When: the partial set is validated.
                valid = validate_artifacts(self.root, self.output)
                # Then: reuse is rejected.
                self.assertFalse(valid)

    def test_digest_corruption_is_rejected_for_each_artifact(self) -> None:
        for name in ARTIFACT_NAMES:
            with self.subTest(name=name):
                # Given: one artifact changed after provenance was written.
                self._write_valid_set()
                with (self.output / name).open("ab") as artifact:
                    artifact.write(b"corrupt")
                # When: the corrupt set is validated.
                valid = validate_artifacts(self.root, self.output)
                # Then: reuse is rejected.
                self.assertFalse(valid)

    def test_empty_javascript_or_declaration_is_rejected_when_forged(self) -> None:
        for name in ("worker.js", "worker.d.ts"):
            with self.subTest(name=name):
                # Given: a forged internally coherent empty text artifact.
                self._write_valid_set()
                (self.output / name).write_bytes(b"")
                manifest = json.loads((self.output / MANIFEST_NAME).read_text(encoding="utf-8"))
                manifest["artifacts"][name] = {
                    "sha256": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
                    "size": 0,
                }
                (self.output / MANIFEST_NAME).write_text(json.dumps(manifest), encoding="utf-8")
                # When: the forged set is validated.
                valid = validate_artifacts(self.root, self.output)
                # Then: empty bindings are rejected.
                self.assertFalse(valid)

    def test_each_worker_build_input_invalidates_the_fingerprint(self) -> None:
        inputs = (
            "Cargo.toml",
            "Cargo.lock",
            "rust-toolchain.toml",
            ".cargo/config.toml",
            "scripts/build-worker-wasm.sh",
            "scripts/worker_artifact_provenance.py",
            "assets/input.txt",
            "apps/worker/Cargo.toml",
            "apps/worker/src/lib.rs",
            "crates/nanogpt-model/Cargo.toml",
            "crates/nanogpt-model/src/lib.rs",
            "crates/nanogpt-schema/Cargo.toml",
            "crates/nanogpt-schema/src/lib.rs",
            "crates/nanogpt-tokenizer/Cargo.toml",
            "crates/nanogpt-tokenizer/src/lib.rs",
        )
        for relative in inputs:
            with self.subTest(relative=relative):
                # Given: valid artifacts generated before one deterministic input changes.
                path = self.root / relative
                original = path.read_bytes()
                path.write_bytes(original + b"changed\n")
                # When: the stale set is validated.
                valid = validate_artifacts(self.root, self.output)
                path.write_bytes(original)
                # Then: every relevant source, manifest, toolchain, and script invalidates reuse.
                self.assertFalse(valid)

    def test_malformed_manifest_is_rejected(self) -> None:
        # Given: malformed provenance JSON.
        (self.output / MANIFEST_NAME).write_text("{malformed\n", encoding="utf-8")
        # When: the set is validated.
        valid = validate_artifacts(self.root, self.output)
        # Then: reuse is rejected.
        self.assertFalse(valid)

    def test_forged_manifest_cannot_bless_invalid_wasm_magic(self) -> None:
        # Given: invalid WASM with matching digest, size, and current fingerprint.
        (self.output / "worker_bg.wasm").write_bytes(b"junk")
        manifest = json.loads((self.output / MANIFEST_NAME).read_text(encoding="utf-8"))
        manifest["artifacts"]["worker_bg.wasm"] = {
            "sha256": "ef875a1705a4c49ee128eeb10bb8a6c66bb29fe274443597219f2e6c929af78e",
            "size": 4,
        }
        (self.output / MANIFEST_NAME).write_text(json.dumps(manifest), encoding="utf-8")
        # When: the forged set is validated.
        valid = validate_artifacts(self.root, self.output)
        # Then: WASM magic remains an independent invariant.
        self.assertFalse(valid)

    def test_complete_junk_set_triggers_rebuild(self) -> None:
        # Given: the exact F2 complete junk artifact set and no provenance.
        scripts = self.root / "scripts"
        ensure_source = Path(__file__).with_name("ensure-worker-wasm.sh")
        shutil.copy2(ensure_source, scripts / "ensure-worker-wasm.sh")
        event_log = self.root / "build-events"
        fake_build = scripts / "build-worker-wasm.sh"
        fake_build.write_text(
            "#!/usr/bin/env bash\nset -euo pipefail\n"
            f"printf 'build\\n' >> '{event_log}'\n"
            f"printf 'valid js\\n' > '{self.output / 'worker.js'}'\n"
            f"printf 'valid dts\\n' > '{self.output / 'worker.d.ts'}'\n"
            f"printf '\\0asmvalid' > '{self.output / 'worker_bg.wasm'}'\n"
            f"python3 '{scripts / 'worker_artifact_provenance.py'}' write '{self.root}' '{self.output}'\n",
            encoding="utf-8",
        )
        fake_build.chmod(0o755)
        (self.output / MANIFEST_NAME).unlink()
        for name in ARTIFACT_NAMES:
            (self.output / name).write_text("junk\n", encoding="utf-8")

        # When: ensure evaluates the complete junk set.
        subprocess.run(["bash", str(scripts / "ensure-worker-wasm.sh")], check=True, cwd=self.root)

        # Then: exactly one rebuild replaces it with a valid current set.
        self.assertEqual(event_log.read_text(encoding="utf-8"), "build\n")
        self.assertTrue(validate_artifacts(self.root, self.output))


if __name__ == "__main__":
    unittest.main()
