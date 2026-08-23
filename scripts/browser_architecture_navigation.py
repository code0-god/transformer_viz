#!/usr/bin/env python3
# /// script
# requires-python = ">=3.12"
# dependencies = []
# ///
"""Verify architecture node affordance and Worker-free Block Detail navigation."""

from __future__ import annotations

import argparse
import base64
import threading
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Protocol

from browser_contract import dispatch_key
from browser_probes import READY_PROBE
from browser_session import ChromeSession
from browser_architecture_navigation_probes import (
    DETAIL_PROBE,
    INSTRUMENT_WORKER,
    ROOT_PROBE,
    SET_PROMPT,
)


class NavigationContractError(RuntimeError):
    """Architecture navigation violates its browser contract."""


class LogValue(Protocol):
    def __str__(self) -> str: ...


class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self, format: str, *args: LogValue) -> None:
        return


def settle(browser: ChromeSession) -> None:
    browser.require_cdp().evaluate(
        browser.page_session,
        """new Promise(resolve => requestAnimationFrame(() => {
          document.querySelectorAll(
            '.architecture-node-focus-outline, .architecture-node-drilldown-indicator',
          ).forEach(element => getComputedStyle(element).opacity);
          requestAnimationFrame(async () => {
            const animations = document.getAnimations().filter(animation => {
              const timing = animation.effect?.getComputedTiming();
              return timing && Number.isFinite(timing.endTime);
            });
            animations.forEach(animation => animation.finish());
            resolve();
          });
        }))""",
        True,
    )


def dispatch_click(browser: ChromeSession, selector: str) -> None:
    cdp = browser.require_cdp()
    session = browser.page_session
    cdp.evaluate(
        session,
        f"document.querySelector('{selector}').scrollIntoView({{ block: 'center', inline: 'center' }})",
    )
    settle(browser)
    point = cdp.evaluate(
        session,
        f"""(() => {{
          const box = document.querySelector('{selector}').getBoundingClientRect();
          return {{ x: box.left + box.width / 2, y: box.top + box.height / 2 }};
        }})()""",
        True,
    )
    params = {"x": point["x"], "y": point["y"], "button": "left", "clickCount": 1}
    cdp.send("Input.dispatchMouseEvent", {"type": "mouseMoved", **params}, session)
    cdp.send("Input.dispatchMouseEvent", {"type": "mousePressed", **params}, session)
    cdp.send("Input.dispatchMouseEvent", {"type": "mouseReleased", **params}, session)
    settle(browser)


def focus_by_tab(browser: ChromeSession, selector: str) -> None:
    cdp = browser.require_cdp()
    session = browser.page_session
    cdp.evaluate(session, "document.activeElement?.blur()")
    for _ in range(24):
        dispatch_key(cdp, session, "Tab", "Tab", 9)
        focused = cdp.evaluate(
            session,
            f"document.activeElement?.matches('{selector}') ?? false",
            True,
        )
        if focused:
            return
    raise NavigationContractError(f"Tab focus did not reach {selector}")


def capture(browser: ChromeSession, path: Path) -> None:
    image = browser.require_cdp().send(
        "Page.captureScreenshot",
        {"format": "png", "captureBeyondViewport": True},
        browser.page_session,
    )["data"]
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(base64.b64decode(image))


def require(condition: bool, message: str) -> None:
    if not condition:
        raise NavigationContractError(message)


def verify_navigation(
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
    require(initial["root"] and not initial["detail"], f"initial route: {initial}")
    require(initial["capability"] == "drill-down", f"block capability: {initial}")
    require(initial["role"] == "button" and initial["tabIndex"] == "0", f"block a11y: {initial}")
    require(initial["outlineFill"] == "none", f"focus overlay covered node content: {initial}")
    require(initial["indicatorOpacity"] == 0 or mobile, f"normal indicator: {initial}")

    focus_by_tab(browser, '[data-node-id="transformer-block"]')
    settle(browser)
    focused = cdp.evaluate(session, ROOT_PROBE, True)
    require(focused["indicatorOpacity"] == 1, f"focus affordance: {focused}")

    cdp.evaluate(session, "document.activeElement.blur()")
    dispatch_click(browser, '[data-node-id="token-embedding"]')
    selected = cdp.evaluate(session, ROOT_PROBE, True)
    require(selected["root"] and not selected["detail"], f"selectable node navigated: {selected}")
    require(selected["workerPosts"] == initial["workerPosts"], f"selection called Worker: {selected}")

    if evidence is not None and not mobile:
        cdp.evaluate(
            session,
            """document.querySelector('[data-node-id="transformer-block"]')
              .scrollIntoView({ block: 'center', inline: 'center' })""",
        )
        settle(browser)
        point = cdp.evaluate(
            session,
            """(() => {
              const box = document.querySelector('[data-node-id="transformer-block"]')
                .getBoundingClientRect();
              return { x: box.left + box.width / 2, y: box.top + box.height / 2 };
            })()""",
            True,
        )
        cdp.send("Input.dispatchMouseEvent", {"type": "mouseMoved", **point}, session)
        settle(browser)
        hover = cdp.evaluate(session, ROOT_PROBE, True)
        require(hover["indicatorOpacity"] == 1, f"hover affordance: {hover}")
        capture(browser, evidence / "root-block-hover.png")

    dispatch_click(browser, '[data-node-id="transformer-block"]')
    detail = cdp.evaluate(session, DETAIL_PROBE, True)
    require(not detail["root"] and detail["detail"], f"detail route: {detail}")
    require(detail["selectedLayer"] == 0 and detail["layerButtons"] == 2, f"layer config: {detail}")
    require(detail["breadcrumb"] == "Transformer Block × 2", f"breadcrumb: {detail}")
    require(detail["breadcrumbCurrent"] == "page", f"breadcrumb current: {detail}")
    require("M 390 108 H 700 V 382 H 412" == detail["firstPath"], f"residual 1: {detail}")
    require("M 390 518 H 700 V 790 H 412" == detail["secondPath"], f"residual 2: {detail}")
    require(detail["firstJunctionY"] == 108 and detail["secondJunctionY"] == 518, f"junctions: {detail}")
    require(detail["internalNodeCount"] == 6, f"internal node count: {detail}")
    require(all(role == "button" for role in detail["internalRoles"]), f"internal a11y: {detail}")
    require(not detail["forbiddenDetail"], f"forbidden depth rendered: {detail}")
    require(detail["prompt"] == initial["prompt"], f"prompt changed: {detail}")
    require(detail["workerPosts"] == initial["workerPosts"], f"navigation called Worker: {detail}")
    require(detail["documentOverflow"] == 0, f"document overflow: {detail}")
    if mobile:
        require(detail["localOverflow"] > 0, f"mobile detail lacks local overflow: {detail}")
    if evidence is not None:
        cdp.send(
            "Input.dispatchMouseEvent",
            {"type": "mouseMoved", "x": 1, "y": 1},
            session,
        )
        settle(browser)
        capture(browser, evidence / ("block-detail-mobile.png" if mobile else "block-detail.png"))

    dispatch_click(browser, '[data-testid="architecture-breadcrumb-gpt"]')
    returned = cdp.evaluate(session, ROOT_PROBE, True)
    require(returned["root"] and returned["prompt"] == initial["prompt"], f"root return: {returned}")
    require(returned["workerPosts"] == initial["workerPosts"], f"back called Worker: {returned}")

    focus_by_tab(browser, '[data-node-id="transformer-block"]')
    settle(browser)
    dispatch_key(cdp, session, "Enter", "Enter", 13)
    settle(browser)
    require(cdp.evaluate(session, DETAIL_PROBE, True)["detail"], "Enter did not open detail")


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
            label = "root" if base == "/" else "subpath"
            for mobile in (False, True):
                evidence = args.evidence if label == "root" else None
                with ChromeSession() as browser:
                    verify_navigation(browser, origin + base, mobile, evidence)
            print(f"{base} architecture navigation desktop/mobile: PASS")
    finally:
        server.shutdown()
        server.server_close()
        thread.join(timeout=10)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
