#!/usr/bin/env python3
# /// script
# requires-python = ">=3.12"
# dependencies = []
# ///
# ─── How to run ───
# PYTHONPATH=scripts python3 scripts/browser_learning_workspace.py --root <dist> --entry index.html --scenario all --evidence <dir>
"""Drive the complete production Learning Workspace interaction contract."""

from __future__ import annotations

import argparse
import json
import threading
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Protocol

from browser_learning_workspace_actions import (
    NODE_SELECTORS,
    ActionRecord,
    ExpectedState,
    WorkspaceContractError,
    guide_selector,
    record_click,
    record_keyboard,
)
from browser_learning_workspace_probes import (
    INSTRUMENT_LEARNING_WORKSPACE,
    PAGE_HEALTH,
    WORKSPACE_READY,
)
from browser_probes import READY_PROBE
from browser_session import ChromeSession


class LogValue(Protocol):
    def __str__(self) -> str: ...


class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self, format: str, *args: LogValue) -> None:
        return


def run_actions(browser: ChromeSession) -> list[ActionRecord]:
    records: list[ActionRecord] = []
    root = "decoder.root"
    block = "decoder.block"
    attention = "decoder.self-attention"
    record_click(browser, records, "root.embedding.pointer", NODE_SELECTORS["embedding"], ExpectedState(root, "token-embedding", "root-embeddings", "root-embeddings"))
    record_click(browser, records, "root.embedding.repeat", NODE_SELECTORS["embedding"], ExpectedState(root, "token-embedding", "root-embeddings", "root-embeddings"))
    record_click(browser, records, "root.block.drill-down", NODE_SELECTORS["block"], ExpectedState(block, None, None, "learning-route-title", heading_focus_delta=1))
    record_click(browser, records, "block.ln1.pointer", NODE_SELECTORS["ln1"], ExpectedState(block, "layer-norm-1", "block-layer-norm-1", "block-layer-norm-1"))
    record_click(browser, records, "block.guide.attention", guide_selector("block-self-attention"), ExpectedState(block, "layer-norm-1", "block-self-attention", "self-attention", ("self-attention",), guide_action=True))
    record_click(browser, records, "block.guide.attention.repeat", guide_selector("block-self-attention"), ExpectedState(block, "layer-norm-1", "block-self-attention", "self-attention", ("self-attention",), guide_action=True))
    record_click(browser, records, "block.attention.drill-down", NODE_SELECTORS["attention"], ExpectedState(attention, None, None, "learning-route-title", heading_focus_delta=1))
    record_click(browser, records, "attention.query.pointer", NODE_SELECTORS["query"], ExpectedState(attention, "attention-query", "heads", "heads"))
    record_click(browser, records, "attention.score.pointer", NODE_SELECTORS["score"], ExpectedState(attention, "attention-scores", "score", "score"))
    record_click(browser, records, "attention.mask.pointer", NODE_SELECTORS["mask"], ExpectedState(attention, "attention-causal-mask", "mask", "mask"))
    record_click(browser, records, "attention.softmax.pointer", NODE_SELECTORS["softmax"], ExpectedState(attention, "attention-softmax", "softmax", "softmax"))
    record_click(browser, records, "attention.value.pointer", NODE_SELECTORS["value"], ExpectedState(attention, "attention-value-aggregation", "value", "value"))
    cdp = browser.require_cdp()
    cdp.send("Emulation.setDeviceMetricsOverride", {"width": 390, "height": 844, "deviceScaleFactor": 1, "mobile": False}, browser.page_session)
    cdp.send("Emulation.setEmulatedMedia", {"features": [{"name": "prefers-reduced-motion", "value": "reduce"}]}, browser.page_session)
    cdp.evaluate(browser.page_session, "document.querySelector('.architecture-attention-scroll').scrollLeft = document.querySelector('.architecture-attention-scroll').scrollWidth")
    record_click(browser, records, "attention.guide.heads.reduced-motion", guide_selector("heads"), ExpectedState(attention, "attention-value-aggregation", "heads", "attention-query", ("attention-key", "attention-query", "attention-value"), guide_action=True, scroll_behavior="auto"))
    cdp.send("Emulation.clearDeviceMetricsOverride", session_id=browser.page_session)
    cdp.send("Emulation.setEmulatedMedia", {"features": [{"name": "prefers-reduced-motion", "value": "no-preference"}]}, browser.page_session)
    record_click(browser, records, "attention.guide.qkv", guide_selector("qkv"), ExpectedState(attention, "attention-value-aggregation", "qkv", "attention-qkv-projection", ("attention-qkv-projection",), guide_action=True))
    record_click(browser, records, "attention.guide.score", guide_selector("score"), ExpectedState(attention, "attention-value-aggregation", "score", "attention-scores", ("attention-scores",), guide_action=True))
    record_click(browser, records, "attention.guide.mask", guide_selector("mask"), ExpectedState(attention, "attention-value-aggregation", "mask", "attention-causal-mask", ("attention-causal-mask",), guide_action=True))
    record_click(browser, records, "attention.guide.softmax", guide_selector("softmax"), ExpectedState(attention, "attention-value-aggregation", "softmax", "attention-softmax", ("attention-softmax",), guide_action=True))
    record_click(browser, records, "attention.layer", '[data-layer-index="1"]', ExpectedState(attention, "attention-value-aggregation", "softmax", highlights=("attention-softmax",)))
    record_click(browser, records, "attention.head", '[data-head-index="2"]', ExpectedState(attention, "attention-value-aggregation", "softmax", highlights=("attention-softmax",)))
    record_click(browser, records, "attention.value.repeat", NODE_SELECTORS["value"], ExpectedState(attention, "attention-value-aggregation", "value", "value"))
    record_keyboard(browser, records, "attention.query.keyboard", NODE_SELECTORS["query"], ExpectedState(attention, "attention-query", "heads", "heads"))
    record_click(browser, records, "attention.back.block", '[data-testid="architecture-back-block"]', ExpectedState(block, None, None, "learning-route-title", heading_focus_delta=1))
    record_click(browser, records, "block.breadcrumb.root", '[data-testid="architecture-breadcrumb-gpt"]', ExpectedState(root, None, None, "learning-route-title", heading_focus_delta=1))
    browser.require_cdp().evaluate(browser.page_session, "document.querySelector('[data-node-id=\"token-embedding\"]').remove()")
    record_click(browser, records, "root.guide.embedding.stale-target", guide_selector("root-embeddings"), ExpectedState(root, None, "root-embeddings", "", ("position-embedding",), guide_action=True, focus_availability="unavailable"))
    return records


def browser_errors(browser: ChromeSession) -> dict[str, list[str]]:
    console: list[str] = []
    network: list[str] = []
    runtime: list[str] = []
    request_urls: dict[str, str] = {}
    for event in browser.require_cdp().events:
        method = event.get("method")
        params = event.get("params", {})
        if method == "Network.requestWillBeSent":
            request_urls[params.get("requestId", "")] = params.get("request", {}).get("url", "")
        if method == "Runtime.consoleAPICalled" and params.get("type") in ("error", "warning"):
            console.append(json.dumps(params, ensure_ascii=False))
        if method == "Runtime.exceptionThrown":
            runtime.append(json.dumps(params, ensure_ascii=False))
        if method == "Network.loadingFailed":
            request_url = request_urls.get(params.get("requestId", ""), "unknown")
            network.append(f"{request_url}: {json.dumps(params, ensure_ascii=False)}")
        if method == "Network.responseReceived" and params.get("response", {}).get("status", 0) >= 400:
            network.append(json.dumps(params.get("response"), ensure_ascii=False))
    return {"console": console, "network": network, "runtime": runtime}


def verify_entry(root: Path, entry: str, evidence: Path) -> None:
    handler = partial(QuietHandler, directory=str(root.resolve()))
    server = ThreadingHTTPServer(("127.0.0.1", 0), handler)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    try:
        with ChromeSession() as browser:
            cdp = browser.require_cdp()
            cdp.send("Page.addScriptToEvaluateOnNewDocument", {"source": INSTRUMENT_LEARNING_WORKSPACE}, browser.page_session)
            browser.navigate(f"http://127.0.0.1:{server.server_port}/{entry}")
            cdp.evaluate(browser.page_session, READY_PROBE, True)
            cdp.evaluate(browser.page_session, WORKSPACE_READY, True)
            records = run_actions(browser)
            health = cdp.evaluate(browser.page_session, PAGE_HEALTH, True)
            errors = browser_errors(browser)
            if len(records) < 18:
                raise WorkspaceContractError(f"action log too short: {len(records)}")
            if health["status"] != "ready" or health["katexErrors"] != 0 or health["runtimeAlerts"]:
                raise WorkspaceContractError(f"page health failed: {health}")
            if any(errors.values()):
                raise WorkspaceContractError(f"browser errors: {errors}")
            evidence.mkdir(parents=True, exist_ok=True)
            (evidence / "actions.json").write_text(json.dumps(records, ensure_ascii=False, indent=2) + "\n")
            (evidence / "browser-summary.json").write_text(json.dumps({"entry": entry, "health": health, "errors": errors}, ensure_ascii=False, indent=2) + "\n")
            guide_deltas = [record["workerDelta"] for record in records if ".guide." in record["action"]]
            (evidence / "worker-delta.json").write_text(json.dumps({"guideActionDeltas": guide_deltas, "allZero": all(delta == 0 for delta in guide_deltas)}, indent=2) + "\n")
    finally:
        server.shutdown()
        server.server_close()
        thread.join(timeout=10)
        (evidence / "cleanup.txt").parent.mkdir(parents=True, exist_ok=True)
        (evidence / "cleanup.txt").write_text("Chrome context closed; static server stopped; ephemeral port released.\n")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--root", type=Path, required=True)
    parser.add_argument("--entry", default="index.html")
    parser.add_argument("--scenario", choices=("all",), default="all")
    parser.add_argument("--evidence", type=Path, required=True)
    args = parser.parse_args()
    verify_entry(args.root, args.entry, args.evidence)
    print(f"{args.entry} Learning Workspace: PASS")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
