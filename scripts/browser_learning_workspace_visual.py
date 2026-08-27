"""Fresh production capture for the complete Learning Workspace visual matrix."""

from __future__ import annotations

import base64
import json
import re
import struct
import threading
from collections.abc import Callable
from dataclasses import dataclass
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Final, Protocol, TypedDict

from browser_learning_workspace_actions import (
    NODE_SELECTORS,
    ActionRecord,
    ExpectedState,
    WorkspaceContractError,
    record_click,
    state,
)
from browser_learning_workspace_runtime import (
    capture_keyboard_live_evidence,
    prepare_runtime_evidence,
)
from browser_learning_workspace_probes import (
    INSTRUMENT_LEARNING_WORKSPACE,
    STICKY_PROBE,
    VISUAL_PROBE,
    VISUAL_SETTLED,
    WORKSPACE_READY,
    browser_errors,
)
from browser_probes import READY_PROBE
from browser_session import ChromeSession
from browser_urls import lab_url


class VisualMetricError(RuntimeError):
    """Rendered evidence violated the visual contract."""


class HealthMetrics(TypedDict):
    status: str
    lifecycleStatus: str
    workerReadyObserved: bool
    workerStarts: int
    consoleErrors: int
    networkErrors: int
    runtimeErrors: int
    katexErrors: int


class ViewportMetrics(TypedDict):
    width: int
    height: int


class LayoutMetrics(TypedDict):
    mode: str
    diagramShare: float
    guideShare: float
    documentOverflow: int
    unexpectedOverflowOwners: list[str]
    stickyVisibleAfterScroll: bool


class TypographyMetrics(TypedDict):
    fontSize: float
    lineHeightRatio: float


class ControlsMetrics(TypedDict):
    targetViolations: list[str]


class ContentMetrics(TypedDict):
    outlineCount: int
    sectionControlCount: int
    runtimeFactsCount: int
    selectedOperationCount: int
    pendingFactCount: int
    readyFactCount: int


class VisualMetrics(TypedDict):
    routeId: str
    viewport: ViewportMetrics
    layout: LayoutMetrics
    typography: TypographyMetrics
    health: HealthMetrics
    controls: ControlsMetrics
    content: ContentMetrics


MetricValidator = Callable[[VisualMetrics], tuple[str, ...]]


@dataclass(frozen=True, slots=True)
class VisualCaptureConfig:
    root: Path
    entry: str
    viewports: tuple[tuple[int, int], ...]
    evidence: Path
    source_mtime_ns: int
    validator: MetricValidator


@dataclass(frozen=True, slots=True)
class ScreenCapture:
    browser: ChromeSession
    url: str
    route: str
    viewport: tuple[int, int]
    config: VisualCaptureConfig


class LogValue(Protocol):
    def __str__(self) -> str: ...


class QuietVisualHandler(SimpleHTTPRequestHandler):
    def log_message(self, format: str, *args: LogValue) -> None:
        return


ROUTES: Final = ("root", "block", "attention")
EXPECTED_ROUTE: Final = {
    "root": "decoder.root",
    "block": "decoder.block",
    "attention": "decoder.self-attention",
}
EXPECTED_PAGE: Final = {
    "root": "decoder-guide-root",
    "block": "decoder-guide-block",
    "attention": "decoder-guide-self-attention",
}


def _activate_route(browser: ChromeSession, route: str) -> list[ActionRecord]:
    records: list[ActionRecord] = []
    if route == "root":
        record_click(browser, records, "visual.root.embedding", NODE_SELECTORS["embedding"], ExpectedState("decoder.root", "token-embedding", "root-embeddings", "root-embeddings"))
        return records
    record_click(
        browser,
        records,
        "visual.root.block",
        NODE_SELECTORS["block"],
        ExpectedState(
            "decoder.block",
            None,
            None,
            "learning-route-title",
            heading_focus_delta=1,
        ),
    )
    browser.require_cdp().evaluate(
        browser.page_session,
        VISUAL_SETTLED,
        True,
    )
    if route == "block":
        record_click(browser, records, "visual.block.ln1", NODE_SELECTORS["ln1"], ExpectedState("decoder.block", "layer-norm-1", "block-layer-norm-1", "block-layer-norm-1"))
        return records
    record_click(
        browser,
        records,
        "visual.block.attention",
        NODE_SELECTORS["attention"],
        ExpectedState(
            "decoder.self-attention",
            None,
            None,
            "learning-route-title",
            heading_focus_delta=1,
        ),
    )
    browser.require_cdp().evaluate(
        browser.page_session,
        VISUAL_SETTLED,
        True,
    )
    record_click(browser, records, "visual.attention.softmax", NODE_SELECTORS["softmax"], ExpectedState("decoder.self-attention", "attention-softmax", "softmax", "softmax"))
    return records


def normalize_dom_text(text: str) -> str:
    return re.sub(r"\s+", " ", text).strip()


def _png_metadata(path: Path) -> dict[str, int | str | bool]:
    data = path.read_bytes()
    signature = data[:8]
    width, height = struct.unpack(">II", data[16:24])
    color_type = data[25]
    return {"signature": signature.hex(), "width": width, "height": height,
        "colorType": color_type, "alphaChannel": color_type in (4, 6),
        "fullyComposited": len(data) > 10_000, "bytes": len(data)}


def _capture_screen(request: ScreenCapture) -> None:
    browser, route = request.browser, request.route
    evidence, source_mtime_ns = request.config.evidence, request.config.source_mtime_ns
    width, height = request.viewport
    cdp = browser.require_cdp()
    session = browser.page_session
    cdp.send("Emulation.setDeviceMetricsOverride", {"width": width, "height": height, "deviceScaleFactor": 1, "mobile": False}, session)
    cdp.send("Emulation.setEmulatedMedia", {"features": [{"name": "prefers-reduced-motion", "value": "reduce"}]}, session)
    cdp.send("Page.addScriptToEvaluateOnNewDocument", {"source": INSTRUMENT_LEARNING_WORKSPACE}, session)
    browser.navigate(request.url)
    cdp.evaluate(session, READY_PROBE, True)
    cdp.evaluate(session, WORKSPACE_READY, True)
    runtime_evidence = prepare_runtime_evidence(browser)
    actions = _activate_route(browser, route)
    cdp.evaluate(session, VISUAL_SETTLED, True)
    cdp.evaluate(session, """(() => {
      const active = Array.from(document.getElementsByTagName('*'))
        .find(element => element.dataset.guideSectionId && element.dataset.active === 'true');
      if (active === undefined) return;
      const target = scrollY + active.getBoundingClientRect().top - 96;
      const maximum = Math.max(0, document.documentElement.scrollHeight - innerHeight);
      scrollTo({ top: Math.min(Math.max(0, target), maximum), behavior: 'instant' });
    })()""")
    cdp.evaluate(session, VISUAL_SETTLED, True)
    selected_scroll = cdp.evaluate(session, "scrollY", True)
    cdp.evaluate(session, "scrollTo({ top: 0, behavior: 'instant' })")
    cdp.evaluate(session, VISUAL_SETTLED, True)
    sticky_before = cdp.evaluate(session, STICKY_PROBE, True)
    cdp.evaluate(session, "scrollTo({ top: Math.max(0, document.documentElement.scrollHeight - innerHeight), behavior: 'instant' })")
    cdp.evaluate(session, VISUAL_SETTLED, True)
    sticky_after = cdp.evaluate(session, STICKY_PROBE, True)
    cdp.evaluate(session, f"scrollTo({{ top: {selected_scroll}, behavior: 'instant' }})")
    cdp.evaluate(session, VISUAL_SETTLED, True)
    probe = cdp.evaluate(session, VISUAL_PROBE, True)
    startup = state(browser)
    errors = browser_errors(browser)
    screen_id = f"{route}-{width}x{height}"
    png_path = evidence / f"{screen_id}.png"
    image = cdp.send("Page.captureScreenshot", {"format": "png", "captureBeyondViewport": False, "fromSurface": True}, session)["data"]
    png_path.write_bytes(base64.b64decode(image))
    image_meta = _png_metadata(png_path)
    lifecycle_status = document_status(browser)
    worker_ready_observed = "ready" in runtime_evidence["worker"]["responseTypes"]
    health: HealthMetrics = {"status": "ready" if worker_ready_observed else lifecycle_status,
        "lifecycleStatus": lifecycle_status, "workerReadyObserved": worker_ready_observed,
        "workerStarts": startup["workerStarts"], "consoleErrors": len(errors["console"]), "networkErrors": len(errors["network"]),
        "runtimeErrors": len(errors["runtime"]), "katexErrors": len(document_katex_errors(browser))}
    metrics = {"screenId": screen_id, "routeId": probe["routeId"], "profileId": probe["profileId"],
        "pageId": probe["pageId"], "viewport": {"width": width, "height": height}, "image": image_meta,
        "freshness": {"sourceMtimeNs": source_mtime_ns, "captureMtimeNs": png_path.stat().st_mtime_ns,
            "currentSource": png_path.stat().st_mtime_ns > source_mtime_ns},
        "layout": {"mode": probe["mode"], "diagramShare": probe["diagramShare"], "guideShare": probe["guideShare"],
            "documentOverflow": probe["documentOverflow"], "overflowOwners": probe["overflowOwners"],
            "unexpectedOverflowOwners": probe["unexpectedOverflowOwners"], "workspaceRect": probe["workspaceRect"],
            "bodyRect": probe["bodyRect"], "diagramRect": probe["diagramRect"], "guideRect": probe["guideRect"],
            "stickyBeforeScroll": sticky_before, "stickyAfterScroll": sticky_after,
            "stickyVisibleAfterScroll": sticky_after["visible"]},
        "typography": {"fontSize": probe["fontSize"], "lineHeight": probe["lineHeight"],
            "lineHeightRatio": probe["lineHeight"] / probe["fontSize"]}, "health": health,
        "errors": errors, "controls": {"targets": probe["targets"], "targetViolations": probe["targetViolations"]},
        "content": {"activeAccent": probe["activeAccent"], "outlineCount": probe["outlineCount"],
            "sectionControlCount": probe["sectionControlCount"], "runtimeFactsCount": probe["runtimeFactsCount"],
            "selectedOperationCount": probe["selectedOperationCount"], "pendingFactCount": probe["pendingFactCount"],
            "readyFactCount": probe["readyFactCount"], "runtimePresentationIds": probe["runtimePresentationIds"],
            "operationPresentationIds": probe["operationPresentationIds"]}}
    validation_metrics: VisualMetrics = {"routeId": probe["routeId"],
        "viewport": {"width": width, "height": height},
        "layout": {"mode": probe["mode"], "diagramShare": probe["diagramShare"],
            "guideShare": probe["guideShare"], "documentOverflow": probe["documentOverflow"],
            "unexpectedOverflowOwners": probe["unexpectedOverflowOwners"],
            "stickyVisibleAfterScroll": sticky_after["visible"]},
        "typography": {"fontSize": probe["fontSize"],
            "lineHeightRatio": probe["lineHeight"] / probe["fontSize"]},
        "health": health, "controls": {"targetViolations": probe["targetViolations"]},
        "content": {"outlineCount": probe["outlineCount"], "sectionControlCount": probe["sectionControlCount"],
            "runtimeFactsCount": probe["runtimeFactsCount"], "selectedOperationCount": probe["selectedOperationCount"],
            "pendingFactCount": probe["pendingFactCount"], "readyFactCount": probe["readyFactCount"]}}
    failures = list(request.config.validator(validation_metrics))
    if probe["routeId"] != EXPECTED_ROUTE[route] or probe["pageId"] != EXPECTED_PAGE[route] or probe["profileId"] != "decoder-only-fundamentals":
        failures.append("route/profile/page IDs do not match the requested screen")
    if image_meta["width"] != width or image_meta["height"] != height or image_meta["signature"] != "89504e470d0a1a0a":
        failures.append("PNG signature or dimensions do not match the viewport")
    if not metrics["freshness"]["currentSource"]:
        failures.append("capture is older than rendered source")
    (evidence / f"{screen_id}.actions.json").write_text(json.dumps(actions, ensure_ascii=False, indent=2) + "\n")
    (evidence / f"{screen_id}.runtime.json").write_text(json.dumps(runtime_evidence, ensure_ascii=False, indent=2) + "\n")
    (evidence / f"{screen_id}.metrics.json").write_text(json.dumps({**metrics, "failures": failures}, ensure_ascii=False, indent=2) + "\n")
    sections = [
        {**section, "text": normalize_dom_text(section["text"])}
        for section in probe["sections"]
    ]
    (evidence / f"{screen_id}.content.json").write_text(json.dumps({"routeId": probe["routeId"], "pageId": probe["pageId"],
        "outlineText": normalize_dom_text(probe["outlineText"]), "sections": sections,
        "guideText": normalize_dom_text(probe["guideText"])}, ensure_ascii=False, indent=2) + "\n")
    if failures:
        raise VisualMetricError(f"{screen_id}: {failures}")
    if route == "root" and width == 1440:
        capture_keyboard_live_evidence(browser, evidence)


def document_status(browser: ChromeSession) -> str:
    return browser.require_cdp().evaluate(browser.page_session, "document.getElementById('status')?.dataset.status ?? 'missing'", True)


def document_katex_errors(browser: ChromeSession) -> list[str]:
    return browser.require_cdp().evaluate(browser.page_session, "Array.from(document.getElementsByClassName('katex-error')).map(element => element.textContent ?? '')", True)


def verify_visual(config: VisualCaptureConfig) -> None:
    config.evidence.mkdir(parents=True, exist_ok=True)
    server = ThreadingHTTPServer(("127.0.0.1", 0), partial(QuietVisualHandler, directory=str(config.root.resolve())))
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    try:
        for route in ROUTES:
            for viewport in config.viewports:
                with ChromeSession() as browser:
                    url = lab_url(f"http://127.0.0.1:{server.server_port}", "/" if config.entry == "index.html" else "/transformer_viz/")
                    _capture_screen(ScreenCapture(browser, url, route, viewport, config))
    finally:
        server.shutdown()
        server.server_close()
        thread.join(timeout=10)
        (config.evidence / "cleanup.txt").write_text("All Chrome contexts closed; static server stopped; ephemeral port released.\n")
