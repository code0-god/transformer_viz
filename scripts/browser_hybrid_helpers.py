"""Deterministic real-Chrome helpers for hybrid visualization QA."""

from __future__ import annotations

import json
from typing import cast

from browser_cdp import CdpError
from browser_learning_workspace_probes import VISUAL_SETTLED
from browser_session import ChromeSession


class HybridBrowserError(RuntimeError):
    """Hybrid browser behavior violated its production contract."""


def evaluate_dict(
    browser: ChromeSession,
    expression: str,
) -> dict[str, object]:
    result = browser.require_cdp().evaluate(
        browser.page_session,
        expression,
        True,
    )
    if not isinstance(result, dict):
        raise HybridBrowserError(f"expected object result: {result!r}")
    return cast(dict[str, object], result)


def evaluate_int(browser: ChromeSession, expression: str) -> int:
    result = browser.require_cdp().evaluate(
        browser.page_session,
        expression,
        True,
    )
    if not isinstance(result, int):
        raise HybridBrowserError(f"expected integer result: {result!r}")
    return result


def _number_field(data: dict[str, object], key: str) -> float:
    value = data.get(key)
    if not isinstance(value, int | float):
        raise HybridBrowserError(f"expected numeric {key}: {value!r}")
    return float(value)


def wait_for(
    browser: ChromeSession,
    condition: str,
    label: str,
    action: str = "",
) -> None:
    message = json.dumps(f"{label} timeout")
    expression = f"""new Promise((resolve, reject) => {{
      const timeout = setTimeout(() => finish(new Error({message})), 30000);
      let observer;
      const finish = error => {{
        clearTimeout(timeout);
        observer?.disconnect();
        error ? reject(error) : requestAnimationFrame(
          () => requestAnimationFrame(resolve),
        );
      }};
      const check = () => {{
        try {{
          if ({condition}) finish();
        }} catch (error) {{
          finish(error);
        }}
      }};
      observer = new MutationObserver(check);
      observer.observe(document.documentElement, {{
        subtree: true,
        childList: true,
        attributes: true,
      }});
      {action}
      check();
    }})"""
    try:
        browser.require_cdp().evaluate(
            browser.page_session,
            expression,
            True,
        )
    except CdpError as error:
        diagnostics = evaluate_dict(
            browser,
            """(() => ({
              states: Array.from(
                document.querySelectorAll('[data-visualization-state]'),
              ).map(element => ({
                state: element.getAttribute('data-visualization-state'),
                text: element.textContent?.trim() ?? '',
              })),
              scoreState: document.querySelector('[data-score-matrix-state]')
                ?.getAttribute('data-score-matrix-state') ?? null,
              canvasCount: document.querySelectorAll('canvas').length,
            }))()""",
        )
        raise HybridBrowserError(f"{label}: {diagnostics}") from error


def navigate_hash(
    browser: ChromeSession,
    fragment: str,
    condition: str,
    label: str,
) -> None:
    wait_for(
        browser,
        condition,
        label,
        f"location.hash = {json.dumps(fragment)};",
    )


def settle(browser: ChromeSession) -> None:
    browser.require_cdp().evaluate(
        browser.page_session,
        VISUAL_SETTLED,
        True,
    )


def _arm_wait(browser: ChromeSession, condition: str, label: str) -> None:
    message = json.dumps(f"{label} timeout")
    browser.require_cdp().evaluate(
        browser.page_session,
        f"""window.__hybridWait = new Promise((resolve, reject) => {{
          const timeout = setTimeout(
            () => finish(new Error({message})),
            30000,
          );
          let observer;
          const finish = error => {{
            clearTimeout(timeout);
            observer?.disconnect();
            error ? reject(error) : requestAnimationFrame(
              () => requestAnimationFrame(resolve),
            );
          }};
          const check = () => {{
            try {{
              if ({condition}) finish();
            }} catch (error) {{
              finish(error);
            }}
          }};
          observer = new MutationObserver(check);
          observer.observe(document.documentElement, {{
            subtree: true,
            childList: true,
            attributes: true,
          }});
          check();
        }});""",
    )


def pointer_click(
    browser: ChromeSession,
    target_expression: str,
    *,
    condition: str | None = None,
    label: str = "pointer action",
) -> None:
    settle(browser)
    if condition is not None:
        _arm_wait(browser, condition, label)
    point = evaluate_dict(
        browser,
        f"""(() => {{
          const target = {target_expression};
          if (!(target instanceof Element))
            throw new Error('missing pointer target');
          target.scrollIntoView({{ block: 'nearest', inline: 'nearest' }});
          const box = target.getBoundingClientRect();
          return {{ x: box.left + box.width / 2, y: box.top + box.height / 2 }};
        }})()""",
    )
    params = {
        "x": _number_field(point, "x"),
        "y": _number_field(point, "y"),
        "button": "left",
        "clickCount": 1,
    }
    cdp = browser.require_cdp()
    session = browser.page_session
    cdp.send("Input.dispatchMouseEvent", {"type": "mouseMoved", **params}, session)
    cdp.send("Input.dispatchMouseEvent", {"type": "mousePressed", **params}, session)
    cdp.send("Input.dispatchMouseEvent", {"type": "mouseReleased", **params}, session)
    if condition is not None:
        cdp.evaluate(session, "window.__hybridWait", True)
    else:
        settle(browser)
