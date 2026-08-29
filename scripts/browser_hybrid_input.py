"""Real pointer, drag, and wheel input for hybrid browser QA."""

from __future__ import annotations

from browser_hybrid_capture import screenshot_hash
from browser_hybrid_helpers import evaluate_dict, settle
from browser_hybrid_helpers import HybridBrowserError
from browser_session import ChromeSession


def _number_field(data: dict[str, object], key: str) -> float:
    value = data.get(key)
    if not isinstance(value, int | float):
        raise TypeError(f"expected numeric {key}: {value!r}")
    return float(value)


def drag_target(
    browser: ChromeSession,
    *,
    target_expression: str,
    button: str,
    delta_x: float,
    delta_y: float,
) -> None:
    point = evaluate_dict(
        browser,
        f"""(() => {{
          const target = {target_expression};
          if (!(target instanceof Element))
            throw new Error('drag target missing');
          const box = target.getBoundingClientRect();
          return {{ x: box.left + box.width / 2, y: box.top + box.height / 2 }};
        }})()""",
    )
    x = _number_field(point, "x")
    y = _number_field(point, "y")
    params = {"x": x, "y": y, "button": button, "clickCount": 1}
    cdp = browser.require_cdp()
    session = browser.page_session
    cdp.send("Input.dispatchMouseEvent", {"type": "mouseMoved", **params}, session)
    cdp.send("Input.dispatchMouseEvent", {"type": "mousePressed", **params}, session)
    cdp.send(
        "Input.dispatchMouseEvent",
        {
            "type": "mouseMoved",
            "x": x + delta_x,
            "y": y + delta_y,
            "button": button,
            "buttons": 1 if button == "left" else 2,
        },
        session,
    )
    cdp.send(
        "Input.dispatchMouseEvent",
        {
            "type": "mouseReleased",
            "x": x + delta_x,
            "y": y + delta_y,
            "button": button,
            "clickCount": 1,
        },
        session,
    )
    settle(browser)


def drag_canvas(
    browser: ChromeSession,
    *,
    button: str,
    delta_x: float,
    delta_y: float,
) -> None:
    drag_target(
        browser,
        target_expression=(
            "document.querySelector('.score-matrix-canvas canvas')"
        ),
        button=button,
        delta_x=delta_x,
        delta_y=delta_y,
    )


def wheel_target(
    browser: ChromeSession,
    *,
    target_expression: str,
    delta_y: float,
    modifiers: int = 0,
) -> None:
    point = evaluate_dict(
        browser,
        f"""(() => {{
          const target = {target_expression};
          if (!(target instanceof Element))
            throw new Error('wheel target missing');
          const box = target.getBoundingClientRect();
          return {{ x: box.left + box.width / 2, y: box.top + box.height / 2 }};
        }})()""",
    )
    browser.require_cdp().send(
        "Input.dispatchMouseEvent",
        {
            "type": "mouseWheel",
            "x": _number_field(point, "x"),
            "y": _number_field(point, "y"),
            "deltaX": 0,
            "deltaY": delta_y,
            "modifiers": modifiers,
        },
        browser.page_session,
    )
    settle(browser)


def select_canvas_cell(browser: ChromeSession) -> dict[str, object]:
    bounds = evaluate_dict(
        browser,
        """(() => {
          const canvas = document.querySelector('.score-matrix-canvas canvas');
          if (!(canvas instanceof HTMLCanvasElement))
            throw new Error('score canvas missing');
          const box = canvas.getBoundingClientRect();
          return {
            left: box.left,
            top: box.top,
            width: box.width,
            height: box.height,
            right: box.right,
          };
        })()""",
    )
    left = _number_field(bounds, "left")
    top = _number_field(bounds, "top")
    width = _number_field(bounds, "width")
    height = _number_field(bounds, "height")
    initial_hash = screenshot_hash(browser)
    cdp = browser.require_cdp()
    session = browser.page_session
    for y_ratio in (0.3, 0.4, 0.5, 0.6, 0.7):
        for x_ratio in (0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8):
            x = left + width * x_ratio
            y = top + height * y_ratio
            params = {
                "x": x,
                "y": y,
                "button": "left",
                "clickCount": 1,
            }
            cdp.send(
                "Input.dispatchMouseEvent",
                {"type": "mouseMoved", **params},
                session,
            )
            settle(browser)
            hover_changed = screenshot_hash(browser) != initial_hash
            cdp.send(
                "Input.dispatchMouseEvent",
                {"type": "mousePressed", **params},
                session,
            )
            cdp.send(
                "Input.dispatchMouseEvent",
                {"type": "mouseReleased", **params},
                session,
            )
            settle(browser)
            selected = cdp.evaluate(
                session,
                """(() => {
                  const selection = document.querySelector(
                    '.score-matrix-selection--primary',
                  );
                  return selection?.getAttribute('data-selected') === 'true'
                    ? selection.textContent?.trim() ?? ''
                    : '';
                })()""",
                True,
            )
            if not isinstance(selected, str) or selected == "":
                continue
            cdp.send(
                "Input.dispatchMouseEvent",
                {
                    "type": "mouseMoved",
                    "x": _number_field(bounds, "right") + 8,
                    "y": top,
                    "button": "none",
                },
                session,
            )
            settle(browser)
            persisted = cdp.evaluate(
                session,
                """(() => {
                  const selection = document.querySelector(
                    '.score-matrix-selection--primary',
                  );
                  return selection?.getAttribute('data-selected') === 'true'
                    ? selection.textContent?.trim() ?? ''
                    : '';
                })()""",
                True,
            )
            if persisted != selected:
                raise HybridBrowserError("Canvas selection did not persist")
            return {
                "hoverChanged": hover_changed,
                "selectionPersisted": True,
                "summary": selected,
            }
    raise HybridBrowserError("No Score Matrix cell accepted a pointer click")
