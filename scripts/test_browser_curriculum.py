#!/usr/bin/env python3
# /// script
# requires-python = ">=3.12"
# dependencies = []
# ///
# ─── How to run ───
# PYTHONPATH=scripts uv run -m unittest scripts/test_browser_curriculum.py
"""Failing-first release-manifest tests for curriculum browser evidence."""

from __future__ import annotations

import hashlib
import json
import struct
import tempfile
import unittest
import zlib
from collections.abc import Callable
from pathlib import Path
from typing import Final, TypeAlias, TypedDict

from browser_curriculum import CurriculumEvidenceError, validate_release

JsonValue: TypeAlias = None | bool | int | float | str | list["JsonValue"] | dict[str, "JsonValue"]
VIEWPORTS: Final = ((1440, 900), (1024, 768), (390, 844))
CHAPTER_IDS: Final = tuple(
    f"decoder.chapter.{part}.{chapter}"
    for part, count in ((0, 4), (1, 4), (2, 3), (3, 1), (4, 1), (5, 1))
    for chapter in range(1, count + 1)
)


class Capture(TypedDict):
    filename: str
    sha256: str
    width: int
    height: int
    viewport: dict[str, int]
    chapterId: str | None
    chapterOrder: int | None
    routeId: str
    guidePageId: str
    sourceCommit: str
    buildSha256: str
    capturedAtUtc: str
    documentOverflow: int
    localEffectiveRanges: list[int]
    visualizationUiCount: int
    workerActionDelta: int
    axFilename: str
    axSha256: str
    basePath: str


def png(width: int, height: int, marker: int) -> bytes:
    """Create a deterministic valid RGB PNG without test dependencies."""
    signature = b"\x89PNG\r\n\x1a\n"

    def chunk(kind: bytes, data: bytes) -> bytes:
        payload = kind + data
        return struct.pack(">I", len(data)) + payload + struct.pack(">I", zlib.crc32(payload))

    row = b"\x00" + bytes((marker, marker ^ 0x55, marker ^ 0xAA)) * width
    return signature + chunk(b"IHDR", struct.pack(">IIBBBBB", width, height, 8, 2, 0, 0, 0)) + chunk(b"IDAT", zlib.compress(row * height)) + chunk(b"IEND", b"")


FixtureValue: TypeAlias = object


class BrowserCurriculumContractTest(unittest.TestCase):
    root: Path
    primary: list[Capture]
    smoke: list[Capture]
    manifest: dict[str, FixtureValue]

    def setUp(self) -> None:
        # Given: a complete release fixture bound to one source and build.
        self.temporary = tempfile.TemporaryDirectory()
        self.root = Path(self.temporary.name)
        for directory in ("captures", "ax", "audits", "release-build"):
            (self.root / directory).mkdir()
        source_commit = "4" * 40
        release_commit = "5" * 40
        build_sha = "b" * 64
        empty_tree_sha = hashlib.sha256().hexdigest()
        (self.root / "release-build" / "manifest.json").write_text(json.dumps({"sourceCommit": source_commit, "buildSha256": build_sha, "rootSha256": empty_tree_sha, "subpathSha256": empty_tree_sha}))
        (self.root / "release-build" / "root").mkdir()
        (self.root / "release-build" / "subpath").mkdir()
        self.primary = []
        for order, chapter_id in enumerate(CHAPTER_IDS, 1):
            for viewport_index, (width, height) in enumerate(VIEWPORTS):
                route = "decoder.root" if order < 13 else ("decoder.block" if order == 13 else "decoder.self-attention")
                page = f"decoder.curriculum.guide.{chapter_id.removeprefix('decoder.chapter.')}" if order < 12 else ("decoder-guide-root" if order == 12 else ("decoder-guide-block" if order == 13 else "decoder-guide-self-attention"))
                self.primary.append(self._capture(f"chapter-{chapter_id.removeprefix('decoder.chapter.')}_{width}x{height}.png", width, height, source_commit, build_sha, chapter_id, order, route, page, order * 3 + viewport_index))
        self.smoke = [
            self._capture("smoke-root_1440x900.png", 1440, 900, source_commit, build_sha, None, None, "/", "root", 80),
            self._capture("smoke-subpath_1440x900.png", 1440, 900, source_commit, build_sha, None, None, "/transformer_viz/", "subpath", 81),
        ]
        transcript_contract = {
            "schema": "transformer-viz.chrome-ax-focus-transcript",
            "sourceCommit": source_commit,
            "buildSha256": build_sha,
            "evidenceKind": "chrome-ax-keyboard-focus-events",
            "events": [
                {"id": event_id, **({"role": "math", "name": "probability", "partialAxMathCount": 1} if event_id == "math-semantic-unit" else {})}
                for event_id in (
                    "toc-expanded-current", "chapter-heading-focus", "diagram-semantics", "sibling-controls",
                    "gpt-static-image", "gpt-chapter-link",
                    "adjacent-navigation-names", "progress", "math-semantic-unit",
                )
            ],
        }
        transcript = "# Chrome AX focus transcript\n\n<!-- machine-contract\n" + json.dumps(transcript_contract) + "\n-->\n"
        transcript_path = self.root / "chrome-ax-focus-transcript.md"
        transcript_path.write_text(transcript)
        keyboard_path = self.root / "keyboard.json"
        reduced_path = self.root / "reduced-motion.json"
        keyboard_path.write_text('{"complete":true}\n')
        reduced_path.write_text('{"complete":true}\n')
        audit_hashes: dict[str, str] = {}
        for name in ("beginner.md", "technical.md", "originality.md"):
            path = self.root / "audits" / name
            path.write_text("status: complete\n")
            audit_hashes[name] = hashlib.sha256(path.read_bytes()).hexdigest()
        self.manifest = {
            "schema": "transformer-viz.curriculum-release", "version": 2,
            "sourceCommit": source_commit, "releaseCommit": release_commit, "buildSha256": build_sha,
            "generatedAtUtc": "2026-08-25T16:00:00+00:00", "originalityMarker": "human-side-by-side-complete",
            "primaryCaptureCount": 42, "smokeCaptureCount": 2,
            "chapters": [{"id": chapter_id, "order": order} for order, chapter_id in enumerate(CHAPTER_IDS, 1)],
            "primaryCaptures": self.primary, "smokeCaptures": self.smoke,
            "chromeAxFocusTranscript": {"filename": transcript_path.name, "sha256": hashlib.sha256(transcript.encode()).hexdigest()},
            "keyboardEvidence": {"filename": keyboard_path.name, "sha256": hashlib.sha256(keyboard_path.read_bytes()).hexdigest()},
            "reducedMotionEvidence": {"filename": reduced_path.name, "sha256": hashlib.sha256(reduced_path.read_bytes()).hexdigest()},
            "auditFiles": audit_hashes,
        }
        self._write_manifest()

    def tearDown(self) -> None:
        self.temporary.cleanup()

    def _capture(self, filename: str, width: int, height: int, source: str, build: str, chapter: str | None, order: int | None, route: str, page: str, marker: int) -> Capture:
        data = png(width, height, marker)
        (self.root / "captures" / filename).write_bytes(data)
        ax_filename = filename.removesuffix(".png") + ".json"
        ax_path = self.root / "ax" / ax_filename
        ax_path.write_text(json.dumps({"mathSemanticUnits": 1, "nestedMathNodes": 0, "diagramImages": 1, "namedControls": ["control"]}))
        base_path = route if chapter is None else "/"
        return {"filename": filename, "sha256": hashlib.sha256(data).hexdigest(), "width": width, "height": height, "viewport": {"width": width, "height": height}, "chapterId": chapter, "chapterOrder": order, "routeId": route, "guidePageId": page, "sourceCommit": source, "buildSha256": build, "capturedAtUtc": "2026-08-25T16:01:00+00:00", "documentOverflow": 0, "localEffectiveRanges": [0, 0], "visualizationUiCount": 0, "workerActionDelta": 0, "axFilename": ax_filename, "axSha256": hashlib.sha256(ax_path.read_bytes()).hexdigest(), "basePath": base_path}

    def _write_manifest(self) -> None:
        (self.root / "manifest.json").write_text(json.dumps(self.manifest))

    def _rejects(self, gate: str, mutation: Callable[[], Capture | None]) -> None:
        # When: one machine-consumed release invariant is mutated.
        mutation()
        self._write_manifest()
        # Then: validation exits through the intended gate.
        with self.assertRaisesRegex(CurriculumEvidenceError, gate):
            validate_release(self.root)

    def _requires_rejection(self, name: str, mutation: Callable[[], object]) -> None:
        mutation()
        self._write_manifest()
        try:
            validate_release(self.root)
        except CurriculumEvidenceError:
            return
        self.fail(f"validator accepted targeted mutant: {name}")

    def test_accepts_release_when_complete(self) -> None:
        validate_release(self.root)

    def test_rejects_missing_primary_capture_when_matrix_is_incomplete(self) -> None:
        self._rejects("primary capture count", self.primary.pop)

    def test_rejects_duplicate_filename_when_paths_are_not_unique(self) -> None:
        self._rejects("duplicate filename", lambda: self.primary[1].update(filename=self.primary[0]["filename"]))

    def test_rejects_viewport_metadata_when_png_dimensions_disagree(self) -> None:
        self._rejects("primary identity", lambda: self.primary[0]["viewport"].update(width=1439))

    def test_rejects_positive_document_overflow_when_page_scrolls(self) -> None:
        self._rejects("document overflow", lambda: self.primary[0].update(documentOverflow=1))

    def test_rejects_positive_local_effective_overflow_when_owner_scrolls(self) -> None:
        self._rejects("local overflow", lambda: self.primary[0]["localEffectiveRanges"].append(1))

    def test_rejects_visualization_ui_when_concept_has_no_visualization(self) -> None:
        self._rejects("Visualization UI", lambda: self.primary[0].update(visualizationUiCount=1))

    def test_rejects_worker_delta_when_curriculum_action_posts(self) -> None:
        self._rejects("Worker action delta", lambda: self.primary[0].update(workerActionDelta=1))

    def test_rejects_nested_math_node_when_ax_duplicates_formula(self) -> None:
        def mutate() -> None:
            path = self.root / "ax" / self.primary[0]["axFilename"]
            path.write_text(json.dumps({"mathSemanticUnits": 2, "nestedMathNodes": 1, "diagramImages": 1, "namedControls": ["control"]}))
            self.primary[0]["axSha256"] = hashlib.sha256(path.read_bytes()).hexdigest()
        self._rejects("AX math", mutate)

    def test_rejects_stale_artifact_when_build_or_file_hash_differs(self) -> None:
        self._rejects("stale artifact", lambda: self.primary[0].update(buildSha256="c" * 64))

    def test_rejects_non_original_or_stale_audit_marker(self) -> None:
        self._rejects("originality audit", lambda: self.manifest.update(originalityMarker="pending"))

    def test_rejects_missing_or_renamed_chrome_ax_focus_transcript(self) -> None:
        self._rejects("Chrome AX transcript", lambda: self.manifest.update(chromeAxFocusTranscript={"filename": "wrong-transcript.md", "sha256": "0" * 64}))

    def test_rejects_missing_or_wrong_release_commit(self) -> None:
        self._requires_rejection("release commit", lambda: self.manifest.pop("releaseCommit", None))

    def test_rejects_unique_wrong_primary_png_filename(self) -> None:
        def mutate() -> None:
            capture = self.primary[0]
            replacement = "chapter-wrong_1440x900.png"
            (self.root / "captures" / capture["filename"]).rename(
                self.root / "captures" / replacement
            )
            capture["filename"] = replacement

        self._requires_rejection("primary PNG filename", mutate)

    def test_rejects_swapped_primary_route_id(self) -> None:
        def mutate() -> None:
            self.primary[33]["routeId"], self.primary[36]["routeId"] = (
                self.primary[36]["routeId"], self.primary[33]["routeId"]
            )

        self._requires_rejection("primary routeId", mutate)

    def test_rejects_swapped_primary_guide_page_id(self) -> None:
        def mutate() -> None:
            self.primary[33]["guidePageId"], self.primary[36]["guidePageId"] = (
                self.primary[36]["guidePageId"], self.primary[33]["guidePageId"]
            )

        self._requires_rejection("primary guidePageId", mutate)

    def test_rejects_unique_wrong_ax_filename(self) -> None:
        def mutate() -> None:
            capture = self.primary[0]
            replacement = "chapter-wrong_1440x900.json"
            (self.root / "ax" / capture["axFilename"]).rename(
                self.root / "ax" / replacement
            )
            capture["axFilename"] = replacement

        self._requires_rejection("AX filename", mutate)

    def test_rejects_unreferenced_ax_json_orphan(self) -> None:
        self._requires_rejection(
            "AX orphan",
            lambda: (self.root / "ax" / "orphan.json").write_text("{}\n"),
        )


if __name__ == "__main__":
    unittest.main()
