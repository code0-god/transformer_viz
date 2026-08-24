#!/usr/bin/env python3
# /// script
# requires-python = ">=3.12"
# dependencies = []
# ///
"""Verify Worker-free Self-Attention Architecture in real Chrome."""

from __future__ import annotations

import argparse
import threading
from functools import partial
from http.server import ThreadingHTTPServer
from pathlib import Path

from browser_architecture_attention_probes import (
    ATTENTION_DETAIL_PROBE,
    BLOCK_ATTENTION_PROBE,
)
from browser_architecture_attention_checks import verify_structure
from browser_architecture_navigation import (
    QuietHandler,
    capture,
    dispatch_click,
    focus_by_tab,
    require,
    settle,
)
from browser_architecture_navigation_probes import (
    INSTRUMENT_WORKER,
    ROOT_PROBE,
    SET_PROMPT,
)
from browser_input import dispatch_key
from browser_probes import READY_PROBE
from browser_session import ChromeSession


def hover(browser: ChromeSession, selector: str) -> None:
    cdp = browser.require_cdp()
    session = browser.page_session
    point = cdp.evaluate(
        session,
        f"""(() => {{
          const box = document.querySelector('{selector}').getBoundingClientRect();
          return {{ x: box.left + box.width / 2, y: box.top + box.height / 2 }};
        }})()""",
        True,
    )
    cdp.send("Input.dispatchMouseEvent", {"type": "mouseMoved", **point}, session)
    settle(browser)


def verify_attention(
    browser: ChromeSession,
    url: str,
    mobile: bool,
    evidence: Path | None,
) -> None:
    cdp = browser.require_cdp()
    session = browser.page_session
    if mobile:
        cdp.send(
            "Emulation.setDeviceMetricsOverride",
            {"width": 390, "height": 844, "deviceScaleFactor": 1, "mobile": False},
            session,
        )
    else:
        cdp.send(
            "Emulation.setDeviceMetricsOverride",
            {"width": 1440, "height": 900, "deviceScaleFactor": 1, "mobile": False},
            session,
        )
    cdp.send(
        "Page.addScriptToEvaluateOnNewDocument",
        {"source": INSTRUMENT_WORKER},
        session,
    )
    browser.navigate(url)
    cdp.evaluate(session, READY_PROBE, True)
    cdp.evaluate(session, SET_PROMPT, True)
    settle(browser)
    initial = cdp.evaluate(session, ROOT_PROBE, True)

    dispatch_click(browser, '[data-node-id="transformer-block"]')
    block = cdp.evaluate(session, BLOCK_ATTENTION_PROBE, True)
    require(block["block"] and not block["attention"], f"block route: {block}")
    require(
        block["capability"] == "drill-down"
        and block["role"] == "button"
        and block["tabIndex"] == "0"
        and block["indicator"] == "자세히 보기 ›",
        f"Self-Attention affordance: {block}",
    )
    require(
        block["firstResidual"] == "M 390 108 H 700 V 382 H 412"
        and block["secondResidual"] == "M 390 518 H 700 V 790 H 412",
        f"Block residual changed: {block}",
    )
    focus_by_tab(browser, '[data-node-id="self-attention"]')
    settle(browser)
    focused = cdp.evaluate(session, BLOCK_ATTENTION_PROBE, True)
    require(focused["indicatorOpacity"] >= 0.7, f"attention focus affordance: {focused}")
    cdp.evaluate(session, "document.activeElement.blur()")
    hover(browser, '[data-node-id="self-attention"]')
    hovered = cdp.evaluate(session, BLOCK_ATTENTION_PROBE, True)
    require(hovered["indicatorOpacity"] >= 0.7, f"attention hover affordance: {hovered}")

    dispatch_click(browser, '[data-node-id="self-attention"]')
    detail = cdp.evaluate(session, ATTENTION_DETAIL_PROBE, True)
    verify_structure(detail, mobile)
    require(detail["workerPosts"] == initial["workerPosts"], f"navigation called Worker: {detail}")
    require(detail["prompt"] == initial["prompt"], f"prompt changed: {detail}")
    if evidence is not None:
        cdp.send(
            "Input.dispatchMouseEvent",
            {"type": "mouseMoved", "x": 1, "y": 1},
            session,
        )
        settle(browser)
        capture(
            browser,
            evidence / ("attention-detail-mobile.png" if mobile else "attention-detail.png"),
        )

    dispatch_click(browser, '[data-testid="architecture-back-block"]')
    require(cdp.evaluate(session, BLOCK_ATTENTION_PROBE, True)["block"], "back button failed")
    focus_by_tab(browser, '[data-node-id="self-attention"]')
    dispatch_key(cdp, session, "Enter", "Enter", 13)
    settle(browser)
    require(cdp.evaluate(session, ATTENTION_DETAIL_PROBE, True)["attention"], "Enter failed")

    dispatch_click(browser, '[data-layer-index="1"]')
    dispatch_click(browser, '[data-head-index="3"]')
    dispatch_click(browser, '[data-node-id="attention-causal-mask"]')
    selected = cdp.evaluate(session, ATTENTION_DETAIL_PROBE, True)
    require(
        selected["selectedLayer"] == 1
        and selected["selectedHead"] == 3
        and selected["selectedNode"] == "attention-causal-mask"
        and "Causal Mask" in selected["operationCopy"],
        f"attention selection state: {selected}",
    )
    require(selected["workerPosts"] == initial["workerPosts"], f"selection called Worker: {selected}")

    dispatch_click(browser, '[data-testid="architecture-breadcrumb-block"]')
    returned_block = cdp.evaluate(session, BLOCK_ATTENTION_PROBE, True)
    require(returned_block["selectedLayer"] == 1, f"layer not preserved: {returned_block}")
    focus_by_tab(browser, '[data-node-id="self-attention"]')
    dispatch_key(cdp, session, " ", "Space", 32)
    settle(browser)
    returned_attention = cdp.evaluate(session, ATTENTION_DETAIL_PROBE, True)
    require(returned_attention["selectedHead"] == 3, f"head not preserved: {returned_attention}")

    dispatch_click(browser, '[data-testid="architecture-breadcrumb-gpt"]')
    returned_root = cdp.evaluate(session, ROOT_PROBE, True)
    require(returned_root["root"], f"GPT breadcrumb failed: {returned_root}")
    require(returned_root["prompt"] == initial["prompt"], f"root prompt changed: {returned_root}")
    require(
        returned_root["workerPosts"] == initial["workerPosts"],
        f"root navigation called Worker: {returned_root}",
    )


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--root", type=Path, required=True)
    parser.add_argument("--evidence", type=Path)
    args = parser.parse_args()
    handler = partial(QuietHandler, directory=str(args.root.resolve()))
    server = ThreadingHTTPServer(("127.0.0.1", 0), handler)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    try:
        origin = f"http://127.0.0.1:{server.server_port}"
        for base in ("/", "/transformer_viz/"):
            for mobile in (False, True):
                evidence = args.evidence if base == "/" else None
                with ChromeSession() as browser:
                    verify_attention(browser, origin + base, mobile, evidence)
            print(f"{base} Self-Attention architecture desktop/mobile: PASS")
    finally:
        server.shutdown()
        server.server_close()
        thread.join(timeout=10)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
