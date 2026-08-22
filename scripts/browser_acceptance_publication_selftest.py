#!/usr/bin/env python3
# /// script
# requires-python = ">=3.12"
# dependencies = []
# ///
# ─── How to run ───
# uv run scripts/browser_acceptance_publication_selftest.py
"""Mutation checks for stale-safe acceptance evidence publication."""

from __future__ import annotations

import json
import tempfile
from pathlib import Path

from browser_acceptance_artifacts import (
    EvidenceDestinationExists,
    publication_staging,
    publish_artifacts,
    write_artifacts,
)


class SyntheticRunFailure(RuntimeError):
    """Terminate a staged test run before publication."""


def existing_destination_refusal(root: Path) -> None:
    """Prove an existing destination is rejected without mutation."""
    # Given: a requested destination containing stale evidence.
    final = root / "existing"
    final.mkdir()
    stale = final / "stale.txt"
    stale.write_text("old evidence\n", encoding="utf-8")

    # When: a new publication requests that destination.
    try:
        with publication_staging(final):
            raise AssertionError("existing destination was accepted")
    except EvidenceDestinationExists as error:
        assert error.destination == final

    # Then: the old destination remains byte-for-byte intact.
    assert stale.read_text(encoding="utf-8") == "old evidence\n"
    assert list(final.iterdir()) == [stale]


def stale_file_manifest_exclusion(root: Path) -> None:
    """Prove stale sibling evidence cannot enter a fresh run manifest."""
    # Given: stale evidence beside a new, absent destination.
    stale = root / ".acceptance-staging-old"
    stale.mkdir()
    (stale / "stale.txt").write_text("old evidence\n", encoding="utf-8")
    final = root / "fresh"

    # When: current-run evidence is staged and published.
    with publication_staging(final) as staging:
        write_artifacts(staging, {"head": "current"}, {"receipt.json": {"ok": True}})
        publish_artifacts(staging, final)

    # Then: only the current-run receipt is sealed into the manifest.
    manifest = json.loads((final / "manifest.json").read_text(encoding="utf-8"))
    assert set(manifest["artifacts"]) == {"receipt.json"}
    assert not (final / "stale.txt").exists()


def failed_run_absence(root: Path) -> None:
    """Prove a failed run removes staging and leaves no destination."""
    # Given: an absent requested destination.
    final = root / "failed"
    staging_name = ""

    # When: the run fails after creating a staged artifact.
    failed = False
    try:
        with publication_staging(final) as staging:
            staging_name = staging.name
            (staging / "partial.txt").write_text("partial\n", encoding="utf-8")
            raise SyntheticRunFailure
    except SyntheticRunFailure:
        failed = True

    # Then: neither partial destination nor staging survives.
    assert failed
    assert not final.exists()
    assert not (root / staging_name).exists()


def successful_atomic_publication(root: Path) -> None:
    """Prove successful publication moves the staged directory atomically."""
    # Given: sealed evidence in a fresh sibling staging directory.
    final = root / "published"
    with publication_staging(final) as staging:
        write_artifacts(staging, {"head": "current"}, {"receipt.json": {"ok": True}})
        staged_inode = staging.stat().st_ino

        # When: publication succeeds.
        publish_artifacts(staging, final)

    # Then: the same directory inode appears at the final path.
    assert final.stat().st_ino == staged_inode
    assert (final / "manifest.json").is_file()


def main() -> int:
    """Run publication mutation checks in isolated filesystems."""
    with tempfile.TemporaryDirectory(prefix="acceptance-publication-selftest-") as raw:
        root = Path(raw)
        existing_destination_refusal(root)
        stale_file_manifest_exclusion(root)
        failed_run_absence(root)
        successful_atomic_publication(root)
    print("browser acceptance publication self-test: PASS")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
