"""Production Chrome contract for the SVG/R3F hybrid learning foundation."""

from __future__ import annotations

import argparse
import json
import threading
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

from browser_hybrid_capture import capture
from browser_hybrid_contract import diagram_probe, go_chapter, require, set_viewport
from browser_hybrid_failures import verify_failure_modes
from browser_hybrid_learning import capture_learning_phase
from browser_hybrid_visualization import capture_visualization_phase
from browser_learning_workspace_probes import (
    INSTRUMENT_LEARNING_WORKSPACE,
    browser_errors,
)
from browser_probes import READY_PROBE
from browser_session import ChromeSession


class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self, format: str, *args: object) -> None:
        del format, args
        return


def run_contract(
    url: str,
    screenshots: Path,
    evidence_path: Path,
) -> None:
    shots: dict[str, str] = {}
    evidence: dict[str, object] = {}

    with ChromeSession(enable_gpu=True) as browser:
        set_viewport(browser, 1440, 900)
        cdp = browser.require_cdp()
        cdp.send(
            "Page.addScriptToEvaluateOnNewDocument",
            {"source": INSTRUMENT_LEARNING_WORKSPACE},
            browser.page_session,
        )
        browser.navigate(url)
        cdp.evaluate(browser.page_session, READY_PROBE, True)
        capture_learning_phase(
            browser,
            screenshots,
            evidence,
            shots,
        )
        capture_visualization_phase(
            browser,
            screenshots,
            evidence,
            shots,
        )

        set_viewport(browser, 390, 844)
        go_chapter(browser, "0-2")
        mobile = diagram_probe(browser)
        require(mobile["overflowX"] is False, f"Mobile overflow: {mobile}")
        shots["mobile"] = capture(
            browser,
            screenshots / "hybrid-mobile-learn.png",
        )
        errors = browser_errors(browser)
        require(not errors["network"], f"Network errors: {errors['network']}")
        require(not errors["runtime"], f"Runtime errors: {errors['runtime']}")
        evidence["mobile"] = mobile
        evidence["errors"] = errors
        evidence["screenshots"] = shots

    evidence["failureModes"] = verify_failure_modes(url)
    evidence_path.parent.mkdir(parents=True, exist_ok=True)
    evidence_path.write_text(
        json.dumps(evidence, ensure_ascii=False, indent=2) + "\n",
    )
    print(f"Hybrid browser foundation: PASS ({len(shots)} screenshots)")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--url", default="http://127.0.0.1:4173/")
    parser.add_argument("--root", type=Path)
    parser.add_argument("--base", default="/")
    parser.add_argument(
        "--screenshots",
        type=Path,
        default=Path("docs/screenshots"),
    )
    parser.add_argument(
        "--evidence",
        type=Path,
        default=Path(".omo/evidence/threeui-foundation/browser-hybrid.json"),
    )
    args = parser.parse_args()
    if args.root is None:
        run_contract(args.url, args.screenshots, args.evidence)
        return 0

    server = ThreadingHTTPServer(
        ("127.0.0.1", 0),
        partial(QuietHandler, directory=str(args.root.resolve())),
    )
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    try:
        url = f"http://127.0.0.1:{server.server_port}{args.base}"
        run_contract(url, args.screenshots, args.evidence)
    finally:
        server.shutdown()
        server.server_close()
        thread.join(timeout=10)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
