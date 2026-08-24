# /// script
# requires-python = ">=3.11"
# dependencies = []
# ///
# --- How to run ---
# python3 scripts/worker_artifact_provenance.py validate ROOT OUTPUT_DIR

from __future__ import annotations

import hashlib
import json
import re
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Final, TypeAlias

SCHEMA_VERSION: Final = 1
MANIFEST_NAME: Final = "worker.provenance.json"
ARTIFACT_NAMES: Final = ("worker.js", "worker.d.ts", "worker_bg.wasm")
LOCAL_PACKAGE_DIRS: Final = (
    "apps/worker",
    "crates/nanogpt-model",
    "crates/nanogpt-schema",
    "crates/nanogpt-tokenizer",
)
FIXED_INPUTS: Final = (
    "Cargo.toml",
    "Cargo.lock",
    "rust-toolchain.toml",
    ".cargo/config.toml",
    "scripts/build-worker-wasm.sh",
    "scripts/worker_artifact_provenance.py",
)
INCLUDE_PATTERN: Final = re.compile(r'include_(?:bytes|str)!\("([^"]+)"\)')
WASM_MAGIC: Final = b"\x00asm"
JsonValue: TypeAlias = str | int | float | bool | None | list["JsonValue"] | dict[str, "JsonValue"]


@dataclass(frozen=True, slots=True)
class ArtifactBuildError(RuntimeError):
    reason: str

    def __str__(self) -> str:
        return self.reason


@dataclass(frozen=True, slots=True)
class ArtifactRecord:
    sha256: str
    size: int


@dataclass(frozen=True, slots=True)
class Provenance:
    source_fingerprint: str
    artifacts: dict[str, ArtifactRecord]


def _sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as source:
        while chunk := source.read(1024 * 1024):
            digest.update(chunk)
    return digest.hexdigest()


def _source_inputs(root: Path) -> tuple[Path, ...]:
    inputs = {root / relative for relative in FIXED_INPUTS}
    rust_sources: list[Path] = []
    for relative in LOCAL_PACKAGE_DIRS:
        package = root / relative
        inputs.add(package / "Cargo.toml")
        build_script = package / "build.rs"
        if build_script.is_file():
            inputs.add(build_script)
        rust_sources.extend((package / "src").rglob("*.rs"))
    inputs.update(rust_sources)
    for source in rust_sources:
        for included in INCLUDE_PATTERN.findall(source.read_text(encoding="utf-8")):
            inputs.add((source.parent / included).resolve())
    return tuple(sorted(inputs, key=lambda path: path.relative_to(root).as_posix()))


def source_fingerprint(root: Path) -> str:
    digest = hashlib.sha256()
    for path in _source_inputs(root.resolve()):
        relative = path.relative_to(root.resolve()).as_posix().encode()
        content = path.read_bytes()
        digest.update(len(relative).to_bytes(8, "big"))
        digest.update(relative)
        digest.update(len(content).to_bytes(8, "big"))
        digest.update(content)
    return digest.hexdigest()


def _parse_record(raw: JsonValue) -> ArtifactRecord | None:
    match raw:  # noqa: MATCH_OK - boundary parser rejects non-record JSON variants.
        case {"sha256": str(sha256), "size": int(size), **extra} if not extra:
            valid_digest = len(sha256) == 64 and all(character in "0123456789abcdef" for character in sha256)
            return ArtifactRecord(sha256, size) if valid_digest and size >= 0 else None
        case _:
            return None


def _parse_manifest(path: Path) -> Provenance | None:
    try:
        raw: JsonValue = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, UnicodeError, json.JSONDecodeError):
        return None
    match raw:  # noqa: MATCH_OK - boundary parser rejects malformed provenance variants.
        case {
            "schema_version": int(schema_version),
            "source_fingerprint": str(fingerprint),
            "artifacts": {
                "worker.js": worker_js,
                "worker.d.ts": worker_dts,
                "worker_bg.wasm": worker_wasm,
                **artifact_extra,
            },
            **manifest_extra,
        } if not artifact_extra and not manifest_extra:
            if schema_version != SCHEMA_VERSION:
                return None
            records = zip(ARTIFACT_NAMES, (worker_js, worker_dts, worker_wasm), strict=True)
            parsed: dict[str, ArtifactRecord] = {}
            for name, raw_record in records:
                record = _parse_record(raw_record)
                if record is None:
                    return None
                parsed[name] = record
            return Provenance(fingerprint, parsed)
        case _:
            return None


def validate_artifacts(root: Path, output: Path) -> bool:
    provenance = _parse_manifest(output / MANIFEST_NAME)
    if provenance is None:
        return False
    try:
        if provenance.source_fingerprint != source_fingerprint(root):
            return False
        for name in ARTIFACT_NAMES:
            path = output / name
            record = provenance.artifacts[name]
            if not path.is_file() or path.stat().st_size != record.size or _sha256(path) != record.sha256:
                return False
        if provenance.artifacts["worker.js"].size == 0 or provenance.artifacts["worker.d.ts"].size == 0:
            return False
        with (output / "worker_bg.wasm").open("rb") as wasm:
            return wasm.read(len(WASM_MAGIC)) == WASM_MAGIC
    except (OSError, KeyError, ValueError):
        return False


def write_manifest(root: Path, output: Path) -> None:
    records = {
        name: ArtifactRecord(_sha256(output / name), (output / name).stat().st_size)
        for name in ARTIFACT_NAMES
    }
    if records["worker.js"].size == 0 or records["worker.d.ts"].size == 0:
        raise ArtifactBuildError("Worker JavaScript and declarations must be nonempty")
    with (output / "worker_bg.wasm").open("rb") as wasm:
        if wasm.read(len(WASM_MAGIC)) != WASM_MAGIC:
            raise ArtifactBuildError("Worker WASM has invalid magic")
    payload = {
        "artifacts": {
            name: {"sha256": record.sha256, "size": record.size}
            for name, record in sorted(records.items())
        },
        "schema_version": SCHEMA_VERSION,
        "source_fingerprint": source_fingerprint(root),
    }
    (output / MANIFEST_NAME).write_text(
        json.dumps(payload, indent=2, sort_keys=True) + "\n",
        encoding="utf-8",
    )


def main(arguments: list[str]) -> int:
    if len(arguments) != 3:
        print("usage: worker_artifact_provenance.py (validate|write) ROOT OUTPUT_DIR", file=sys.stderr)
        return 2
    operation, root_value, output_value = arguments
    root = Path(root_value)
    output = Path(output_value)
    if operation == "validate":
        return 0 if validate_artifacts(root, output) else 1
    if operation == "write":
        write_manifest(root, output)
        return 0
    print(f"unknown operation: {operation}", file=sys.stderr)
    return 2


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
