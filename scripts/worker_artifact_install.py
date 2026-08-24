# /// script
# requires-python = ">=3.11"
# dependencies = []
# ///
# --- How to run ---
# python3 scripts/worker_artifact_install.py ROOT CANDIDATE OUTPUT FINGERPRINT

from __future__ import annotations

import hashlib
import json
import os
import secrets
import sys
from collections.abc import Callable
from dataclasses import dataclass
from pathlib import Path

from worker_artifact_provenance import (
    ARTIFACT_NAMES,
    MANIFEST_NAME,
    SCHEMA_VERSION,
    WASM_MAGIC,
    ArtifactContractError,
    ArtifactSnapshot,
    ComponentReceipt,
    _open_directory,
    _read_components,
    validate_artifacts,
)
from worker_source_fingerprint import source_fingerprint


@dataclass(frozen=True, slots=True)
class InstallPlan:
    root: Path
    candidate: Path
    output: Path
    expected_fingerprint: str
    before_manifest: Callable[[], None] | None = None


def _manifest_bytes(fingerprint: str, artifacts: tuple[ComponentReceipt, ...]) -> bytes:
    payload = {
        "artifacts": {
            component.name: {"sha256": hashlib.sha256(component.content).hexdigest(), "size": len(component.content)}
            for component in artifacts
        },
        "schema_version": SCHEMA_VERSION,
        "source_fingerprint": fingerprint,
    }
    return (json.dumps(payload, indent=2, sort_keys=True) + "\n").encode()


def exclusive_write(directory_fd: int, name: str, content: bytes) -> None:
    file_fd = os.open(name, os.O_WRONLY | os.O_CREAT | os.O_EXCL | os.O_NOFOLLOW, 0o600, dir_fd=directory_fd)
    try:
        view = memoryview(content)
        while view:
            written = os.write(file_fd, view)
            view = view[written:]
        os.fchmod(file_fd, 0o444)
    finally:
        os.close(file_fd)


def write_manifest(root_value: Path, output: Path, expected_fingerprint: str | None = None) -> None:
    root = root_value.resolve(strict=True)
    current = source_fingerprint(root)
    if expected_fingerprint is not None and current != expected_fingerprint:
        raise ArtifactContractError("Worker source changed during build")
    artifacts = _read_components(root, output, ARTIFACT_NAMES, None)
    contents = {component.name: component.content for component in artifacts}
    if not contents["worker.js"] or not contents["worker.d.ts"] or not contents["worker_bg.wasm"].startswith(WASM_MAGIC):
        raise ArtifactContractError("generated Worker candidate has invalid semantics")
    directory_fd = _open_directory(root, output)
    try:
        exclusive_write(directory_fd, MANIFEST_NAME, _manifest_bytes(current, artifacts))
    finally:
        os.close(directory_fd)


def install_candidate(plan: InstallPlan) -> ArtifactSnapshot:
    root = plan.root.resolve(strict=True)
    if source_fingerprint(root) != plan.expected_fingerprint:
        raise ArtifactContractError("Worker source changed during build")
    write_manifest(root, plan.candidate, plan.expected_fingerprint)
    candidate = validate_artifacts(root, plan.candidate)
    if candidate is None or candidate.source_fingerprint != plan.expected_fingerprint:
        raise ArtifactContractError("generated Worker candidate failed validation")
    output_fd = _open_directory(root, plan.output)
    hidden: dict[str, str] = {}
    try:
        for name, content in candidate.payload():
            hidden_name = f".{name}.{secrets.token_hex(16)}"
            exclusive_write(output_fd, hidden_name, content)
            hidden[name] = hidden_name
        for name in ARTIFACT_NAMES:
            os.replace(hidden[name], name, src_dir_fd=output_fd, dst_dir_fd=output_fd)
            hidden.pop(name)
        if plan.before_manifest is not None:
            plan.before_manifest()
        os.replace(hidden[MANIFEST_NAME], MANIFEST_NAME, src_dir_fd=output_fd, dst_dir_fd=output_fd)
        hidden.pop(MANIFEST_NAME)
    finally:
        for hidden_name in hidden.values():
            try:
                os.unlink(hidden_name, dir_fd=output_fd)
            except FileNotFoundError:
                continue
        os.close(output_fd)
    installed = validate_artifacts(root, plan.output)
    if installed is None or installed.source_fingerprint != plan.expected_fingerprint or installed.payload() != candidate.payload():
        raise ArtifactContractError("installed Worker set failed post-build validation")
    return installed


def main(arguments: list[str]) -> int:
    if len(arguments) != 4:
        print("usage: worker_artifact_install.py ROOT CANDIDATE OUTPUT FINGERPRINT", file=sys.stderr)
        return 2
    install_candidate(InstallPlan(Path(arguments[0]), Path(arguments[1]), Path(arguments[2]), arguments[3]))
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
