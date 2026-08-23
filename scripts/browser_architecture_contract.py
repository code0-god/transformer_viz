#!/usr/bin/env python3
# /// script
# requires-python = ">=3.12"
# dependencies = []
# ///
# ─── How to run ───
# uv run scripts/browser_architecture_contract.py --root <release-directory>
"""Verify final Root Architecture and responsive browser contracts."""

from __future__ import annotations

import argparse
import threading
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Protocol

from browser_probes import READY_PROBE
from browser_session import ChromeSession


class ArchitectureContractError(RuntimeError):
    """Architecture-First browser surface violates its public contract."""


class LogValue(Protocol):
    """Value accepted by the standard HTTP request logger."""

    def __str__(self) -> str:
        """Render the value for percent-style request logging."""
        ...


class QuietHandler(SimpleHTTPRequestHandler):
    """Serve combined root and subpath release artifacts without log noise."""

    def log_message(self, format: str, *args: LogValue) -> None:
        return


SURFACE_PROBE = r"""(() => {
  const main = document.querySelector('.architecture-main')?.getBoundingClientRect();
  const canvas = document.querySelector('.architecture-svg-scroll');
  const canvasBox = canvas?.getBoundingClientRect();
  return {
    status: document.querySelector('#status')?.dataset.status,
    blockGroupCount: document.querySelectorAll('.architecture-block-group').length,
    residualPathCount: document.querySelectorAll('.architecture-residual').length,
    oldUiCount: document.querySelectorAll(
      '.model-map,.inspector,.stage-canvas,.transport,.curriculum-rail,.mode-tabs'
    ).length,
    architectureText: document.querySelector('.architecture-diagram')?.textContent ?? '',
    repeatPath: document.querySelector('.architecture-repeat')?.getAttribute('d') ?? '',
    repeatDash: getComputedStyle(document.querySelector('.architecture-repeat')).strokeDasharray,
    repeatMarkerStart: getComputedStyle(document.querySelector('.architecture-repeat')).markerStart,
    repeatMarkerEnd: getComputedStyle(document.querySelector('.architecture-repeat')).markerEnd,
    gridBackground: getComputedStyle(canvas).backgroundImage,
    settingsOpen: document.querySelector('.generation-settings')?.open,
    tokenDetailsOpen: document.querySelector('.token-details')?.open,
    documentOverflow: document.documentElement.scrollWidth - innerWidth,
    canvasLocalOverflow: canvas ? canvas.scrollWidth - canvas.clientWidth : null,
    canvasRatio: main && canvasBox ? canvasBox.width / main.width : 0,
    controlHeights: [
      document.querySelector('.generation-settings > summary'),
      document.querySelector('.token-details > summary'),
    ].map(element => element?.getBoundingClientRect().height ?? 0),
    svgTitle: document.querySelector('.architecture-diagram title')?.textContent,
    svgDescription: document.querySelector('.architecture-diagram desc')?.textContent,
  };
})()"""

REQUIRED_FLOW = (
    "Input Context",
    "Token Embedding",
    "Position Embedding",
    "Hidden State x₀",
    "Transformer Block × 2",
    "LayerNorm 1",
    "Causal Multi-Head",
    "Self-Attention",
    "LayerNorm 2",
    "MLP",
    "Final LayerNorm",
    "LM Head",
    "Logits",
    "Token Selection",
    "Generated Token",
    "Append to Context",
    "FULL FORWARD",
    "CONTEXT UPDATE",
)


def verify_surface(browser: ChromeSession, url: str, mobile: bool) -> None:
    cdp = browser.require_cdp()
    session = browser.page_session
    if mobile:
        cdp.send(
            "Emulation.setDeviceMetricsOverride",
            {
                "width": 390,
                "height": 844,
                "deviceScaleFactor": 1,
                "mobile": False,
            },
            session,
        )
    browser.navigate(url)
    cdp.evaluate(session, READY_PROBE, True)
    state = cdp.evaluate(session, SURFACE_PROBE, True)
    missing = [
        label for label in REQUIRED_FLOW if label not in state["architectureText"]
    ]
    if (
        state["status"] != "ready"
        or state["blockGroupCount"] != 1
        or state["residualPathCount"] != 2
        or state["oldUiCount"] != 0
        or "H 80 V" not in state["repeatPath"]
        or state["repeatDash"] == "none"
        or state["repeatMarkerStart"] != "none"
        or state["repeatMarkerEnd"] == "none"
        or state["gridBackground"] != "none"
        or state["settingsOpen"]
        or state["tokenDetailsOpen"]
        or state["documentOverflow"] > 0
        or state["canvasRatio"] < 0.75
        or min(state["controlHeights"]) < 44
        or not state["svgTitle"]
        or not state["svgDescription"]
        or missing
    ):
        raise ArchitectureContractError(
            f"architecture surface failed: state={state}, missing={missing}"
        )
    if mobile and state["canvasLocalOverflow"] <= 0:
        raise ArchitectureContractError(
            f"mobile architecture must own local overflow: {state}"
        )


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--root", type=Path, required=True)
    args = parser.parse_args()
    root = args.root.resolve()
    handler = partial(QuietHandler, directory=str(root))
    server = ThreadingHTTPServer(("127.0.0.1", 0), handler)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    try:
        origin = f"http://127.0.0.1:{server.server_port}"
        for base in ("/", "/transformer_viz/"):
            with ChromeSession() as browser:
                verify_surface(browser, origin + base, mobile=False)
            with ChromeSession() as browser:
                verify_surface(browser, origin + base, mobile=True)
            print(f"{base} architecture-first desktop/mobile: PASS")
    finally:
        server.shutdown()
        server.server_close()
        thread.join(timeout=10)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
