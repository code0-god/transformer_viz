#!/usr/bin/env python3
# /// script
# requires-python = ">=3.12"
# dependencies = []
# ///
# ─── How to run ───
# PYTHONPATH=scripts uv run scripts/browser_learning_workspace.py \
#   --root <dist> --entry index.html --scenario all --evidence <directory>
"""Drive the current content-first Learning Workspace browser contract."""

from __future__ import annotations

import argparse
import threading
from functools import partial
from http.server import ThreadingHTTPServer
from pathlib import Path

from browser_hybrid_foundation import QuietHandler, run_contract


def verify_entry(
    root: Path,
    entry: str,
    evidence: Path,
    scenario: str = "all",
) -> None:
    """Run shared Learn, Lab, overlay, SVG, and R3F production checks."""
    server = ThreadingHTTPServer(
        ("127.0.0.1", 0),
        partial(QuietHandler, directory=str(root.resolve())),
    )
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    try:
        base = "/" if entry == "index.html" else "/transformer_viz/"
        run_contract(
            f"http://127.0.0.1:{server.server_port}{base}",
            evidence / "screenshots",
            evidence / "evidence.json",
            scenario,
        )
    finally:
        server.shutdown()
        server.server_close()
        thread.join(timeout=10)
        evidence.mkdir(parents=True, exist_ok=True)
        (evidence / "cleanup.txt").write_text(
            "Chrome contexts closed; static server stopped; "
            "ephemeral ports released.\n",
        )


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--root", type=Path, required=True)
    parser.add_argument("--entry", default="index.html")
    parser.add_argument("--scenario", choices=("all", "visual"), default="all")
    parser.add_argument("--viewports", default="1440x900,1024x768,390x844")
    parser.add_argument("--evidence", type=Path, required=True)
    args = parser.parse_args()
    verify_entry(args.root, args.entry, args.evidence, args.scenario)
    print(f"{args.entry} Learning Workspace: PASS")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
