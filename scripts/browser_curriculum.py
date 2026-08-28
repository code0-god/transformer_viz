#!/usr/bin/env python3
# /// script
# requires-python = ">=3.12"
# dependencies = []
# ///
# ─── How to run ───
# PYTHONPATH=scripts uv run scripts/browser_curriculum.py validate --evidence .omo/evidence/curriculum/phase-08 --source-commit "$(git rev-parse HEAD^)" --release-commit "$(git rev-parse HEAD)"
"""Validate and capture decoder curriculum release evidence."""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import struct
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import Final, NoReturn, TypeAlias, TypeIs

from browser_architecture_contract import capture_curriculum_release

JsonValue: TypeAlias = None | bool | int | float | str | list["JsonValue"] | dict[str, "JsonValue"]
EXPECTED_SCHEMA: Final = "transformer-viz.curriculum-release"
TRANSCRIPT_SCHEMA: Final = "transformer-viz.chrome-ax-focus-transcript"
TRANSCRIPT_START: Final = "<!-- machine-contract\n"
TRANSCRIPT_END: Final = "\n-->"
TRANSCRIPT_EVENTS: Final = (
    "toc-expanded-current", "chapter-heading-focus", "diagram-semantics", "sibling-controls",
    "gpt-static-image", "gpt-chapter-link", "adjacent-navigation-names",
    "progress", "math-semantic-unit",
)
VIEWPORTS: Final = ((1440, 900), (1024, 768), (390, 844))
CHAPTER_IDS: Final = tuple(
    f"decoder.chapter.{part}.{chapter}"
    for part, count in ((0, 4), (1, 4), (2, 3), (3, 1), (4, 1), (5, 1))
    for chapter in range(1, count + 1)
)
COMMIT_PATTERN: Final = re.compile(r"^[0-9a-f]{40}$")


@dataclass(slots=True)
class CurriculumEvidenceError(RuntimeError):
    """Release evidence violates a machine-consumed contract."""

    gate: str
    detail: str

    def __str__(self) -> str:
        return f"{self.gate}: {self.detail}"


def _fail(gate: str, detail: str) -> NoReturn:
    raise CurriculumEvidenceError(gate=gate, detail=detail)


def _is_object(value: JsonValue) -> TypeIs[dict[str, JsonValue]]:
    return isinstance(value, dict)


def _is_array(value: JsonValue) -> TypeIs[list[JsonValue]]:
    return isinstance(value, list)


def _object(value: JsonValue, gate: str) -> dict[str, JsonValue]:
    if not _is_object(value):
        _fail("manifest schema", f"{gate} must be an object")
    return value


def _array(value: JsonValue, gate: str) -> list[JsonValue]:
    if not _is_array(value):
        _fail("manifest schema", f"{gate} must be an array")
    return value


def _load_json(path: Path) -> dict[str, JsonValue]:
    try:
        value: JsonValue = json.loads(path.read_text())
    except (OSError, json.JSONDecodeError) as error:
        _fail("manifest schema", f"cannot read {path}: {error}")
    return _object(value, str(path))


def _sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def _tree_sha(root: Path) -> str:
    digest = hashlib.sha256()
    for path in sorted(item for item in root.rglob("*") if item.is_file()):
        digest.update(path.relative_to(root).as_posix().encode())
        digest.update(bytes.fromhex(_sha256(path)))
    return digest.hexdigest()


def _bound_file(evidence: Path, manifest: dict[str, JsonValue], key: str, filename: str, gate: str) -> Path:
    binding = _object(manifest.get(key), key)
    if binding.get("filename") != filename:
        _fail(gate, f"exact filename absent: {filename}")
    path = evidence / filename
    if not path.is_file() or binding.get("sha256") != _sha256(path):
        _fail(gate, f"missing or stale file: {filename}")
    return path


def _png_dimensions(path: Path) -> tuple[int, int]:
    try:
        data = path.read_bytes()[:24]
    except OSError as error:
        _fail("stale artifact", f"cannot read {path}: {error}")
    if len(data) != 24 or data[:8] != b"\x89PNG\r\n\x1a\n" or data[12:16] != b"IHDR":
        _fail("viewport metadata", f"invalid PNG {path.name}")
    return struct.unpack(">II", data[16:24])


def _records(manifest: dict[str, JsonValue], key: str) -> list[dict[str, JsonValue]]:
    return [_object(item, key) for item in _array(manifest.get(key), key)]


def _transcript_contract(path: Path) -> dict[str, JsonValue]:
    try:
        text = path.read_text()
        start = text.index(TRANSCRIPT_START) + len(TRANSCRIPT_START)
        end = text.index(TRANSCRIPT_END, start)
        value: JsonValue = json.loads(text[start:end])
    except (OSError, ValueError, json.JSONDecodeError) as error:
        _fail("Chrome AX transcript", f"cannot read machine contract: {error}")
    return _object(value, str(path))


def _temporal(value: JsonValue, gate: str) -> datetime:
    if not isinstance(value, str):
        _fail("stale artifact", f"missing timestamp for {gate}")
    try:
        parsed = datetime.fromisoformat(value)
    except ValueError:
        _fail("stale artifact", f"invalid timestamp for {gate}")
    if parsed.tzinfo is None:
        _fail("stale artifact", f"timestamp lacks timezone for {gate}")
    return parsed


def _route_page(order: int, chapter_id: str) -> tuple[str, str]:
    route = "decoder.root" if order < 13 else ("decoder.block" if order == 13 else "decoder.self-attention")
    page = (
        f"decoder.curriculum.guide.{chapter_id.removeprefix('decoder.chapter.')}"
        if order < 12
        else ("decoder-guide-root" if order == 12 else ("decoder-guide-block" if order == 13 else "decoder-guide-self-attention"))
    )
    return route, page


def _primary_identity(item: dict[str, JsonValue]) -> tuple[JsonValue, ...]:
    viewport = _object(item.get("viewport"), "primary viewport")
    return (
        item.get("chapterId"), item.get("chapterOrder"), item.get("width"), item.get("height"),
        viewport.get("width"), viewport.get("height"), item.get("filename"), item.get("routeId"),
        item.get("guidePageId"), item.get("axFilename"),
    )


def _expected_primary_identities() -> list[tuple[JsonValue, ...]]:
    identities: list[tuple[JsonValue, ...]] = []
    for order, chapter_id in enumerate(CHAPTER_IDS, 1):
        route, page = _route_page(order, chapter_id)
        short_id = chapter_id.removeprefix("decoder.chapter.")
        for width, height in VIEWPORTS:
            filename = f"chapter-{short_id}_{width}x{height}.png"
            identities.append((chapter_id, order, width, height, width, height, filename, route, page, filename.removesuffix(".png") + ".json"))
    return identities


def _smoke_identity(item: dict[str, JsonValue]) -> tuple[JsonValue, ...]:
    return (item.get("filename"), item.get("basePath"), item.get("routeId"), item.get("guidePageId"), item.get("axFilename"))


def _validate_schema_and_provenance(
    manifest: dict[str, JsonValue], expected_source: str | None, expected_release: str | None
) -> tuple[str, str, str]:
    if manifest.get("schema") != EXPECTED_SCHEMA or manifest.get("version") != 2:
        _fail("manifest schema", "schema/version mismatch")
    source, release, build = manifest.get("sourceCommit"), manifest.get("releaseCommit"), manifest.get("buildSha256")
    if not isinstance(source, str) or not COMMIT_PATTERN.fullmatch(source):
        _fail("source commit", "required 40hex sourceCommit absent")
    if not isinstance(release, str) or not COMMIT_PATTERN.fullmatch(release):
        _fail("release commit", "required 40hex releaseCommit absent")
    if not isinstance(build, str) or len(build) != 64:
        _fail("manifest schema", "required buildSha256 absent")
    if expected_source is not None and source != expected_source:
        _fail("source commit", "sourceCommit differs from expected app source")
    if expected_release is not None and release != expected_release:
        _fail("release commit", "releaseCommit differs from expected release")
    return source, release, build


def _validate_build(evidence: Path, source: str, build: str) -> None:
    build_manifest = _load_json(evidence / "release-build" / "manifest.json")
    if (
        source != build_manifest.get("sourceCommit")
        or build != build_manifest.get("buildSha256")
        or build_manifest.get("rootSha256") != _tree_sha(evidence / "release-build" / "root")
        or build_manifest.get("subpathSha256") != _tree_sha(evidence / "release-build" / "subpath")
    ):
        _fail("stale artifact", "release build binding mismatch")


def _validate_identities(primary: list[dict[str, JsonValue]], smoke: list[dict[str, JsonValue]]) -> None:
    if [_primary_identity(item) for item in primary] != _expected_primary_identities():
        _fail("primary identity", "ordered Chapter/viewport/filename/route/page/AX identity mismatch")
    expected_smoke = [
        ("smoke-root_1440x900.png", "/", "/", "root", "smoke-root_1440x900.json"),
        ("smoke-subpath_1440x900.png", "/transformer_viz/", "/transformer_viz/", "subpath", "smoke-subpath_1440x900.json"),
    ]
    if [_smoke_identity(item) for item in smoke] != expected_smoke:
        _fail("smoke identity", "ordered root/subpath filename/base/route/AX identity mismatch")


def _validate_inventory(evidence: Path, artifacts: list[dict[str, JsonValue]]) -> None:
    png_names = [item.get("filename") for item in artifacts]
    ax_names = [item.get("axFilename") for item in artifacts]
    if len(png_names) != len(set(png_names)) or len(ax_names) != len(set(ax_names)):
        _fail("duplicate filename", "PNG and AX filenames must each be unique")
    disk_png = {path.relative_to(evidence / "captures").as_posix() for path in (evidence / "captures").rglob("*.png")}
    disk_ax = {path.relative_to(evidence / "ax").as_posix() for path in (evidence / "ax").rglob("*.json")}
    if set(png_names) != disk_png or len(disk_png) != 44:
        _fail("PNG inventory", "referenced and recursive disk PNG inventories must equal exact 44")
    if set(ax_names) != disk_ax or len(disk_ax) != 44:
        _fail("AX inventory", "referenced and recursive disk AX inventories must equal exact 44")


def _validate_artifact_surface(
    evidence: Path, artifact: dict[str, JsonValue], source: str, build: str, generated: datetime
) -> str:
    name = artifact.get("filename")
    if not isinstance(name, str):
        _fail("manifest schema", "capture filename must be a string")
    path = evidence / "captures" / name
    if _png_dimensions(path) != (artifact.get("width"), artifact.get("height")):
        _fail("viewport metadata", name)
    if artifact.get("sourceCommit") != source or artifact.get("buildSha256") != build or artifact.get("sha256") != _sha256(path):
        _fail("stale artifact", name)
    if _temporal(artifact.get("capturedAtUtc"), name) < generated:
        _fail("stale artifact", f"capture predates manifest epoch: {name}")
    surface_gates = (
        (artifact.get("documentOverflow") != 0, "document overflow"),
        (any(value != 0 for value in _array(artifact.get("localEffectiveRanges"), name)), "local overflow"),
        (artifact.get("visualizationUiCount") != 0, "Visualization UI"),
        (artifact.get("workerActionDelta") != 0, "Worker action delta"),
    )
    for failed, gate in surface_gates:
        if failed:
            _fail(gate, name)
    return name


def _validate_artifact_ax(evidence: Path, artifact: dict[str, JsonValue], name: str, primary: bool) -> None:
    ax_path = evidence / "ax" / str(artifact.get("axFilename"))
    if artifact.get("axSha256") != _sha256(ax_path):
        _fail("stale artifact", f"AX hash mismatch: {name}")
    container = _load_json(ax_path)
    ax = _object(container.get("summary"), name) if _is_object(container.get("summary")) else container
    math_units = ax.get("mathSemanticUnits")
    if ax.get("nestedMathNodes") != 0 or not isinstance(math_units, int) or math_units < 0 or ax.get("sampledMathUnitExact") is False:
        _fail("AX math", name)
    order = artifact.get("chapterOrder")
    figure_alternatives = ax.get("visibleFigureAlternatives")
    if (
        primary
        and isinstance(order, int)
        and order <= 12
        and ax.get("diagramImages") != 1
        and (
            not isinstance(figure_alternatives, int)
            or figure_alternatives < 1
        )
    ):
        _fail("AX Figure semantics", name)
    if primary and isinstance(order, int) and order >= 12 and not _array(ax.get("namedControls"), name):
        _fail("AX named controls", name)


def _validate_artifact(evidence: Path, artifact: dict[str, JsonValue], source: str, build: str, generated: datetime, primary: bool) -> None:
    name = _validate_artifact_surface(evidence, artifact, source, build, generated)
    _validate_artifact_ax(evidence, artifact, name, primary)


def _validate_transcript_and_audits(evidence: Path, manifest: dict[str, JsonValue], source: str, build: str) -> None:
    transcript_path = _bound_file(evidence, manifest, "chromeAxFocusTranscript", "chrome-ax-focus-transcript.md", "Chrome AX transcript")
    _bound_file(evidence, manifest, "keyboardEvidence", "keyboard.json", "keyboard evidence")
    _bound_file(evidence, manifest, "reducedMotionEvidence", "reduced-motion.json", "reduced-motion evidence")
    transcript = _transcript_contract(transcript_path)
    events = _records(transcript, "events")
    if (
        transcript.get("schema") != TRANSCRIPT_SCHEMA or transcript.get("sourceCommit") != source
        or transcript.get("buildSha256") != build or transcript.get("evidenceKind") != "chrome-ax-keyboard-focus-events"
        or tuple(event.get("id") for event in events) != TRANSCRIPT_EVENTS
    ):
        _fail("Chrome AX transcript", "contract binding or ordered events mismatch")
    math_event = events[-1]
    if math_event.get("role") != "math" or math_event.get("partialAxMathCount") != 1 or not math_event.get("name"):
        _fail("AX math", "transcript math semantic unit")
    if manifest.get("originalityMarker") != "human-side-by-side-complete":
        _fail("originality audit", "final human marker absent")
    bindings = _object(manifest.get("auditFiles"), "auditFiles")
    for name in ("beginner.md", "technical.md", "originality.md"):
        path = evidence / "audits" / name
        if not path.is_file() or bindings.get(name) != _sha256(path) or "status: complete" not in path.read_text():
            _fail("originality audit", f"unfinished or stale audit {name}")


def validate_release(evidence: Path, expected_source_commit: str | None = None, expected_release_commit: str | None = None) -> None:
    """Validate exact release artifacts, identities, inventories, hashes, AX, and audits."""
    manifest = _load_json(evidence / "manifest.json")
    source, _release, build = _validate_schema_and_provenance(manifest, expected_source_commit, expected_release_commit)
    _validate_build(evidence, source, build)
    generated = _temporal(manifest.get("generatedAtUtc"), "manifest")
    primary, smoke = _records(manifest, "primaryCaptures"), _records(manifest, "smokeCaptures")
    if manifest.get("primaryCaptureCount") != 42 or len(primary) != 42:
        _fail("primary capture count", f"declared={manifest.get('primaryCaptureCount')} actual={len(primary)}")
    if manifest.get("smokeCaptureCount") != 2 or len(smoke) != 2:
        _fail("smoke capture count", f"declared={manifest.get('smokeCaptureCount')} actual={len(smoke)}")
    expected_chapters = [(chapter_id, order) for order, chapter_id in enumerate(CHAPTER_IDS, 1)]
    chapters = _records(manifest, "chapters")
    if [(item.get("id"), item.get("order")) for item in chapters] != expected_chapters:
        _fail("manifest schema", "Chapter IDs/orders differ from the exact spine")
    _validate_inventory(evidence, primary + smoke)
    _validate_identities(primary, smoke)
    for artifact in primary:
        _validate_artifact(evidence, artifact, source, build, generated, True)
    for artifact in smoke:
        _validate_artifact(evidence, artifact, source, build, generated, False)
    _validate_transcript_and_audits(evidence, manifest, source, build)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("command", choices=("capture", "validate"))
    parser.add_argument("--evidence", type=Path, required=True)
    parser.add_argument("--root", type=Path)
    parser.add_argument("--subpath-root", type=Path)
    parser.add_argument("--source-commit")
    parser.add_argument("--release-commit")
    args = parser.parse_args()
    if args.command == "validate":
        validate_release(args.evidence, args.source_commit, args.release_commit)
        return 0
    if None in (args.root, args.subpath_root, args.source_commit, args.release_commit):
        parser.error("capture requires --root, --subpath-root, --source-commit, and --release-commit")
    capture_curriculum_release(args.root, args.subpath_root, args.evidence, args.source_commit, args.release_commit)
    validate_release(args.evidence, args.source_commit, args.release_commit)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
