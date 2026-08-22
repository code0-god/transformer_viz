"""Architecture drawer keyboard interaction verifier."""

from __future__ import annotations

from typing import Any

from browser_cdp import Cdp
from browser_contract import dispatch_key

SETTLE = r"""expression => new Promise((resolve, reject) => {
  const timeout = setTimeout(() => reject('state settle timeout'), 3000);
  requestAnimationFrame(() => requestAnimationFrame(() => {
    clearTimeout(timeout);
    resolve(expression());
  }));
})"""


def settle(cdp: Cdp, session: str, expression: str) -> Any:
    return cdp.evaluate(session, f"({SETTLE})(() => ({expression}))", True)


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
            failures.append(
                f"architecture drawer was not open before subcase: {opened}"
            )

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
    if not (
        not opened["hidden"]
        and opened["posts"] == worker_posts
        and opened["inMap"]
        and opened["toggle"]
        and opened["visible"]
    ):
        failures.append(f"keyboard drawer open changed traffic/focus/state: {opened}")
    cdp.evaluate(
        session,
        "[...document.querySelectorAll('.model-map-body button')].at(-1).focus()",
    )
    dispatch_key(cdp, session, "Tab", "Tab", 9)
    forward = drawer_state()
    if (
        not forward["hidden"]
        or forward["inMap"]
        or not forward["visible"]
        or forward["posts"] != worker_posts
    ):
        failures.append(
            f"forward Tab did not close drawer before visible outside focus: {forward}"
        )
    open_drawer()
    cdp.send(
        "Input.dispatchKeyEvent",
        {
            "type": "keyDown",
            "key": "Tab",
            "code": "Tab",
            "windowsVirtualKeyCode": 9,
            "modifiers": 8,
        },
        session,
    )
    cdp.send(
        "Input.dispatchKeyEvent",
        {
            "type": "keyUp",
            "key": "Tab",
            "code": "Tab",
            "windowsVirtualKeyCode": 9,
            "modifiers": 8,
        },
        session,
    )
    reverse = drawer_state()
    if (
        not reverse["hidden"]
        or reverse["inMap"]
        or not reverse["visible"]
        or reverse["posts"] != worker_posts
    ):
        failures.append(
            f"reverse Shift+Tab did not close drawer before visible outside focus: {reverse}"
        )
    open_drawer()
    cdp.evaluate(
        session,
        "[...document.querySelectorAll('.model-map-body button')].at(-1).focus()",
    )
    dispatch_key(cdp, session, "Tab", "Tab", 9)
    cdp.send(
        "Input.dispatchKeyEvent",
        {
            "type": "keyDown",
            "key": "Tab",
            "code": "Tab",
            "windowsVirtualKeyCode": 9,
            "modifiers": 8,
        },
        session,
    )
    cdp.send(
        "Input.dispatchKeyEvent",
        {
            "type": "keyUp",
            "key": "Tab",
            "code": "Tab",
            "windowsVirtualKeyCode": 9,
            "modifiers": 8,
        },
        session,
    )
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
    if (
        not escaped["hidden"]
        or not escaped["toggle"]
        or not escaped["visible"]
        or escaped["posts"] != worker_posts
    ):
        failures.append(f"Escape did not close and restore toggle focus: {escaped}")
    open_drawer()
    cdp.evaluate(
        session,
        "document.querySelector('.architecture-node').focus();document.querySelector('.architecture-node').click()",
    )
    selected = drawer_state()
    if (
        not selected["hidden"]
        or not selected["toggle"]
        or not selected["visible"]
        or selected["posts"] != worker_posts
    ):
        failures.append(
            f"node selection did not close drawer without traffic/focus loss: {selected}"
        )
    return failures
