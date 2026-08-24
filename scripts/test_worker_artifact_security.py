# /// script
# requires-python = ">=3.11"
# dependencies = []
# ///
# --- How to run ---
# python3 -m unittest discover -s scripts -p 'test_worker_*.py'

from __future__ import annotations

import json
import os
import shutil
import tempfile
import unittest
from pathlib import Path

from worker_artifact_provenance import ARTIFACT_NAMES, MANIFEST_NAME, validate_artifacts
from worker_artifact_test_support import WorkerFixture


class WorkerArtifactSecurityTests(unittest.TestCase):
    def setUp(self) -> None:
        self.fixture = WorkerFixture()
        self.addCleanup(self.fixture.cleanup)

    def test_boolean_schema_and_sizes_are_rejected(self) -> None:
        cases = (("schema_version", None), *(("size", name) for name in ARTIFACT_NAMES))
        for field, artifact in cases:
            with self.subTest(field=field, artifact=artifact):
                # Given: JSON true in an integer-only provenance field.
                self.fixture.write_valid_set()
                path = self.fixture.output / MANIFEST_NAME
                manifest = json.loads(path.read_text(encoding="utf-8"))
                if artifact is None:
                    manifest[field] = True
                else:
                    manifest["artifacts"][artifact][field] = True
                path.unlink()
                path.write_text(json.dumps(manifest), encoding="utf-8")
                # When: procedural parsing checks exact Python types.
                snapshot = validate_artifacts(self.fixture.root, self.fixture.output)
                # Then: bool is never admitted as int.
                self.assertIsNone(snapshot)

    def test_each_component_symlink_is_rejected_in_tree_and_outside(self) -> None:
        for name in (*ARTIFACT_NAMES, MANIFEST_NAME):
            for location in ("in-tree", "outside"):
                with self.subTest(name=name, location=location):
                    # Given: one component is replaced by a symlink to identical bytes.
                    self.fixture.write_valid_set()
                    component = self.fixture.output / name
                    if location == "in-tree":
                        backing = self.fixture.output.parent / f"{name}.backing"
                    else:
                        backing = Path(self.fixture.temporary.name).parent / f"{self.fixture.root.name}-{name}.backing"
                        self.addCleanup(backing.unlink, missing_ok=True)
                    backing.write_bytes(component.read_bytes())
                    component.unlink()
                    component.symlink_to(backing)
                    # When: FD-anchored validation opens with O_NOFOLLOW.
                    snapshot = validate_artifacts(self.fixture.root, self.fixture.output)
                    # Then: the symlinked set is rejected.
                    self.assertIsNone(snapshot)

    def test_output_directory_symlink_is_rejected_in_tree_and_outside(self) -> None:
        for location in ("in-tree", "outside"):
            with self.subTest(location=location):
                # Given: the output directory itself is replaced by a symlink.
                self.fixture.write_valid_set()
                original = self.fixture.output
                if location == "in-tree":
                    backing = original.parent / "worker-backing"
                else:
                    backing = Path(tempfile.mkdtemp(prefix="worker-output-outside."))
                    self.addCleanup(shutil.rmtree, backing, True)
                    shutil.rmtree(backing)
                original.rename(backing)
                original.symlink_to(backing, target_is_directory=True)
                # When: each directory component is opened without following links.
                snapshot = validate_artifacts(self.fixture.root, original)
                # Then: output redirection is rejected.
                self.assertIsNone(snapshot)
                original.unlink()
                backing.rename(original)

    def test_each_component_hardlink_is_rejected(self) -> None:
        for name in (*ARTIFACT_NAMES, MANIFEST_NAME):
            with self.subTest(name=name):
                # Given: one cache component has a second hardlink.
                self.fixture.write_valid_set()
                component = self.fixture.output / name
                backing = self.fixture.output.parent / f"{name}.hardlink"
                backing.unlink(missing_ok=True)
                os.link(component, backing)
                self.addCleanup(backing.unlink, missing_ok=True)
                # When: the set is validated.
                snapshot = validate_artifacts(self.fixture.root, self.fixture.output)
                # Then: link count proves non-exclusive ownership and reuse is rejected.
                self.assertIsNone(snapshot)
                backing.unlink()

    def test_source_include_symlink_is_rejected_in_tree_and_outside(self) -> None:
        source = self.fixture.root / "assets/input.txt"
        for location in ("in-tree", "outside"):
            with self.subTest(location=location):
                # Given: a Rust include input resolves through a symlink.
                self.fixture.write_valid_set()
                content = source.read_bytes()
                source.unlink()
                if location == "in-tree":
                    backing = self.fixture.root / "assets/input-backing.txt"
                else:
                    backing = Path(self.fixture.temporary.name).parent / f"{self.fixture.root.name}-input.txt"
                    self.addCleanup(backing.unlink, missing_ok=True)
                backing.write_bytes(content)
                source.symlink_to(backing)
                # When: source closure is fingerprinted.
                snapshot = validate_artifacts(self.fixture.root, self.fixture.output)
                # Then: source symlinks fail closed.
                self.assertIsNone(snapshot)
                source.unlink()
                source.write_bytes(content)
                backing.unlink()

    def test_same_size_mutation_at_validation_barrier_is_rejected(self) -> None:
        # Given: a deterministic event mutates JS after its FD bytes are read.
        path = self.fixture.output / "worker.js"
        original = path.read_bytes()

        def mutate() -> None:
            path.write_bytes(b"x" * len(original))

        # When: mutation occurs at the validator's explicit barrier.
        snapshot = validate_artifacts(self.fixture.root, self.fixture.output, mutate)
        # Then: pre/post fstat detects the same-size change.
        self.assertIsNone(snapshot)

    def test_directory_and_fifo_components_are_rejected(self) -> None:
        for kind in ("directory", "fifo"):
            with self.subTest(kind=kind):
                # Given: worker.js is a non-regular filesystem object.
                self.fixture.write_valid_set()
                path = self.fixture.output / "worker.js"
                path.unlink()
                if kind == "directory":
                    path.mkdir()
                else:
                    os.mkfifo(path)
                # When: validation opens the component.
                snapshot = validate_artifacts(self.fixture.root, self.fixture.output)
                # Then: non-regular objects are rejected without reading.
                self.assertIsNone(snapshot)
                if kind == "directory":
                    path.rmdir()
                else:
                    path.unlink()


if __name__ == "__main__":
    unittest.main()
