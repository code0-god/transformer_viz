# /// script
# requires-python = ">=3.11"
# dependencies = []
# ///
# --- How to run ---
# python3 -m unittest discover -s scripts -p 'test_worker_*.py'

from __future__ import annotations

import os
import subprocess
import sys
import unittest
from pathlib import Path

from worker_artifact_install import InstallPlan, install_candidate
from worker_artifact_provenance import ARTIFACT_NAMES, MANIFEST_NAME, validate_artifacts
from worker_artifact_test_support import JS_BYTES, WorkerFixture
from worker_source_fingerprint import source_fingerprint
from worker_verified_snapshot import SnapshotUseError, run_verified


class InstallBarrierError(RuntimeError):
    pass


class WorkerSnapshotLifecycleTests(unittest.TestCase):
    def setUp(self) -> None:
        self.fixture = WorkerFixture()
        self.addCleanup(self.fixture.cleanup)

    def _fake_builder(self, body: str) -> Path:
        builder = self.fixture.root / "scripts/build-worker-wasm.sh"
        builder.write_text(
            "#!/usr/bin/env bash\nset -euo pipefail\n"
            f"printf 'build\\n' >> '{self.fixture.root / 'build-events'}'\n{body}",
            encoding="utf-8",
        )
        builder.chmod(0o755)
        return builder

    def test_successful_fake_builder_with_junk_fails_post_validation_once(self) -> None:
        # Given: invalid cache and a builder that exits zero after writing junk without provenance.
        (self.fixture.output / MANIFEST_NAME).unlink()
        self._fake_builder(
            f"printf 'junk\\n' > '{self.fixture.output / 'worker.js'}'\n"
            f"rm -f '{self.fixture.output / MANIFEST_NAME}'\n",
        )
        # When: ensure invokes the builder.
        completed = subprocess.run(
            ["bash", str(self.fixture.root / "scripts/ensure-worker-wasm.sh")],
            cwd=self.fixture.root,
            check=False,
        )
        # Then: independent post-build validation fails and the builder ran once.
        self.assertNotEqual(completed.returncode, 0)
        self.assertEqual((self.fixture.root / "build-events").read_text(encoding="utf-8"), "build\n")

    def test_complete_junk_set_is_rebuilt_once_and_revalidated(self) -> None:
        # Given: the exact complete junk set and a coherent fake builder.
        (self.fixture.output / MANIFEST_NAME).unlink()
        for name in ARTIFACT_NAMES:
            (self.fixture.output / name).write_text("junk\n", encoding="utf-8")
        self._fake_builder(
            f"printf 'export default function worker() {{}}\\n' > '{self.fixture.output / 'worker.js'}'\n"
            f"printf 'export default function worker(): void;\\n' > '{self.fixture.output / 'worker.d.ts'}'\n"
            f"printf '\\0asmfixture' > '{self.fixture.output / 'worker_bg.wasm'}'\n"
            f"PYTHONPATH='{self.fixture.root / 'scripts'}' python3 -c \"from pathlib import Path; "
            f"from worker_artifact_install import write_manifest; write_manifest(Path('{self.fixture.root}'), Path('{self.fixture.output}'))\"\n",
        )
        # When: ensure rebuilds the junk set.
        completed = subprocess.run(
            ["bash", str(self.fixture.root / "scripts/ensure-worker-wasm.sh")],
            cwd=self.fixture.root,
            check=False,
        )
        # Then: one build occurred and ensure independently accepts the installed set.
        self.assertEqual(completed.returncode, 0)
        self.assertEqual((self.fixture.root / "build-events").read_text(encoding="utf-8"), "build\n")
        self.assertIsNotNone(validate_artifacts(self.fixture.root, self.fixture.output))

    def test_cache_mutation_after_snapshot_preserves_child_bytes_and_reports_drift(self) -> None:
        # Given: a child that reads the snapshot before mutating the cache in place.
        observed = self.fixture.root / "observed-worker.js"
        child = self.fixture.root / "snapshot-child.py"
        child.write_text(
            "import os, pathlib\n"
            "snapshot = pathlib.Path(os.environ['TRANSFORMER_VIZ_VERIFIED_WORKER_DIR'])\n"
            f"pathlib.Path('{observed}').write_bytes((snapshot / 'worker.js').read_bytes())\n"
            f"cache = pathlib.Path('{self.fixture.output / 'worker.js'}')\n"
            "cache.write_bytes(b'x' * len(cache.read_bytes()))\n",
            encoding="utf-8",
        )
        # When: verified use executes the child.
        with self.assertRaises(SnapshotUseError):
            run_verified(self.fixture.root, self.fixture.output, (sys.executable, str(child)))
        # Then: child-observed bytes came from the immutable snapshot and post-use drift failed.
        self.assertEqual(observed.read_bytes(), JS_BYTES)

    def test_hidden_install_attacks_leave_external_sentinel_unchanged(self) -> None:
        # Given: old predictable hidden names are symlinked and hardlinked to a sentinel.
        sentinel = self.fixture.root / "sentinel"
        sentinel.write_bytes(b"external sentinel")
        symlink = self.fixture.output / ".worker.js.installing"
        hardlink = self.fixture.output / ".worker.d.ts.installing"
        symlink.symlink_to(sentinel)
        os.link(sentinel, hardlink)
        expected = source_fingerprint(self.fixture.root)
        candidate = self.fixture.root / "apps/web/src/generated/candidate"
        self.fixture.write_candidate(candidate, alternate=True)
        # When: unique exclusive temporary names install the candidate.
        installed = install_candidate(InstallPlan(self.fixture.root, candidate, self.fixture.output, expected))
        # Then: attacker-controlled hidden entries and their target were untouched.
        self.assertEqual(sentinel.read_bytes(), b"external sentinel")
        self.assertTrue(symlink.is_symlink())
        self.assertEqual(hardlink.read_bytes(), b"external sentinel")
        self.assertIsNotNone(installed)

    def test_interruption_before_manifest_never_validates_a_mixed_set(self) -> None:
        # Given: a different coherent candidate and a barrier before manifest replacement.
        expected = source_fingerprint(self.fixture.root)
        candidate = self.fixture.root / "apps/web/src/generated/candidate"
        self.fixture.write_candidate(candidate, alternate=True)

        def interrupt() -> None:
            raise InstallBarrierError("deterministic interruption")

        # When: installation stops after artifacts but before the manifest commit marker.
        with self.assertRaises(InstallBarrierError):
            install_candidate(InstallPlan(self.fixture.root, candidate, self.fixture.output, expected, interrupt))
        # Then: the mixed artifact/old-manifest set fails closed.
        self.assertIsNone(validate_artifacts(self.fixture.root, self.fixture.output))

    def test_destination_symlink_and_hardlink_sentinels_are_not_modified(self) -> None:
        for kind in ("symlink", "hardlink"):
            with self.subTest(kind=kind):
                # Given: an installed destination aliases an external sentinel.
                self.fixture.write_valid_set()
                sentinel = self.fixture.root / f"{kind}-sentinel"
                sentinel.write_bytes(b"do not modify")
                destination = self.fixture.output / "worker.js"
                destination.unlink()
                if kind == "symlink":
                    destination.symlink_to(sentinel)
                else:
                    os.link(sentinel, destination)
                expected = source_fingerprint(self.fixture.root)
                candidate = self.fixture.root / "apps/web/src/generated/candidate"
                if candidate.exists():
                    for path in candidate.iterdir():
                        path.unlink()
                self.fixture.write_candidate(candidate, alternate=True)
                # When: os.replace installs over the destination name.
                install_candidate(InstallPlan(self.fixture.root, candidate, self.fixture.output, expected))
                # Then: the external inode retains its original bytes.
                self.assertEqual(sentinel.read_bytes(), b"do not modify")


if __name__ == "__main__":
    unittest.main()
