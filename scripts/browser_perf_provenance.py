"""Dirty-tree and built-artifact provenance for performance evidence."""

from __future__ import annotations

import hashlib
import subprocess
from dataclasses import dataclass
from pathlib import Path
from typing import Any


@dataclass(frozen=True, slots=True)
class ProvenanceError(RuntimeError):
    message: str

    def __str__(self) -> str:
        return self.message


def _run(root: Path, *command: str) -> bytes:
    return subprocess.check_output(command, cwd=root)


def _digest(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def _manifest(root: Path, paths: list[Path]) -> dict[str, Any]:
    entries = []
    for path in sorted(paths):
        relative = path.relative_to(root).as_posix()
        content = (
            _run(path, "git", "rev-parse", "HEAD")
            if path.is_dir()
            else path.read_bytes()
        )
        entries.append(
            {"path": relative, "bytes": len(content), "sha256": _digest(content)}
        )
    canonical = "".join(
        f"{x['sha256']}  {x['bytes']}  {x['path']}\n" for x in entries
    ).encode()
    return {"sha256": _digest(canonical), "entries": entries}


def source_provenance(root: Path) -> dict[str, Any]:
    """Bind evidence to tracked changes, untracked source, and complete source content."""
    head = _run(root, "git", "rev-parse", "HEAD").decode().strip()
    tree = _run(root, "git", "rev-parse", "HEAD^{tree}").decode().strip()
    status = _run(root, "git", "status", "--porcelain=v1", "-z", "-uall")
    tracked_diff = _run(root, "git", "diff", "--binary", "HEAD", "--", ".")
    untracked_raw = _run(
        root, "git", "ls-files", "--others", "--exclude-standard", "-z"
    )
    source_raw = _run(root, "git", "ls-files", "-co", "--exclude-standard", "-z")
    untracked = [root / item.decode() for item in untracked_raw.split(b"\0") if item]
    source = [root / item.decode() for item in source_raw.split(b"\0") if item]
    return {
        "mode": "dirty-pre-freeze",
        "frozen": False,
        "head": head,
        "headTree": tree,
        "trackedDiffSha256": _digest(tracked_diff),
        "statusSha256": _digest(status),
        "statusBytes": len(status),
        "untracked": _manifest(root, untracked),
        "fullSource": _manifest(root, source),
    }


def artifact_provenance(builds: dict[str, Path]) -> dict[str, Any]:
    """Hash every root/subpath artifact and identify Vite app/Worker outputs."""
    result = {}
    for name, root in builds.items():
        manifest = _manifest(root, [path for path in root.rglob("*") if path.is_file()])
        manifest["appJavaScript"] = [
            entry
            for entry in manifest["entries"]
            if Path(entry["path"]).name.startswith("index-")
            and entry["path"].endswith(".js")
        ]
        manifest["workerWasm"] = [
            entry
            for entry in manifest["entries"]
            if Path(entry["path"]).name.startswith("worker_bg-")
            and entry["path"].endswith(".wasm")
        ]
        result[name] = manifest
    return result


def require_same_source(before: dict[str, Any], after: dict[str, Any]) -> None:
    """Reject receipts if any source identity component changed during execution."""
    keys = ("head", "headTree", "trackedDiffSha256", "statusSha256")
    stable = all(before[key] == after[key] for key in keys)
    stable = stable and before["untracked"]["sha256"] == after["untracked"]["sha256"]
    stable = stable and before["fullSource"]["sha256"] == after["fullSource"]["sha256"]
    if not stable:
        raise ProvenanceError("source state changed during performance evidence run")


def enforce_post_commit(
    provenance: dict[str, Any], expected_head: str | None, expected_tree: str | None
) -> None:
    """Require clean status and exact commit/tree only when post-commit mode is requested."""
    if expected_head is None and expected_tree is None:
        return
    if provenance["statusBytes"] != 0:
        raise ProvenanceError(
            "post-commit performance evidence requires clean git status"
        )
    if provenance["head"] != expected_head or provenance["headTree"] != expected_tree:
        raise ProvenanceError("post-commit HEAD/tree does not match requested freeze")
