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
from typing import Final, Protocol

from browser_learning_workspace_actions import (
    NODE_SELECTORS,
    ActionRecord,
    AttentionScrollerGeometry,
    ExpectedState,
    WorkspaceContractError,
    guide_selector,
    record_click,
    record_keyboard,
    state,
)
from browser_learning_workspace_probes import (
    INSTRUMENT_LEARNING_WORKSPACE,
    PAGE_HEALTH,
    WORKSPACE_READY,
    browser_errors,
)
from browser_learning_workspace_visual import (
    VisualCaptureConfig,
    VisualMetricError,
    VisualMetrics,
    verify_visual,
)
from browser_probes import READY_PROBE
from browser_session import ChromeSession
from browser_urls import lab_url


DEFAULT_VIEWPORTS: Final = "1440x900,1024x768,390x844"


def parse_viewports(source: str) -> tuple[tuple[int, int], ...]:
    parsed: list[tuple[int, int]] = []
    for token in source.split(","):
        parts = token.lower().split("x")
        if len(parts) != 2 or not all(part.isdigit() for part in parts):
            raise VisualMetricError(f"invalid viewport: {token}")
        width, height = (int(part) for part in parts)
        if width <= 0 or height <= 0:
            raise VisualMetricError(f"invalid viewport: {token}")
        parsed.append((width, height))
    if not parsed:
        raise VisualMetricError("at least one viewport is required")
    return tuple(parsed)


def _layout_failures(metrics: VisualMetrics) -> list[str]:
    width, layout = metrics["viewport"]["width"], metrics["layout"]
    failures: list[str] = []
    if width == 1440:
        if layout["mode"] != "grid" or not 46 <= layout["diagramShare"] <= 50 or not 50 <= layout["guideShare"] <= 54:
            failures.append("1440px columns must be 46-50% Diagram and 50-54% Guide")
        if not layout["stickyVisibleAfterScroll"]:
            failures.append("desktop Diagram must remain visible after Guide document scroll")
    elif layout["mode"] != "stack":
        failures.append(f"{width}px layout must stack Diagram then Guide")
    checks = (
        (layout["documentOverflow"] != 0, "document horizontal overflow must be 0"),
        (bool(layout["unexpectedOverflowOwners"]), "only intended diagram/formula scrollers may overflow"),
    )
    failures.extend(message for failed, message in checks if failed)
    return failures


def _content_health_failures(metrics: VisualMetrics) -> list[str]:
    typography, health = metrics["typography"], metrics["health"]
    controls, content = metrics["controls"], metrics["content"]
    error_keys = ("consoleErrors", "networkErrors", "runtimeErrors", "katexErrors")
    checks = (
        (typography["fontSize"] < 15, "Guide body font-size must be at least 15px"),
        (typography["lineHeightRatio"] < 1.65, "Guide line-height ratio must be at least 1.65"),
        (health["workerStarts"] != 1, "Worker startup count must be exactly 1"),
        (not health["workerReadyObserved"], "Worker Ready must be observed before generation"),
        (any(health[key] != 0 for key in error_keys), "browser error counts must all be 0"),
        (health["status"] != "ready", "Worker status must be ready"),
        (bool(controls["targetViolations"]), "interactive targets must be at least 44px"),
        (content["outlineCount"] < 1 or content["sectionControlCount"] < 1 or content["runtimeFactsCount"] < 1, "outline, Guide controls, and runtime facts must be present"),
        (metrics["routeId"] == "decoder.self-attention" and content["selectedOperationCount"] < 1, "Attention selected operation must be present"),
        (content["pendingFactCount"] > 0 or content["readyFactCount"] < 1, "runtime and selected-operation facts must be trace-ready"),
    )
    return [message for failed, message in checks if failed]


def validate_metrics(metrics: VisualMetrics) -> tuple[str, ...]:
    return tuple(_layout_failures(metrics) + _content_health_failures(metrics))


class LogValue(Protocol):
    def __str__(self) -> str: ...


class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self, format: str, *args: LogValue) -> None:
        return


def attention_scroller_geometry(browser: ChromeSession) -> AttentionScrollerGeometry:
    geometry = browser.require_cdp().evaluate(
        browser.page_session,
        """(() => {
          const scroller = document.getElementsByClassName('architecture-attention-scroll')[0];
          const target = Array.from(document.getElementsByTagName('*'))
            .find(element => element.dataset.nodeId === 'attention-query');
          if (!(scroller instanceof HTMLElement) || !(target instanceof Element)) {
            throw new Error('missing registered attention scroller or target');
          }
          const scrollerBox = scroller.getBoundingClientRect();
          const targetBox = target.getBoundingClientRect();
          const before = scroller.scrollLeft;
          scroller.scrollLeft = scroller.scrollWidth;
          const after = scroller.scrollLeft;
          return {
            viewportWidth: innerWidth,
            viewportHeight: innerHeight,
            reducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches,
            clientWidth: scroller.clientWidth,
            scrollWidth: scroller.scrollWidth,
            effectiveMax: Math.max(0, scroller.scrollWidth - scroller.clientWidth),
            scrollLeftBeforeAssignment: before,
            scrollLeftAfterMaxAssignment: after,
            overflowX: getComputedStyle(scroller).overflowX,
            documentOverflow: Math.max(0,
              document.documentElement.scrollWidth - document.documentElement.clientWidth),
            targetFullyInsideScroller:
              targetBox.left >= scrollerBox.left && targetBox.right <= scrollerBox.right &&
              targetBox.top >= scrollerBox.top && targetBox.bottom <= scrollerBox.bottom,
          };
        })()""",
        True,
    )
    checks = {
        "390x844 viewport": (geometry["viewportWidth"], geometry["viewportHeight"])
        == (390, 844),
        "reduced motion": geometry["reducedMotion"],
        "equal scroller widths": geometry["clientWidth"] == geometry["scrollWidth"],
        "zero effective maximum": geometry["effectiveMax"] == 0,
        "zero scrollLeft before assignment": geometry["scrollLeftBeforeAssignment"] == 0,
        "zero scrollLeft after maximum assignment": geometry["scrollLeftAfterMaxAssignment"]
        == 0,
        "zero document overflow": geometry["documentOverflow"] == 0,
        "target inside registered scroller": geometry["targetFullyInsideScroller"],
    }
    failures = [name for name, passed in checks.items() if not passed]
    if failures:
        raise WorkspaceContractError(
            f"reduced-motion scroller geometry failed {failures}: {geometry}"
        )
    return geometry


def run_actions(browser: ChromeSession) -> list[ActionRecord]:
    records: list[ActionRecord] = []
    root = "decoder.root"
    block = "decoder.block"
    attention = "decoder.self-attention"
    record_click(browser, records, "root.embedding.pointer", NODE_SELECTORS["embedding"], ExpectedState(root, "token-embedding", "root-embeddings", "root-embeddings"))
    record_click(browser, records, "root.embedding.repeat", NODE_SELECTORS["embedding"], ExpectedState(root, "token-embedding", "root-embeddings", "root-embeddings", focus_delta=1))
    record_click(browser, records, "root.block.drill-down", NODE_SELECTORS["block"], ExpectedState(block, None, None, "learning-route-title", heading_focus_delta=1))
    record_click(browser, records, "block.ln1.pointer", NODE_SELECTORS["ln1"], ExpectedState(block, "layer-norm-1", "block-layer-norm-1", "block-layer-norm-1"))
    record_click(browser, records, "block.guide.attention", guide_selector("block-self-attention"), ExpectedState(block, "layer-norm-1", "block-self-attention", "self-attention", ("self-attention",), guide_action=True))
    record_click(browser, records, "block.guide.attention.repeat", guide_selector("block-self-attention"), ExpectedState(block, "layer-norm-1", "block-self-attention", "self-attention", ("self-attention",), focus_delta=1, guide_action=True))
    record_click(browser, records, "block.attention.drill-down", NODE_SELECTORS["attention"], ExpectedState(attention, None, None, "learning-route-title", heading_focus_delta=1))
    record_click(browser, records, "attention.query.pointer", NODE_SELECTORS["query"], ExpectedState(attention, "attention-query", "heads", "heads"))
    record_click(browser, records, "attention.score.pointer", NODE_SELECTORS["score"], ExpectedState(attention, "attention-scores", "score", "score"))
    record_click(browser, records, "attention.mask.pointer", NODE_SELECTORS["mask"], ExpectedState(attention, "attention-causal-mask", "mask", "mask"))
    record_click(browser, records, "attention.softmax.pointer", NODE_SELECTORS["softmax"], ExpectedState(attention, "attention-softmax", "softmax", "softmax"))
    record_click(browser, records, "attention.value.pointer", NODE_SELECTORS["value"], ExpectedState(attention, "attention-value-aggregation", "value", "value"))
    cdp = browser.require_cdp()
    cdp.send("Emulation.setDeviceMetricsOverride", {"width": 390, "height": 844, "deviceScaleFactor": 1, "mobile": False}, browser.page_session)
    cdp.send("Emulation.setEmulatedMedia", {"features": [{"name": "prefers-reduced-motion", "value": "reduce"}]}, browser.page_session)
    reduced_motion_geometry = attention_scroller_geometry(browser)
    record_click(
        browser,
        records,
        "attention.guide.heads.reduced-motion",
        guide_selector("heads"),
        ExpectedState(
            attention,
            "attention-value-aggregation",
            "heads",
            "attention-query",
            ("attention-key", "attention-query", "attention-value"),
            focus_delta=1,
            guide_action=True,
            scroll_behavior="none",
        ),
        reduced_motion_geometry,
    )
    cdp.send("Emulation.clearDeviceMetricsOverride", session_id=browser.page_session)
    cdp.send("Emulation.setEmulatedMedia", {"features": [{"name": "prefers-reduced-motion", "value": "no-preference"}]}, browser.page_session)
    record_click(browser, records, "attention.guide.qkv", guide_selector("qkv"), ExpectedState(attention, "attention-value-aggregation", "qkv", "attention-qkv-projection", ("attention-qkv-projection",), guide_action=True))
    record_click(browser, records, "attention.guide.score", guide_selector("score"), ExpectedState(attention, "attention-value-aggregation", "score", "attention-scores", ("attention-scores",), guide_action=True))
    record_click(browser, records, "attention.guide.mask", guide_selector("mask"), ExpectedState(attention, "attention-value-aggregation", "mask", "attention-causal-mask", ("attention-causal-mask",), guide_action=True))
    record_click(browser, records, "attention.guide.softmax", guide_selector("softmax"), ExpectedState(attention, "attention-value-aggregation", "softmax", "attention-softmax", ("attention-softmax",), guide_action=True))
    record_click(browser, records, "attention.layer", '[data-layer-index="1"]', ExpectedState(attention, "attention-value-aggregation", "softmax", highlights=("attention-softmax",)))
    record_click(browser, records, "attention.head", '[data-head-index="2"]', ExpectedState(attention, "attention-value-aggregation", "softmax", highlights=("attention-softmax",)))
    record_click(browser, records, "attention.value.repeat", NODE_SELECTORS["value"], ExpectedState(attention, "attention-value-aggregation", "value", "value", focus_delta=1))
    record_keyboard(browser, records, "attention.query.keyboard", NODE_SELECTORS["query"], ExpectedState(attention, "attention-query", "heads", "heads"))
    record_click(browser, records, "attention.back.block", '[data-testid="architecture-back-block"]', ExpectedState(block, None, None, "learning-route-title", heading_focus_delta=1))
    record_click(browser, records, "block.breadcrumb.root", '[data-testid="architecture-breadcrumb-gpt"]', ExpectedState(root, None, None, "learning-route-title", heading_focus_delta=1))
    browser.require_cdp().evaluate(browser.page_session, """Array.from(document.getElementsByTagName('*'))
      .find(element => element.dataset.nodeId === 'token-embedding').remove()""")
    record_click(browser, records, "root.guide.embedding.stale-target", guide_selector("root-embeddings"), ExpectedState(root, None, "root-embeddings", "", ("position-embedding",), guide_action=True, focus_availability="unavailable"))
    return records


def verify_entry(root: Path, entry: str, evidence: Path) -> None:
    handler = partial(QuietHandler, directory=str(root.resolve()))
    server = ThreadingHTTPServer(("127.0.0.1", 0), handler)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    try:
        with ChromeSession() as browser:
            cdp = browser.require_cdp()
            cdp.send("Page.addScriptToEvaluateOnNewDocument", {"source": INSTRUMENT_LEARNING_WORKSPACE}, browser.page_session)
            browser.navigate(lab_url(f"http://127.0.0.1:{server.server_port}", "/" if entry == "index.html" else "/transformer_viz/"))
            cdp.evaluate(browser.page_session, READY_PROBE, True)
            cdp.evaluate(browser.page_session, WORKSPACE_READY, True)
            startup = state(browser)
            if startup["workerStarts"] != 1:
                raise WorkspaceContractError(
                    f"expected one startup Worker, observed {startup['workerStarts']}"
                )
            records = run_actions(browser)
            health = cdp.evaluate(browser.page_session, PAGE_HEALTH, True)
            errors = browser_errors(browser)
            if len(records) != 24:
                raise WorkspaceContractError(f"expected 24 actions, observed {len(records)}")
            repeat_records = [record for record in records if record["action"].endswith(".repeat")]
            if len(repeat_records) != 3 or any(record["focusDelta"] <= 0 for record in repeat_records):
                raise WorkspaceContractError(f"repeat reveal was not observed: {repeat_records}")
            if health["status"] != "ready" or health["katexErrors"] != 0 or health["runtimeAlerts"]:
                raise WorkspaceContractError(f"page health failed: {health}")
            if any(errors.values()):
                raise WorkspaceContractError(f"browser errors: {errors}")
            evidence.mkdir(parents=True, exist_ok=True)
            (evidence / "actions.json").write_text(json.dumps(records, ensure_ascii=False, indent=2) + "\n")
            reduced_motion = next(
                record
                for record in records
                if record["action"] == "attention.guide.heads.reduced-motion"
            )
            (evidence / "browser-summary.json").write_text(json.dumps({"entry": entry, "startupWorkerCount": startup["workerStarts"], "actionCount": len(records), "reducedMotion": {"scrollExpectation": "none", "scrollBehaviorEvents": reduced_motion["scrollBehaviorEvents"], "scrollEventSource": reduced_motion["scrollEventSource"], "focusDelta": reduced_motion["focusDelta"], "workerDelta": reduced_motion["workerDelta"], "geometry": reduced_motion["geometry"]}, "health": health, "errors": errors}, ensure_ascii=False, indent=2) + "\n")
            guide_deltas = [record["workerDelta"] for record in records if ".guide." in record["action"]]
            if len(guide_deltas) != 8 or any(delta != 0 for delta in guide_deltas):
                raise WorkspaceContractError(f"Guide Worker deltas failed: {guide_deltas}")
            (evidence / "worker-delta.json").write_text(json.dumps({"startupWorkerCount": startup["workerStarts"], "guideActionDeltas": guide_deltas, "allZero": all(delta == 0 for delta in guide_deltas)}, indent=2) + "\n")
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
    parser.add_argument("--scenario", choices=("all", "visual"), default="all")
    parser.add_argument("--viewports", default=DEFAULT_VIEWPORTS)
    parser.add_argument("--evidence", type=Path, required=True)
    args = parser.parse_args()
    if args.scenario == "visual":
        source_paths = [
            *Path("apps/web/src").rglob("*.ts"),
            *Path("apps/web/src").rglob("*.tsx"),
            *Path("apps/web/src").rglob("*.css"),
            Path("apps/web/style.css"),
            Path("apps/web/index.html"),
        ]
        source_mtime_ns = max(path.stat().st_mtime_ns for path in source_paths)
        verify_visual(
            VisualCaptureConfig(
                root=args.root,
                entry=args.entry,
                viewports=parse_viewports(args.viewports),
                evidence=args.evidence,
                source_mtime_ns=source_mtime_ns,
                validator=validate_metrics,
            )
        )
    else:
        verify_entry(args.root, args.entry, args.evidence)
    print(f"{args.entry} Learning Workspace {args.scenario}: PASS")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
