#!/usr/bin/env python3
# /// script
# requires-python = ">=3.12"
# dependencies = []
# ///
"""Verify canonical Root, Block, and Self-Attention notation in Chrome."""

from __future__ import annotations

import argparse
import threading
from functools import partial
from http.server import ThreadingHTTPServer
from pathlib import Path

from browser_architecture_attention_checks import verify_structure
from browser_architecture_attention_probes import ATTENTION_DETAIL_PROBE
from browser_architecture_navigation import (
    QuietHandler,
    capture,
    dispatch_click,
    require,
    settle,
)
from browser_architecture_navigation_probes import (
    INSTRUMENT_WORKER,
    SET_PROMPT,
)
from browser_architecture_notation_probes import (
    BLOCK_NOTATION_PROBE,
    ROOT_NOTATION_PROBE,
)
from browser_probes import READY_PROBE
from browser_session import ChromeSession


def verify_notation(
    browser: ChromeSession,
    url: str,
    mobile: bool,
    evidence: Path | None,
) -> None:
    cdp = browser.require_cdp()
    session = browser.page_session
    suffix = "-mobile" if mobile else ""
    metrics = (
        {"width": 390, "height": 844, "deviceScaleFactor": 1, "mobile": False}
        if mobile
        else {"width": 1440, "height": 900, "deviceScaleFactor": 1, "mobile": False}
    )
    cdp.send("Emulation.setDeviceMetricsOverride", metrics, session)
    cdp.send(
        "Page.addScriptToEvaluateOnNewDocument",
        {"source": INSTRUMENT_WORKER},
        session,
    )
    browser.navigate(url)
    cdp.evaluate(session, READY_PROBE, True)
    cdp.evaluate(session, SET_PROMPT, True)
    settle(browser)

    root = cdp.evaluate(session, ROOT_NOTATION_PROBE, True)
    require(
        root["repeatedBlock"]
        and root["hiddenInput"]
        and root["hiddenOutput"]
        and root["finalRelation"],
        f"root notation: {root}",
    )
    require(not root["legacyNotation"], f"root legacy notation: {root}")
    require(not root["mixedShape"], f"root mixed shape: {root}")
    require(root["documentOverflow"] == 0, f"root overflow: {root}")
    if evidence is not None:
        capture(browser, evidence / f"architecture-root-notation{suffix}.png")

    dispatch_click(browser, '[data-node-id="transformer-block"]')
    block = cdp.evaluate(session, BLOCK_NOTATION_PROBE, True)
    require(
        block["input"] and block["residual1"] and block["output"] and block["formulas"],
        f"block notation: {block}",
    )
    require(
        block["firstResidual"] == "M 390 108 H 700 V 382 H 412"
        and block["secondResidual"] == "M 390 518 H 700 V 790 H 412",
        f"block residual geometry: {block}",
    )
    require(not block["legacyNotation"], f"block legacy notation: {block}")
    require(not block["mixedShape"], f"block mixed shape: {block}")
    require(block["documentOverflow"] == 0, f"block overflow: {block}")
    if evidence is not None:
        capture(browser, evidence / f"block-detail-notation{suffix}.png")

    dispatch_click(browser, '[data-node-id="self-attention"]')
    attention = cdp.evaluate(session, ATTENTION_DETAIL_PROBE, True)
    verify_structure(attention, mobile)
    if evidence is not None:
        capture(browser, evidence / f"attention-detail-notation{suffix}.png")

    dispatch_click(browser, '[data-node-id="attention-scores"]')
    score = cdp.evaluate(session, ATTENTION_DETAIL_PROBE, True)
    require(
        score["selectedNode"] == "attention-scores"
        and "Score MatMul" in score["operationCopy"]
        and "S_h = Q_h @ K_hᵀ" in score["operationCopy"]
        and "Symbolic shape" in score["operationCopy"]
        and "Current shape" in score["operationCopy"]
        and "실행 후 표시" in score["operationCopy"],
        f"Score MatMul operation panel: {score}",
    )
    dispatch_click(browser, '[data-node-id="attention-value-aggregation"]')
    value = cdp.evaluate(session, ATTENTION_DETAIL_PROBE, True)
    require(
        value["selectedNode"] == "attention-value-aggregation"
        and "Value MatMul" in value["operationCopy"]
        and "Y_h = A_h @ V_h" in value["operationCopy"],
        f"Value MatMul operation panel: {value}",
    )

    for state in (root, block, attention, score, value):
        require(
            state["prompt"] == root["prompt"]
            and state["status"] == root["status"]
            and state["workerPosts"] == root["workerPosts"],
            f"notation navigation changed runtime state: {state}",
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
                    verify_notation(browser, origin + base, mobile, evidence)
            print(f"{base} Architecture notation desktop/mobile: PASS")
    finally:
        server.shutdown()
        server.server_close()
        thread.join(timeout=10)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
