"""Real-keyboard mode, Inspector, drawer, sticky, and mobile source-order checks."""

from __future__ import annotations

from typing import Any

from browser_cdp import Cdp
from browser_contract import dispatch_key
from browser_probes import FOCUS_PROBE, SCROLL_PROBE

SETTLE = r"""expression => new Promise((resolve, reject) => {
  const timeout = setTimeout(() => reject('state settle timeout'), 3000);
  requestAnimationFrame(() => requestAnimationFrame(() => {
    clearTimeout(timeout);
    resolve(expression());
  }));
})"""


def settle(cdp: Cdp, session: str, expression: str) -> Any:
    return cdp.evaluate(session, f"({SETTLE})(() => ({expression}))", True)


def pure_navigation_contract(cdp: Cdp, session: str, worker_posts: int) -> list[str]:
    failures: list[str] = []
    selectors = [
        "#mode-guided", "#mode-explore",
        "#tab-explanation", "#tab-tensor", "#tab-source",
        *[f"[data-testid='curriculum-group-{slug}']" for slug in
          ("input", "transformer", "prediction", "generation")],
        *[f"#curriculum-stage-{index}" for index in range(21)],
        *[f".speed-buttons button:nth-child({index})" for index in range(1, 4)],
    ]
    for selector in selectors:
        cdp.evaluate(
            session,
            f"(()=>{{const e=document.querySelector({selector!r});if(e)e.click();}})()",
        )
        result = settle(
            cdp,
            session,
            f"(()=>{{const e=document.querySelector({selector!r});if(!e)return {{missing:true}};"
            "e.focus();const r=e.getBoundingClientRect();return {missing:false,posts:window.__phase9WorkerPosts,"
            "focused:document.activeElement===e,visible:r.top>=0&&r.bottom<=innerHeight&&r.left>=0&&r.right<=innerWidth};})()",
        )
        if result.get("missing") or result.get("posts") != worker_posts or not result.get("focused") or not result.get("visible"):
            failures.append(f"pure navigation lost traffic/focus for {selector}: {result}")
    autoplay = settle(
        cdp,
        session,
        "(()=>{const e=document.querySelector('.play-toggle');e.click();e.click();e.focus();"
        "const r=e.getBoundingClientRect();return {posts:window.__phase9WorkerPosts,focused:document.activeElement===e,"
        "visible:r.top>=0&&r.bottom<=innerHeight};})()",
    )
    if autoplay != {"posts": worker_posts, "focused": True, "visible": True}:
        failures.append(f"autoplay toggle changed traffic/focus: {autoplay}")
    active = settle(
        cdp,
        session,
        "(()=>{const e=document.querySelector('.stage-reel:not([hidden]) [aria-current=\"step\"]');"
        "const r=e.getBoundingClientRect(),p=e.parentElement.getBoundingClientRect();return r.left>=p.left-1&&r.right<=p.right+1})()",
    )
    if not active:
        failures.append("active step was not revealed after exhaustive rail navigation")
    return failures


def keyboard_contract(
    cdp: Cdp, session: str, state: dict[str, Any], width: int
) -> list[str]:
    failures: list[str] = []
    cdp.evaluate(session, "document.querySelector('#mode-guided').focus()")
    dispatch_key(cdp, session, "End", "End", 35)
    mode_end = settle(
        cdp,
        session,
        "({selected:document.querySelector('#mode-explore').getAttribute('aria-selected'),"
        "focus:document.activeElement.id,panel:document.querySelector('#shared-workspace').getAttribute('aria-labelledby')})",
    )
    if mode_end != {
        "selected": "true",
        "focus": "mode-explore",
        "panel": "mode-explore",
    }:
        failures.append(f"mode End keyboard contract failed: {mode_end}")
    dispatch_key(cdp, session, "Home", "Home", 36)
    if settle(cdp, session, "document.activeElement.id") != "mode-guided":
        failures.append("mode Home did not restore Guided focus")
    cdp.evaluate(session, "document.querySelector('#tab-explanation').focus()")
    failures.extend(inspector_keys(cdp, session))
    if width < 1280:
        failures.extend(drawer_keys(cdp, session, state["workerPosts"]))
    failures.extend(pure_navigation_contract(cdp, session, state["workerPosts"]))
    return failures


def inspector_keys(cdp: Cdp, session: str) -> list[str]:
    failures: list[str] = []
    dispatch_key(cdp, session, "ArrowRight", "ArrowRight", 39)
    right = settle(
        cdp,
        session,
        "({selected:document.querySelector('#tab-tensor').getAttribute('aria-selected'),"
        "focus:document.activeElement.id,hidden:document.querySelector('#panel-tensor').hidden})",
    )
    if right != {"selected": "true", "focus": "tab-tensor", "hidden": False}:
        failures.append(f"Inspector ArrowRight contract failed: {right}")
    dispatch_key(cdp, session, "End", "End", 35)
    end = settle(
        cdp,
        session,
        "({selected:document.querySelector('#tab-source').getAttribute('aria-selected'),"
        "focus:document.activeElement.id,hidden:document.querySelector('#panel-source').hidden})",
    )
    if end != {"selected": "true", "focus": "tab-source", "hidden": False}:
        failures.append(f"Inspector End contract failed: {end}")
    dispatch_key(cdp, session, "Home", "Home", 36)
    if settle(cdp, session, "document.activeElement.id") != "tab-explanation":
        failures.append("Inspector Home contract failed")
    return failures


def drawer_keys(cdp: Cdp, session: str, worker_posts: int) -> list[str]:
    failures: list[str] = []

    def open_drawer() -> None:
        opened = cdp.evaluate(
            session,
            r"""new Promise((resolve, reject) => {
              const body = document.querySelector('.model-map-body');
              const toggle = document.querySelector('.model-map-toggle');
              const timeout = setTimeout(() => finish('drawer open timeout'), 3000);
              const observer = new MutationObserver(check);
              function finish(error) {
                clearTimeout(timeout);
                observer.disconnect();
                error ? reject(error) : resolve(true);
              }
              function check() { if (!body.hidden) finish(); }
              observer.observe(body, {attributes: true, attributeFilter: ['hidden']});
              toggle.focus();
              if (body.hidden) toggle.click();
              check();
            })""",
            True,
        )
        if opened is not True:
            failures.append(f"architecture drawer was not open before subcase: {opened}")

    def drawer_state() -> dict[str, Any]:
        return settle(
            cdp,
            session,
            "({hidden:document.querySelector('.model-map-body').hidden,"
            "posts:window.__phase9WorkerPosts,inMap:Boolean(document.activeElement.closest('.model-map')),"
            "toggle:document.activeElement.classList.contains('model-map-toggle'),"
            "target:{tag:document.activeElement.tagName,classes:document.activeElement.className},"
            "rect:(()=>{const r=document.activeElement.getBoundingClientRect();return {top:r.top,bottom:r.bottom}})(),"
            "visible:(()=>{const r=document.activeElement.getBoundingClientRect();return r.top>=0&&r.bottom<=innerHeight})()})",
        )

    open_drawer()
    opened = drawer_state()
    if not (not opened["hidden"] and opened["posts"] == worker_posts and opened["inMap"] and opened["toggle"] and opened["visible"]):
        failures.append(f"keyboard drawer open changed traffic/focus/state: {opened}")
    cdp.evaluate(session, "[...document.querySelectorAll('.model-map-body button')].at(-1).focus()")
    dispatch_key(cdp, session, "Tab", "Tab", 9)
    forward = drawer_state()
    if not forward["hidden"] or forward["inMap"] or not forward["visible"] or forward["posts"] != worker_posts:
        failures.append(f"forward Tab did not close drawer before visible outside focus: {forward}")
    open_drawer()
    cdp.send("Input.dispatchKeyEvent", {"type": "keyDown", "key": "Tab", "code": "Tab", "windowsVirtualKeyCode": 9, "modifiers": 8}, session)
    cdp.send("Input.dispatchKeyEvent", {"type": "keyUp", "key": "Tab", "code": "Tab", "windowsVirtualKeyCode": 9, "modifiers": 8}, session)
    reverse = drawer_state()
    if not reverse["hidden"] or reverse["inMap"] or not reverse["visible"] or reverse["posts"] != worker_posts:
        failures.append(f"reverse Shift+Tab did not close drawer before visible outside focus: {reverse}")
    open_drawer()
    cdp.evaluate(session, "[...document.querySelectorAll('.model-map-body button')].at(-1).focus()")
    dispatch_key(cdp, session, "Tab", "Tab", 9)
    cdp.send("Input.dispatchKeyEvent", {"type": "keyDown", "key": "Tab", "code": "Tab", "windowsVirtualKeyCode": 9, "modifiers": 8}, session)
    cdp.send("Input.dispatchKeyEvent", {"type": "keyUp", "key": "Tab", "code": "Tab", "windowsVirtualKeyCode": 9, "modifiers": 8}, session)
    rapid = cdp.evaluate(
        session,
        "({hidden:document.querySelector('.model-map-body').hidden,"
        "toggle:document.activeElement.classList.contains('model-map-toggle'),"
        "posts:window.__phase9WorkerPosts})",
    )
    if rapid != {"hidden": True, "toggle": True, "posts": worker_posts}:
        failures.append(f"rapid Tab/Shift+Tab focus was stolen: {rapid}")
    open_drawer()
    cdp.evaluate(session, "document.querySelector('.model-map-body button').focus()")
    dispatch_key(cdp, session, "Escape", "Escape", 27)
    escaped = drawer_state()
    if not escaped["hidden"] or not escaped["toggle"] or not escaped["visible"] or escaped["posts"] != worker_posts:
        failures.append(f"Escape did not close and restore toggle focus: {escaped}")
    open_drawer()
    cdp.evaluate(session, "document.querySelector('.architecture-node').focus();document.querySelector('.architecture-node').click()")
    selected = drawer_state()
    if not selected["hidden"] or not selected["toggle"] or not selected["visible"] or selected["posts"] != worker_posts:
        failures.append(f"node selection did not close drawer without traffic/focus loss: {selected}")
    return failures

def mobile_contract(cdp: Cdp, session: str, width: int, height: int) -> list[str]:
    failures: list[str] = []
    nodes = cdp.send("Accessibility.getFullAXTree", session_id=session)["nodes"]
    landmarks = [
        node
        for node in nodes
        if node.get("role", {}).get("value") == "navigation"
        and "학습 경로 · 21 steps" in node.get("name", {}).get("value", "")
    ]
    if len(landmarks) != 1:
        failures.append(
            f"expected one curriculum navigation landmark, got {len(landmarks)}"
        )
    for selector in (".stage-canvas", ".inspector"):
        probe = cdp.evaluate(session, f"({SCROLL_PROBE})('{selector}')", True)
        pinned = height - 32 <= probe["bottom"] <= height + 1
        inside = probe["top"] >= 0 and probe["left"] >= 0 and probe["right"] <= width
        if not pinned or not inside or probe["position"] != "sticky":
            failures.append(f"transport is not bottom-pinned at {selector}: {probe}")
    failures.extend(tab_region_order(cdp, session))
    return failures


def tab_region_order(cdp: Cdp, session: str) -> list[str]:
    failures: list[str] = []
    cdp.evaluate(
        session,
        "document.querySelector('.rail-transport button:not(:disabled)').focus()",
    )
    regions = ["transport"]
    for index in range(80):
        dispatch_key(cdp, session, "Tab", "Tab", 9)
        focus = cdp.evaluate(session, FOCUS_PROBE, True)
        if focus["interactive"] and not focus["visible"]:
            failures.append(f"mobile keyboard focus {index + 1} is obscured: {focus}")
            break
        region = focus["region"]
        if region != "other" and region != regions[-1]:
            regions.append(region)
        if region == "curriculum":
            break
    expected = ["transport", "map", "inspector", "curriculum"]
    print(f"Sequential mobile Tab regions: {regions}")
    if regions != expected:
        failures.append(
            f"sequential Tab region order is {regions}, expected {expected}"
        )
    return failures
