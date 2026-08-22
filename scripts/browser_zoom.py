"""True Chrome page zoom plus minimum-window and 195px reflow proof."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from browser_contract import failures_for
from browser_contrast import contrast_contract
from browser_keyboard import keyboard_contract, settle
from browser_probes import READY_PROBE, STATE_PROBE
from browser_session import ChromeSession


@dataclass(frozen=True, slots=True)
class ZoomContractError(Exception):
    """Report a failed browser zoom verifier boundary."""

    detail: str

    def __str__(self) -> str:
        return self.detail


_METRICS = (
    "({innerWidth,innerHeight,devicePixelRatio,docW:document.documentElement.scrollWidth,"
    "controls:[...document.querySelectorAll('.generation-form input,.generation-form select,.generation-form textarea,.generation-actions button')]"
    ".every(e=>{const r=e.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth})})"
)


def set_browser_zoom(browser: ChromeSession, value: str) -> None:
    cdp = browser.require_cdp()
    session = browser.page_session
    browser.navigate("chrome://settings/appearance")
    cdp.evaluate(
        session,
        "new Promise(resolve => document.readyState === 'complete' "
        "? requestAnimationFrame(() => requestAnimationFrame(resolve)) "
        ": addEventListener('load', () => requestAnimationFrame(() => requestAnimationFrame(resolve)), {once:true}))",
        True,
    )
    changed = cdp.evaluate(
        session,
        f"""(() => {{
          let zoom;
          function walk(root) {{
            for (const element of root.querySelectorAll('*')) {{
              if (element.id === 'zoomLevel') zoom = element;
              if (element.shadowRoot) walk(element.shadowRoot);
            }}
          }}
          walk(document);
          if (!zoom) return false;
          zoom.value = {value!r};
          zoom.dispatchEvent(new Event('change', {{bubbles: true, composed: true}}));
          return zoom.value === {value!r};
        }})()""",
    )
    if not changed:
        raise ZoomContractError(
            detail="Chrome Settings page zoom control was not available"
        )


def app_metrics(browser: ChromeSession, url: str) -> dict[str, Any]:
    cdp = browser.require_cdp()
    browser.navigate(url)
    cdp.evaluate(browser.page_session, READY_PROBE, True)
    result = settle(cdp, browser.page_session, _METRICS)
    if not isinstance(result, dict):
        raise ZoomContractError(detail="page zoom metrics were not an object")
    return result


def zoom_generation_interactions(browser: ChromeSession) -> dict[str, Any]:
    probe = r"""new Promise((resolve, reject) => {
      const timeout = setTimeout(() => finish('zoom generation timeout'), 30000);
      const observer = new MutationObserver(check);
      let phase = 'stop';
      function finish(error) {
        clearTimeout(timeout);
        observer.disconnect();
        if (error) reject(error); else resolve({
          stopped: true,
          replayReady: Boolean(document.querySelector('.context-token[data-trace-ready="true"]')),
          generated: document.querySelectorAll('.generated-token').length,
          posts: window.__phase9WorkerPosts
        });
      }
      function setInput(input, value) {
        Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, value);
        input.dispatchEvent(new Event('input', {bubbles: true}));
      }
      function check() {
        if (document.querySelector('#status')?.dataset.status === 'error')
          return finish(`zoom generation error: ${document.querySelector('#status').textContent}`);
        const status = document.querySelector('[data-testid="generation-status"]')?.textContent || '';
        const reason = document.querySelector('[data-testid="generation-usage"]')?.dataset.stopReason;
        if (phase === 'stop' && status.includes('스트리밍')) {
          phase = 'stopping';
          document.querySelector('[data-testid="stop-generation"]').click();
        } else if (phase === 'stopping' && reason === 'user_stopped') {
          phase = 'generate';
          setInput(document.querySelector('#max-new-tokens'), '2');
          document.querySelector('[data-testid="generate"]').click();
        } else if (phase === 'generate' && status.includes('완료')
                   && document.querySelectorAll('.generated-token').length >= 2) {
          phase = 'replay';
          [...document.querySelectorAll('.generated-token')].at(-1).click();
        } else if (phase === 'replay'
                   && document.querySelector('.context-token[data-trace-ready="true"]')) finish();
      }
      observer.observe(document.documentElement,
        {subtree: true, childList: true, attributes: true, characterData: true});
      document.querySelector('#mode-guided').focus();
      document.querySelector('[data-testid="generate"]').click();
      check();
    })"""
    result = browser.require_cdp().evaluate(browser.page_session, probe, True)
    if not isinstance(result, dict):
        raise ZoomContractError(
            detail="zoom generation interaction result was not an object"
        )
    return result


def actual_zoom_contract(
    browser: ChromeSession, url: str, physical: tuple[int, int]
) -> tuple[dict[str, Any], list[str]]:
    cdp = browser.require_cdp()
    session = browser.page_session
    cdp.send("Emulation.clearDeviceMetricsOverride", session_id=session)
    window = cdp.send("Browser.getWindowForTarget", {"targetId": browser.target_id})
    window_id = window["windowId"]
    cdp.send(
        "Browser.setWindowBounds",
        {
            "windowId": window_id,
            "bounds": {
                "width": physical[0],
                "height": physical[1],
                "windowState": "normal",
            },
        },
    )
    actual_bounds = cdp.send("Browser.getWindowBounds", {"windowId": window_id})[
        "bounds"
    ]
    before = app_metrics(browser, url)
    set_browser_zoom(browser, "2")
    actual_zoom = app_metrics(browser, url)
    effective = actual_zoom
    layout_195 = None
    if physical[0] == 390:
        cdp.send(
            "Emulation.setDeviceMetricsOverride",
            {"width": 390, "height": 844, "deviceScaleFactor": 1, "mobile": False},
            session,
        )
        layout_195 = app_metrics(browser, url)
        effective = layout_195
    state = cdp.evaluate(session, STATE_PROBE)
    failures = failures_for((effective["innerWidth"], effective["innerHeight"]), state)
    if actual_zoom["innerWidth"] >= before["innerWidth"] * 0.65:
        failures.append(
            f"browser zoom did not halve CSS viewport: {before=}, {actual_zoom=}"
        )
    if actual_zoom["devicePixelRatio"] <= before["devicePixelRatio"]:
        failures.append(
            f"browser zoom did not increase devicePixelRatio: {before=}, {actual_zoom=}"
        )
    if layout_195 is not None and layout_195["innerWidth"] != 195:
        failures.append(
            f"200% zoom plus 390px layout did not prove 195px: {layout_195}"
        )
    if effective["docW"] > effective["innerWidth"] or not effective["controls"]:
        failures.append(f"actual 200% zoom clips or overflows: {effective}")
    failures.extend(keyboard_contract(cdp, session, state, effective["innerWidth"]))
    generation = zoom_generation_interactions(browser)
    failures.extend(contrast_contract(cdp, session))
    if (
        not generation["stopped"]
        or not generation["replayReady"]
        or generation["generated"] < 2
    ):
        failures.append(f"zoom Generate/Stop/replay journey failed: {generation}")
    cdp.send("Emulation.clearDeviceMetricsOverride", session_id=session)
    set_browser_zoom(browser, "1")
    restored = app_metrics(browser, url)
    if (restored["innerWidth"], restored["devicePixelRatio"]) != (
        before["innerWidth"],
        before["devicePixelRatio"],
    ):
        failures.append(f"browser zoom reset failed: {before=}, {restored=}")
    return {
        "physicalTargetRequested": physical,
        "actualWindowBounds": actual_bounds,
        "before": before,
        "actualWindowZoom200": actual_zoom,
        "layout195AtActualZoom200": layout_195,
        "zoomInteractions": generation,
        "reset": restored,
    }, failures
