# /// script
# requires-python = ">=3.11"
# dependencies = []
# ///
# --- How to run ---
# python3 scripts/worker_source_fingerprint.py ROOT

from __future__ import annotations

import hashlib
import json
import os
import re
import stat
import subprocess
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Final, TypeAlias

JsonValue: TypeAlias = str | int | float | bool | None | list["JsonValue"] | dict[str, "JsonValue"]
WORKER_PACKAGE: Final = "transformer-viz-worker"
INCLUDE_PATTERN: Final = re.compile(rb'include_(?:bytes|str)!\("([^"]+)"\)')
FIXED_INPUTS: Final = (
    "Cargo.toml",
    "Cargo.lock",
    "rust-toolchain.toml",
    ".cargo/config.toml",
    "apps/web/package.json",
    "apps/web/tsconfig.json",
    "apps/web/vite.config.ts",
    "apps/web/src/worker/worker-entry.ts",
    "scripts/build-web.sh",
    "scripts/build-worker-wasm.sh",
    "scripts/check.sh",
    "scripts/ensure-worker-wasm.sh",
    "scripts/worker_artifact_install.py",
    "scripts/worker_artifact_provenance.py",
    "scripts/worker_source_fingerprint.py",
    "scripts/worker_verified_snapshot.py",
)


@dataclass(frozen=True, slots=True)
class SourceContractError(RuntimeError):
    reason: str

    def __str__(self) -> str:
        return self.reason


@dataclass(frozen=True, slots=True)
class PackageNode:
    package_id: str
    manifest: Path


def _mapping(value: JsonValue) -> dict[str, JsonValue]:
    match value:  # noqa: MATCH_OK - external JSON parser rejects every non-object variant.
        case dict() as mapping:
            return mapping
        case _:
            raise SourceContractError("cargo metadata contains a non-object record")


def _sequence(value: JsonValue) -> list[JsonValue]:
    match value:  # noqa: MATCH_OK - external JSON parser rejects every non-array variant.
        case list() as sequence:
            return sequence
        case _:
            raise SourceContractError("cargo metadata contains a non-array record")


def _text(mapping: dict[str, JsonValue], key: str) -> str:
    match mapping.get(key):  # noqa: MATCH_OK - external JSON parser requires a string field.
        case str(value):
            return value
        case _:
            raise SourceContractError(f"cargo metadata field {key} is not a string")


def _relative(root: Path, path: Path) -> Path:
    absolute = Path(os.path.abspath(path))
    try:
        relative = absolute.relative_to(root)
    except ValueError as error:
        raise SourceContractError(f"source input escapes repository root: {path}") from error
    if not relative.parts or ".." in relative.parts:
        raise SourceContractError(f"invalid source input path: {path}")
    return relative


def read_regular(root: Path, relative: Path) -> bytes:
    flags = os.O_RDONLY | os.O_NOFOLLOW | os.O_NONBLOCK
    root_fd = os.open(root, flags | os.O_DIRECTORY)
    current_fd = root_fd
    try:
        for component in relative.parts[:-1]:
            next_fd = os.open(component, flags | os.O_DIRECTORY, dir_fd=current_fd)
            if current_fd != root_fd:
                os.close(current_fd)
            current_fd = next_fd
        file_fd = os.open(relative.name, flags, dir_fd=current_fd)
        try:
            before = os.fstat(file_fd)
            if not stat.S_ISREG(before.st_mode) or before.st_nlink != 1:
                raise SourceContractError(f"input is not an exclusive regular file: {relative}")
            chunks: list[bytes] = []
            while chunk := os.read(file_fd, 1024 * 1024):
                chunks.append(chunk)
            after = os.fstat(file_fd)
            path_after = os.stat(relative.name, dir_fd=current_fd, follow_symlinks=False)
            identity = (before.st_dev, before.st_ino, before.st_size, before.st_mtime_ns, before.st_ctime_ns)
            if identity != (after.st_dev, after.st_ino, after.st_size, after.st_mtime_ns, after.st_ctime_ns):
                raise SourceContractError(f"input changed while reading: {relative}")
            if (after.st_dev, after.st_ino) != (path_after.st_dev, path_after.st_ino):
                raise SourceContractError(f"input path changed while reading: {relative}")
            return b"".join(chunks)
        finally:
            os.close(file_fd)
    except OSError as error:
        raise SourceContractError(f"cannot securely read source input {relative}: {error}") from error
    finally:
        if current_fd != root_fd:
            os.close(current_fd)
        os.close(root_fd)


def _metadata(root: Path) -> dict[str, JsonValue]:
    completed = subprocess.run(
        ["cargo", "metadata", "--locked", "--format-version", "1", "--filter-platform", "wasm32-unknown-unknown"],
        cwd=root,
        check=True,
        capture_output=True,
        text=True,
    )
    raw: JsonValue = json.loads(completed.stdout)
    return _mapping(raw)


def _reachable_packages(root: Path, metadata: dict[str, JsonValue]) -> tuple[tuple[PackageNode, ...], bytes]:
    packages: dict[str, tuple[str, JsonValue, Path]] = {}
    workers: list[str] = []
    for raw_package in _sequence(metadata.get("packages")):
        package = _mapping(raw_package)
        package_id = _text(package, "id")
        name = _text(package, "name")
        manifest = Path(_text(package, "manifest_path"))
        packages[package_id] = (name, package.get("source"), manifest)
        if name == WORKER_PACKAGE:
            workers.append(package_id)
    if len(workers) != 1:
        raise SourceContractError("cargo metadata must contain exactly one transformer-viz-worker package")
    resolve = _mapping(metadata.get("resolve"))
    edges: dict[str, list[str]] = {}
    for raw_node in _sequence(resolve.get("nodes")):
        node = _mapping(raw_node)
        dependencies: list[str] = []
        for raw_dependency in _sequence(node.get("deps")):
            dependency = _mapping(raw_dependency)
            kinds = _sequence(dependency.get("dep_kinds"))
            if any(_mapping(kind).get("kind") in (None, "build") for kind in kinds):
                dependencies.append(_text(dependency, "pkg"))
        edges[_text(node, "id")] = dependencies
    reachable = set(workers)
    pending = list(workers)
    while pending:
        package_id = pending.pop()
        for dependency in edges.get(package_id, []):
            if dependency not in reachable:
                reachable.add(dependency)
                pending.append(dependency)
    local_paths = {
        package_id: _relative(root, packages[package_id][2])
        for package_id in reachable
        if packages[package_id][1] is None
    }
    local = tuple(PackageNode(package_id, local_paths[package_id]) for package_id in sorted(local_paths))
    normalized = [
        (
            packages[package_id][0],
            local_paths[package_id].as_posix(),
            tuple(sorted(local_paths[item].as_posix() for item in edges.get(package_id, []) if item in local_paths)),
        )
        for package_id in sorted(local_paths)
    ]
    graph = json.dumps(normalized, separators=(",", ":"), ensure_ascii=True).encode()
    return local, graph


def _package_inputs(root: Path, package: PackageNode) -> set[Path]:
    package_dir = package.manifest.parent
    inputs = {package.manifest}
    for directory, names, files in os.walk(root / package_dir, followlinks=False):
        relative_directory = _relative(root, Path(directory))
        for name in names:
            mode = (Path(directory) / name).lstat().st_mode
            if not stat.S_ISDIR(mode):
                raise SourceContractError(f"package directory is not regular: {relative_directory / name}")
        for name in files:
            relative = relative_directory / name
            mode = (root / relative).lstat().st_mode
            if not stat.S_ISREG(mode):
                raise SourceContractError(f"package input is not regular: {relative}")
            inputs.add(relative)
    return inputs


def source_fingerprint(root_value: Path) -> str:
    root = root_value.resolve(strict=True)
    inputs = {Path(path) for path in FIXED_INPUTS}
    fixed_contents = {relative: read_regular(root, relative) for relative in inputs}
    packages, graph = _reachable_packages(root, _metadata(root))
    for package in packages:
        inputs.update(_package_inputs(root, package))
    for relative in tuple(inputs):
        if relative.suffix == ".rs":
            for included in INCLUDE_PATTERN.findall(read_regular(root, relative)):
                inputs.add(_relative(root, root / relative.parent / os.fsdecode(included)))
    digest = hashlib.sha256(graph)
    for relative in sorted(inputs, key=Path.as_posix):
        content = fixed_contents.get(relative)
        if content is None:
            content = read_regular(root, relative)
        name = relative.as_posix().encode()
        digest.update(len(name).to_bytes(8, "big"))
        digest.update(name)
        digest.update(len(content).to_bytes(8, "big"))
        digest.update(content)
    return digest.hexdigest()


def main(arguments: list[str]) -> int:
    if len(arguments) != 1:
        print("usage: worker_source_fingerprint.py ROOT", file=sys.stderr)
        return 2
    print(source_fingerprint(Path(arguments[0])))
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
