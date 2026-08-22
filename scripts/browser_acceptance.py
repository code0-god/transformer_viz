#!/usr/bin/env python3
# /// script
# requires-python = ">=3.12"
# dependencies = []
# ///
# ─── How to run ───
# uv run scripts/browser_acceptance.py --output /tmp/transformer-viz-c001-c002 [--head SHA]
"""Build, qualify, and atomically publish exact C001/C002 evidence."""

from __future__ import annotations

import argparse
import json
from pathlib import Path

from browser_acceptance_artifacts import (
    EvidenceDestinationExists,
    publication_staging,
    publish_artifacts,
)
from browser_acceptance_run import run


def arguments() -> argparse.Namespace:
    """Parse output and optional frozen HEAD binding."""
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--head")
    return parser.parse_args()


def emit(status: str, output: Path, failures: list[str]) -> None:
    """Print the machine-readable publication result."""
    print(
        json.dumps(
            {"status": status, "output": str(output), "failures": failures},
            ensure_ascii=False,
        )
    )


def main() -> int:
    """Refuse stale destinations and publish only a successful staged run."""
    args = arguments()
    root = Path(__file__).resolve().parent.parent
    output = args.output.resolve()
    try:
        with publication_staging(output) as staging:
            result = run(root, staging, args.head)
            if result.failures:
                emit(result.status, output, result.failures)
                return 1
            publish_artifacts(staging, output)
    except EvidenceDestinationExists as error:
        emit("FAIL", output, [str(error)])
        return 2
    emit(result.status, output, result.failures)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
