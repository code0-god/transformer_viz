"""Action matrix and exact state capture for Learning Workspace browser QA."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Final, TypedDict

from browser_input import dispatch_key
from browser_learning_workspace_probes import STATE_PROBE
from browser_session import ChromeSession


class WorkspaceState(TypedDict):
    route: str
    selectedNode: str | None
    activeSection: str | None
    focusedElement: str | None
    highlights: list[str]
    workerPosts: int
    headingFocuses: int
    focusAvailability: str | None
    scrollBehaviors: list[str]


class ActionRecord(TypedDict):
    action: str
    before: WorkspaceState
    after: WorkspaceState
    workerDelta: int


@dataclass(frozen=True, slots=True)
class ExpectedState:
    route: str
    selected_node: str | None
    active_section: str | None
    focused_element: str | None = None
    highlights: tuple[str, ...] = ()
    heading_focus_delta: int = 0
    guide_action: bool = False
    scroll_behavior: str | None = None
    focus_availability: str = "available"


class WorkspaceContractError(RuntimeError):
    """The rendered Learning Workspace violated an observable contract."""


NODE_SELECTORS: Final = {
    "embedding": '[data-node-id="token-embedding"]',
    "block": '[data-node-id="transformer-block"]',
    "ln1": '[data-node-id="layer-norm-1"]',
    "attention": '[data-node-id="self-attention"]',
    "query": '[data-node-id="attention-query"]',
    "score": '[data-node-id="attention-scores"]',
    "mask": '[data-node-id="attention-causal-mask"]',
    "softmax": '[data-node-id="attention-softmax"]',
    "value": '[data-node-id="attention-value-aggregation"]',
}


def state(browser: ChromeSession) -> WorkspaceState:
    return browser.require_cdp().evaluate(browser.page_session, STATE_PROBE, True)


def wait_for(browser: ChromeSession, condition: str) -> None:
    expression = f"""new Promise((resolve, reject) => {{
      const timeout = setTimeout(() => finish(new Error('workspace state timeout')), 10000);
      let observer;
      const finish = error => {{
        clearTimeout(timeout); observer?.disconnect(); error ? reject(error) : resolve();
      }};
      const check = () => {{ if ({condition}) finish(); }};
      observer = new MutationObserver(check);
      observer.observe(document.documentElement, {{ subtree: true, childList: true, attributes: true }});
      addEventListener('focusin', check, {{ once: true }});
      check();
    }})"""
    browser.require_cdp().evaluate(browser.page_session, expression, True)


def click(browser: ChromeSession, selector: str) -> None:
    cdp = browser.require_cdp()
    session = browser.page_session
    point = cdp.evaluate(
        session,
        f"""(() => {{
          const element = document.querySelector('{selector}');
          if (!element) throw new Error('missing {selector}');
          element.scrollIntoView({{ block: 'nearest', inline: 'nearest' }});
          const box = element.getBoundingClientRect();
          return {{ x: box.left + box.width / 2, y: box.top + box.height / 2 }};
        }})()""",
        True,
    )
    params = {"x": point["x"], "y": point["y"], "button": "left", "clickCount": 1}
    cdp.send("Input.dispatchMouseEvent", {"type": "mouseMoved", **params}, session)
    cdp.send("Input.dispatchMouseEvent", {"type": "mousePressed", **params}, session)
    cdp.send("Input.dispatchMouseEvent", {"type": "mouseReleased", **params}, session)


def guide_selector(section_id: str) -> str:
    return f'[data-guide-section-id="{section_id}"] .learning-guide-section-control'


def verify(actual: WorkspaceState, expected: ExpectedState, before: WorkspaceState) -> None:
    checks = {
        "route": actual["route"] == expected.route,
        "selectedNode": actual["selectedNode"] == expected.selected_node,
        "activeSection": actual["activeSection"] == expected.active_section,
        "highlights": actual["highlights"] == sorted(expected.highlights),
        "headingFocusDelta": actual["headingFocuses"] - before["headingFocuses"]
        == expected.heading_focus_delta,
        "focusAvailability": actual["focusAvailability"]
        == expected.focus_availability,
    }
    if expected.scroll_behavior is not None:
        checks["scrollBehavior"] = (
            len(actual["scrollBehaviors"]) > len(before["scrollBehaviors"])
            and actual["scrollBehaviors"][-1] == expected.scroll_behavior
        )
    if expected.focused_element is not None:
        checks["focusedElement"] = actual["focusedElement"] == expected.focused_element
    failures = [name for name, passed in checks.items() if not passed]
    if failures:
        raise WorkspaceContractError(
            f"state mismatch {failures}: expected={expected}, actual={actual}"
        )
    if expected.guide_action and actual["workerPosts"] != before["workerPosts"]:
        raise WorkspaceContractError(f"Guide action posted to Worker: {before} -> {actual}")


def record_click(
    browser: ChromeSession,
    records: list[ActionRecord],
    name: str,
    selector: str,
    expected: ExpectedState,
) -> None:
    before = state(browser)
    click(browser, selector)
    wait_for(
        browser,
        f"document.querySelector('[data-learning-route-id]')?.dataset.learningRouteId === '{expected.route}'",
    )
    after = state(browser)
    verify(after, expected, before)
    records.append(
        {"action": name, "before": before, "after": after, "workerDelta": after["workerPosts"] - before["workerPosts"]}
    )


def record_keyboard(
    browser: ChromeSession,
    records: list[ActionRecord],
    name: str,
    selector: str,
    expected: ExpectedState,
) -> None:
    cdp = browser.require_cdp()
    cdp.evaluate(browser.page_session, f"document.querySelector('{selector}').focus()")
    before = state(browser)
    dispatch_key(cdp, browser.page_session, "Enter", "Enter", 13)
    wait_for(browser, f"document.querySelector('[data-active=true]')?.dataset.guideSectionId === '{expected.active_section}'")
    after = state(browser)
    verify(after, expected, before)
    records.append(
        {"action": name, "before": before, "after": after, "workerDelta": after["workerPosts"] - before["workerPosts"]}
    )
