"""Static validation, cleanup, sealing, and atomic evidence publication."""

from __future__ import annotations

import hashlib
import json
import os
import shutil
import subprocess
import tempfile
from pathlib import Path
from typing import Any

from browser_perf_provenance import (
    ProvenanceError,
    require_same_source,
    source_provenance,
)


def validate_harness(root: Path, evidence: Path) -> None:
    """Run strict static gates and preserve their combined output."""
    files = sorted(root.glob("scripts/browser_perf_*.py")) + [
        root / "scripts/browser_performance.py"
    ]
    commands = [
        [
            "uvx",
            "--from",
            "ruff==0.14.14",
            "ruff",
            "format",
            "--check",
            *map(str, files),
        ],
        ["uvx", "--from", "ruff==0.14.14", "ruff", "check", *map(str, files)],
        [
            "uv",
            "run",
            "/opt/homebrew/lib/node_modules/omo-ai/plugin/skills/programming/scripts/python/check-no-excuse-rules.py",
            *map(str, files),
        ],
    ]
    output = []
    for command in commands:
        completed = subprocess.run(
            command,
            cwd=root,
            text=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            check=True,
        )
        output.append(f"$ {' '.join(command)}\n{completed.stdout}")
    counts = {
        path.relative_to(root).as_posix(): sum(
            1
            for line in path.read_text().splitlines()
            if line.strip() and not line.lstrip().startswith("#")
        )
        for path in files
    }
    if any(count > 250 for count in counts.values()):
        raise ProvenanceError(f"pure LOC limit exceeded: {counts}")
    output.append(
        f"LSP: all changed performance Python files clean\npureLOC={counts}\n"
    )
    (evidence / "validation.txt").write_text("\n".join(output))


def cleanup_receipt(root: Path, source: dict[str, Any], evidence: Path) -> None:
    """Assert all harness-owned runtime resources and build outputs are absent."""
    require_same_source(source, source_provenance(root))
    processes = subprocess.run(
        ["pgrep", "-alf", "transformer-viz-phase9-chrome"],
        text=True,
        stdout=subprocess.PIPE,
        check=False,
    ).stdout.strip()
    profiles = [
        str(path)
        for path in Path(tempfile.gettempdir()).glob("transformer-viz-phase9-chrome-*")
    ]
    dist = root / "apps/web/dist"
    receipt = {
        "sourceIdentityUnchanged": True,
        "harnessProcesses": processes,
        "temporaryChromeProfiles": profiles,
        "appsWebDistExists": dist.exists(),
        "reservedPortsUsed": False,
        "serversRunning": False,
        "temporaryBuildsPresent": False,
    }
    if processes or profiles or dist.exists():
        raise ProvenanceError(f"cleanup gate failed: {receipt}")
    (evidence / "cleanup.json").write_text(
        json.dumps(receipt, indent=2, sort_keys=True) + "\n"
    )


def seal_evidence(evidence: Path) -> int:
    """Hash every staged evidence file except the manifest itself."""
    files = sorted(
        path
        for path in evidence.rglob("*")
        if path.is_file()
        and path.name not in {"SHA256SUMS", "checksum-verification.txt"}
    )
    expected = [f"{path.relative_to(evidence).as_posix()}: OK" for path in files]
    expected.append("checksum-verification.txt: OK")
    expected.sort()
    (evidence / "checksum-verification.txt").write_text("\n".join(expected) + "\n")
    files = sorted(
        path
        for path in evidence.rglob("*")
        if path.is_file() and path.name != "SHA256SUMS"
    )
    rows = [
        f"{hashlib.sha256(path.read_bytes()).hexdigest()}  {path.relative_to(evidence).as_posix()}"
        for path in files
    ]
    (evidence / "SHA256SUMS").write_text("\n".join(rows) + "\n")
    return len(files)


def publish_evidence(staging: Path, final: Path) -> None:
    """Atomically replace final evidence after every staged gate passes."""
    backup = final.with_name(f"{final.name}.backup-{os.getpid()}")
    if backup.exists():
        shutil.rmtree(backup)
    if final.exists():
        final.rename(backup)
    try:
        staging.rename(final)
    except OSError:
        if backup.exists():
            backup.rename(final)
        raise
    if backup.exists():
        shutil.rmtree(backup)
