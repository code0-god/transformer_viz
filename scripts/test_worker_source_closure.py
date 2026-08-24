# /// script
# requires-python = ">=3.11"
# dependencies = []
# ///
# --- How to run ---
# python3 -m unittest discover -s scripts -p 'test_worker_*.py'

from __future__ import annotations

import unittest

from worker_artifact_install import InstallPlan, install_candidate
from worker_artifact_provenance import ArtifactContractError, validate_artifacts
from worker_artifact_test_support import WorkerFixture
from worker_source_fingerprint import source_fingerprint


class WorkerSourceClosureTests(unittest.TestCase):
    def setUp(self) -> None:
        self.fixture = WorkerFixture()
        self.addCleanup(self.fixture.cleanup)

    def test_reachable_dependency_same_size_mutation_invalidates(self) -> None:
        # Given: current artifacts and a reachable path dependency source.
        source = self.fixture.root / "crates/dep/src/lib.rs"
        original = source.read_bytes()
        source.write_bytes(b"x" * len(original))
        # When: the current set is validated after a same-size source mutation.
        snapshot = validate_artifacts(self.fixture.root, self.fixture.output)
        # Then: metadata-derived closure invalidates reuse.
        self.assertIsNone(snapshot)

    def test_added_worker_path_dependency_is_discovered(self) -> None:
        # Given: a new normal path dependency added after the original graph.
        new = self.fixture.root / "crates/new-dep"
        (new / "src").mkdir(parents=True)
        (new / "Cargo.toml").write_text(
            "[package]\nname = 'new-dep'\nversion = '0.1.0'\nedition = '2024'\n",
            encoding="utf-8",
        )
        source = new / "src/lib.rs"
        source.write_text("pub fn new_dependency() {}\n", encoding="utf-8")
        worker = self.fixture.root / "apps/worker/Cargo.toml"
        worker.write_text(worker.read_text(encoding="utf-8") + "new-dep = { path = '../../crates/new-dep' }\n", encoding="utf-8")
        self.fixture.regenerate_lock()
        self.fixture.write_valid_set()
        source.write_text("pub fn changed_dependency() {}\n", encoding="utf-8")
        # When: the newly reachable package changes.
        snapshot = validate_artifacts(self.fixture.root, self.fixture.output)
        # Then: no hard-coded source list can omit it.
        self.assertIsNone(snapshot)

    def test_renamed_worker_path_dependency_is_discovered(self) -> None:
        # Given: the reachable dependency directory is renamed and metadata updated.
        old = self.fixture.root / "crates/dep"
        renamed = self.fixture.root / "crates/renamed-dep"
        old.rename(renamed)
        workspace = self.fixture.root / "Cargo.toml"
        workspace.write_text(workspace.read_text(encoding="utf-8").replace("crates/dep", "crates/renamed-dep"), encoding="utf-8")
        worker = self.fixture.root / "apps/worker/Cargo.toml"
        worker.write_text(worker.read_text(encoding="utf-8").replace("crates/dep", "crates/renamed-dep"), encoding="utf-8")
        self.fixture.regenerate_lock()
        self.fixture.write_valid_set()
        (renamed / "src/lib.rs").write_text("pub fn renamed_changed() {}\n", encoding="utf-8")
        # When: the renamed package changes.
        snapshot = validate_artifacts(self.fixture.root, self.fixture.output)
        # Then: manifest paths from cargo metadata define the closure.
        self.assertIsNone(snapshot)

    def test_unrelated_workspace_crate_does_not_invalidate(self) -> None:
        # Given: a valid set and an unreachable workspace crate.
        before = source_fingerprint(self.fixture.root)
        unrelated = self.fixture.root / "crates/unrelated/src/lib.rs"
        unrelated.write_text("pub fn changed_but_unreachable() {}\n", encoding="utf-8")
        # When: source fingerprint and cache validity are recomputed.
        after = source_fingerprint(self.fixture.root)
        snapshot = validate_artifacts(self.fixture.root, self.fixture.output)
        # Then: unreachable workspace inputs do not perturb Worker provenance.
        self.assertEqual(after, before)
        self.assertIsNotNone(snapshot)

    def test_dev_only_dependency_is_not_reachable(self) -> None:
        # Given: an unrelated crate connected only by a dev edge.
        worker = self.fixture.root / "apps/worker/Cargo.toml"
        worker.write_text(
            worker.read_text(encoding="utf-8") + "\n[dev-dependencies]\nunrelated = { path = '../../crates/unrelated' }\n",
            encoding="utf-8",
        )
        self.fixture.regenerate_lock()
        self.fixture.write_valid_set()
        before = source_fingerprint(self.fixture.root)
        unrelated = self.fixture.root / "crates/unrelated/src/lib.rs"
        unrelated.write_text("pub fn dev_only_changed() {}\n", encoding="utf-8")
        # When: the dev-only source changes.
        after = source_fingerprint(self.fixture.root)
        # Then: release Worker provenance ignores dev edges.
        self.assertEqual(after, before)

    def test_source_mutation_during_build_rejects_install(self) -> None:
        # Given: a pre-build fingerprint and a private generated candidate.
        expected = source_fingerprint(self.fixture.root)
        candidate = self.fixture.root / "apps/web/src/generated/candidate"
        self.fixture.write_candidate(candidate, alternate=True)
        source = self.fixture.root / "apps/worker/src/lib.rs"
        source.write_text(source.read_text(encoding="utf-8") + "// changed during build\n", encoding="utf-8")
        # When: installation requires the pre-build fingerprint.
        with self.assertRaises(ArtifactContractError):
            install_candidate(InstallPlan(self.fixture.root, candidate, self.fixture.output, expected))
        # Then: the previously valid installed set remains untouched but source-stale.
        self.assertIsNone(validate_artifacts(self.fixture.root, self.fixture.output))


if __name__ == "__main__":
    unittest.main()
