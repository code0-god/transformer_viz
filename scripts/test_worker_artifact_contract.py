# /// script
# requires-python = ">=3.11"
# dependencies = []
# ///
# --- How to run ---
# python3 -m unittest discover -s scripts -p 'test_worker_*.py'

from __future__ import annotations

import hashlib
import json
import shutil
import unittest

from worker_artifact_provenance import ARTIFACT_NAMES, MANIFEST_NAME, validate_artifacts
from worker_artifact_test_support import WorkerFixture


class WorkerArtifactContractTests(unittest.TestCase):
    def setUp(self) -> None:
        self.fixture = WorkerFixture()
        self.addCleanup(self.fixture.cleanup)

    def test_valid_current_set_returns_byte_snapshot(self) -> None:
        # Given: a coherent current artifact set.
        # When: the validator reads it once.
        snapshot = validate_artifacts(self.fixture.root, self.fixture.output)
        # Then: exact validated bytes are returned for consumers.
        self.assertIsNotNone(snapshot)
        if snapshot is not None:
            self.assertEqual(snapshot.content("worker_bg.wasm")[:4], b"\x00asm")

    def test_missing_set_and_manifest_are_rejected(self) -> None:
        # Given: no generated output.
        shutil.rmtree(self.fixture.output)
        # When: the validator checks the absent set.
        snapshot = validate_artifacts(self.fixture.root, self.fixture.output)
        # Then: reuse is rejected.
        self.assertIsNone(snapshot)

    def test_partial_set_is_rejected_for_each_component(self) -> None:
        for name in (*ARTIFACT_NAMES, MANIFEST_NAME):
            with self.subTest(name=name):
                # Given: a coherent set missing one component.
                self.fixture.write_valid_set()
                (self.fixture.output / name).unlink()
                # When: the partial set is validated.
                snapshot = validate_artifacts(self.fixture.root, self.fixture.output)
                # Then: reuse is rejected.
                self.assertIsNone(snapshot)

    def test_digest_corruption_is_rejected_for_each_artifact(self) -> None:
        for name in ARTIFACT_NAMES:
            with self.subTest(name=name):
                # Given: one artifact changed after provenance was written.
                self.fixture.write_valid_set()
                with (self.fixture.output / name).open("ab") as artifact:
                    artifact.write(b"corrupt")
                # When: the corrupt set is validated.
                snapshot = validate_artifacts(self.fixture.root, self.fixture.output)
                # Then: reuse is rejected.
                self.assertIsNone(snapshot)

    def test_empty_javascript_or_declaration_is_rejected_when_forged(self) -> None:
        empty_digest = hashlib.sha256(b"").hexdigest()
        for name in ("worker.js", "worker.d.ts"):
            with self.subTest(name=name):
                # Given: a forged internally coherent empty text artifact.
                self.fixture.write_valid_set()
                (self.fixture.output / name).write_bytes(b"")
                manifest = json.loads((self.fixture.output / MANIFEST_NAME).read_text(encoding="utf-8"))
                manifest["artifacts"][name] = {"sha256": empty_digest, "size": 0}
                (self.fixture.output / MANIFEST_NAME).unlink()
                (self.fixture.output / MANIFEST_NAME).write_text(json.dumps(manifest), encoding="utf-8")
                # When: the forged set is validated.
                snapshot = validate_artifacts(self.fixture.root, self.fixture.output)
                # Then: empty bindings are rejected.
                self.assertIsNone(snapshot)

    def test_malformed_and_extra_manifest_fields_are_rejected(self) -> None:
        # Given: malformed JSON and then an extra top-level field.
        manifest_path = self.fixture.output / MANIFEST_NAME
        manifest_path.unlink()
        manifest_path.write_text("{malformed\n", encoding="utf-8")
        malformed = validate_artifacts(self.fixture.root, self.fixture.output)
        self.fixture.write_valid_set()
        manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
        manifest["extra"] = True
        manifest_path.unlink()
        manifest_path.write_text(json.dumps(manifest), encoding="utf-8")
        # When: both forms are validated.
        extra = validate_artifacts(self.fixture.root, self.fixture.output)
        # Then: neither malformed nor expanded schemas are admitted.
        self.assertIsNone(malformed)
        self.assertIsNone(extra)

    def test_forged_manifest_cannot_bless_invalid_wasm_magic(self) -> None:
        # Given: invalid WASM with matching digest, size, and current fingerprint.
        invalid = b"junk"
        (self.fixture.output / "worker_bg.wasm").write_bytes(invalid)
        manifest_path = self.fixture.output / MANIFEST_NAME
        manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
        manifest["artifacts"]["worker_bg.wasm"] = {
            "sha256": hashlib.sha256(invalid).hexdigest(),
            "size": len(invalid),
        }
        manifest_path.unlink()
        manifest_path.write_text(json.dumps(manifest), encoding="utf-8")
        # When: the forged set is validated.
        snapshot = validate_artifacts(self.fixture.root, self.fixture.output)
        # Then: WASM magic remains an independent invariant.
        self.assertIsNone(snapshot)


if __name__ == "__main__":
    unittest.main()
