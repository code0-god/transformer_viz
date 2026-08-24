# /// script
# requires-python = ">=3.11"
# dependencies = []
# ///
# --- How to run ---
# python3 scripts/worker_artifact_provenance.py validate ROOT OUTPUT_DIR

from __future__ import annotations

import hashlib
import json
import os
import stat
import subprocess
import sys
from collections.abc import Callable
from dataclasses import dataclass
from pathlib import Path
from typing import Final, TypeAlias

from worker_source_fingerprint import SourceContractError, source_fingerprint

SCHEMA_VERSION: Final = 1
MANIFEST_NAME: Final = "worker.provenance.json"
ARTIFACT_NAMES: Final = ("worker.js", "worker.d.ts", "worker_bg.wasm")
COMPONENT_NAMES: Final = (*ARTIFACT_NAMES, MANIFEST_NAME)
WASM_MAGIC: Final = b"\x00asm"
JsonValue: TypeAlias = str | int | float | bool | None | list["JsonValue"] | dict[str, "JsonValue"]
ValidationHook: TypeAlias = Callable[[], None]


@dataclass(frozen=True, slots=True)
class ArtifactContractError(RuntimeError):
    reason: str

    def __str__(self) -> str:
        return self.reason


@dataclass(frozen=True, slots=True)
class ArtifactRecord:
    sha256: str
    size: int


@dataclass(frozen=True, slots=True)
class ComponentReceipt:
    name: str
    content: bytes
    device: int
    inode: int
    size: int
    modified_ns: int
    changed_ns: int


@dataclass(frozen=True, slots=True)
class ArtifactSnapshot:
    source_fingerprint: str
    components: tuple[ComponentReceipt, ...]

    def content(self, name: str) -> bytes:
        for component in self.components:
            if component.name == name:
                return component.content
        raise ArtifactContractError(f"validated snapshot omits {name}")

    def payload(self) -> tuple[tuple[str, bytes], ...]:
        return tuple((component.name, component.content) for component in self.components)


def _relative_directory(root: Path, directory: Path) -> Path:
    try:
        relative = Path(os.path.abspath(directory)).relative_to(root)
    except ValueError as error:
        raise ArtifactContractError(f"artifact directory escapes repository root: {directory}") from error
    if not relative.parts or ".." in relative.parts:
        raise ArtifactContractError(f"invalid artifact directory: {directory}")
    return relative


def _open_directory(root: Path, directory: Path) -> int:
    relative = _relative_directory(root, directory)
    flags = os.O_RDONLY | os.O_NOFOLLOW | os.O_DIRECTORY
    root_fd = os.open(root, flags)
    current_fd = root_fd
    try:
        for component in relative.parts:
            next_fd = os.open(component, flags, dir_fd=current_fd)
            if current_fd != root_fd:
                os.close(current_fd)
            current_fd = next_fd
        if current_fd == root_fd:
            raise ArtifactContractError("artifact directory cannot be repository root")
        return current_fd
    except OSError as error:
        if current_fd != root_fd:
            os.close(current_fd)
        raise ArtifactContractError(f"cannot securely open artifact directory: {error}") from error
    finally:
        os.close(root_fd)


def _identity(status: os.stat_result) -> tuple[int, int, int, int, int]:
    return (status.st_dev, status.st_ino, status.st_size, status.st_mtime_ns, status.st_ctime_ns)


def _read_components(root: Path, directory: Path, names: tuple[str, ...], event_hook: ValidationHook | None) -> tuple[ComponentReceipt, ...]:
    directory_fd = _open_directory(root, directory)
    opened: list[tuple[str, int, os.stat_result, bytes]] = []
    try:
        for name in names:
            file_fd = os.open(name, os.O_RDONLY | os.O_NOFOLLOW | os.O_NONBLOCK, dir_fd=directory_fd)
            status = os.fstat(file_fd)
            if not stat.S_ISREG(status.st_mode) or status.st_nlink != 1:
                os.close(file_fd)
                raise ArtifactContractError(f"artifact component is not an exclusive regular file: {name}")
            chunks: list[bytes] = []
            while chunk := os.read(file_fd, 1024 * 1024):
                chunks.append(chunk)
            opened.append((name, file_fd, status, b"".join(chunks)))
        if event_hook is not None:
            event_hook()
        receipts: list[ComponentReceipt] = []
        for name, file_fd, before, content in opened:
            after = os.fstat(file_fd)
            path_after = os.stat(name, dir_fd=directory_fd, follow_symlinks=False)
            if _identity(before) != _identity(after) or (after.st_dev, after.st_ino) != (path_after.st_dev, path_after.st_ino):
                raise ArtifactContractError(f"artifact component changed while validating: {name}")
            receipts.append(ComponentReceipt(name, content, *_identity(after)))
        return tuple(receipts)
    except OSError as error:
        raise ArtifactContractError(f"cannot securely read artifact component: {error}") from error
    finally:
        for _, file_fd, _, _ in opened:
            os.close(file_fd)
        os.close(directory_fd)


def _mapping(value: JsonValue) -> dict[str, JsonValue] | None:
    match value:  # noqa: MATCH_OK - manifest boundary rejects non-object JSON variants.
        case dict() as mapping:
            return mapping
        case _:
            return None


def _parse_record(value: JsonValue) -> ArtifactRecord | None:
    record = _mapping(value)
    if record is None or set(record) != {"sha256", "size"}:
        return None
    digest = record["sha256"]
    size = record["size"]
    if type(digest) is not str or type(size) is not int:
        return None
    valid_digest = len(digest) == 64 and all(character in "0123456789abcdef" for character in digest)
    return ArtifactRecord(digest, size) if valid_digest and size >= 0 else None


def _parse_manifest(content: bytes) -> tuple[str, dict[str, ArtifactRecord]] | None:
    try:
        raw: JsonValue = json.loads(content)
    except (UnicodeError, json.JSONDecodeError):
        return None
    manifest = _mapping(raw)
    if manifest is None or set(manifest) != {"schema_version", "source_fingerprint", "artifacts"}:
        return None
    if type(manifest["schema_version"]) is not int or manifest["schema_version"] != SCHEMA_VERSION:
        return None
    fingerprint = manifest["source_fingerprint"]
    artifacts = _mapping(manifest["artifacts"])
    if type(fingerprint) is not str or artifacts is None or set(artifacts) != set(ARTIFACT_NAMES):
        return None
    records: dict[str, ArtifactRecord] = {}
    for name in ARTIFACT_NAMES:
        record = _parse_record(artifacts[name])
        if record is None:
            return None
        records[name] = record
    return fingerprint, records


def validate_artifacts(root_value: Path, output: Path, event_hook: ValidationHook | None = None) -> ArtifactSnapshot | None:
    try:
        root = root_value.resolve(strict=True)
        fingerprint_before = source_fingerprint(root)
        components = _read_components(root, output, COMPONENT_NAMES, event_hook)
        contents = {component.name: component.content for component in components}
        parsed = _parse_manifest(contents[MANIFEST_NAME])
        if parsed is None:
            return None
        manifest_fingerprint, records = parsed
        if manifest_fingerprint != fingerprint_before:
            return None
        for name in ARTIFACT_NAMES:
            content = contents[name]
            record = records[name]
            if len(content) != record.size or hashlib.sha256(content).hexdigest() != record.sha256:
                return None
        if not contents["worker.js"] or not contents["worker.d.ts"] or not contents["worker_bg.wasm"].startswith(WASM_MAGIC):
            return None
        fingerprint_after = source_fingerprint(root)
        if fingerprint_after != fingerprint_before:
            return None
        return ArtifactSnapshot(fingerprint_before, components)
    except (ArtifactContractError, SourceContractError, OSError, KeyError, subprocess.SubprocessError):
        return None


def main(arguments: list[str]) -> int:
    if len(arguments) == 3 and arguments[0] == "validate":
        return 0 if validate_artifacts(Path(arguments[1]), Path(arguments[2])) is not None else 1
    print("usage: worker_artifact_provenance.py validate ROOT OUTPUT", file=sys.stderr)
    return 2


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
