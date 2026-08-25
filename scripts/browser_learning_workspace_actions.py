"""Action matrix and exact state capture for Learning Workspace browser QA."""

from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Final, Literal, TypedDict

from browser_input import dispatch_key
from browser_learning_workspace_probes import STATE_PROBE
from browser_session import ChromeSession


ScrollEventBehavior = Literal["auto", "smooth"]
ScrollExpectation = Literal["none", "auto", "smooth"]


class WorkspaceState(TypedDict):
    route: str
    selectedNode: str | None
    activeSection: str | None
    focusedElement: str | None
    highlights: list[str]
    workerPosts: int
    workerStarts: int
    headingFocuses: int
    focusInvocations: int
    focusAvailability: str | None
    scrollBehaviors: list[ScrollEventBehavior]


class AttentionScrollerGeometry(TypedDict):
    viewportWidth: int
    viewportHeight: int
    reducedMotion: bool
    clientWidth: int
    scrollWidth: int
    effectiveMax: int
    scrollLeftBeforeAssignment: int
    scrollLeftAfterMaxAssignment: int
    overflowX: str
    documentOverflow: int
    targetFullyInsideScroller: bool


class ActionRecord(TypedDict):
    action: str
    before: WorkspaceState
    after: WorkspaceState
    workerDelta: int
    focusDelta: int
    scrollBehaviorEvents: list[ScrollEventBehavior]
    scrollEventSource: Literal["product HTMLElement.scrollBy"]
    geometry: AttentionScrollerGeometry | None


@dataclass(frozen=True, slots=True)
class ExpectedState:
    route: str
    selected_node: str | None
    active_section: str | None
    focused_element: str | None = None
    highlights: tuple[str, ...] = ()
    heading_focus_delta: int = 0
    focus_delta: int = 0
    guide_action: bool = False
    scroll_behavior: ScrollExpectation | None = None
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

_DATA_LOCATOR = re.compile(r'^\[data-([a-z-]+)="([^"]+)"\]$')
_GUIDE_LOCATOR = re.compile(
    r'^\[data-guide-section-id="([^"]+)"\] \.learning-guide-section-control$'
)


def _dataset_key(attribute: str) -> str:
    first, *rest = attribute.split("-")
    return first + "".join(part.title() for part in rest)


def element_expression(locator: str) -> str:
    guide_match = _GUIDE_LOCATOR.fullmatch(locator)
    if guide_match:
        section_id = guide_match.group(1)
        return f"""(() => {{
          const section = Array.from(document.getElementsByTagName('*'))
            .find(element => element.dataset.guideSectionId === '{section_id}');
          return section?.getElementsByClassName('learning-guide-section-control')[0];
        }})()"""
    data_match = _DATA_LOCATOR.fullmatch(locator)
    if data_match:
        attribute, value = data_match.groups()
        key = _dataset_key(attribute)
        return (
            "Array.from(document.getElementsByTagName('*'))"
            f".find(element => element.dataset.{key} === '{value}')"
        )
    raise WorkspaceContractError(f"unsupported stable locator: {locator}")


def state(browser: ChromeSession) -> WorkspaceState:
    return browser.require_cdp().evaluate(browser.page_session, STATE_PROBE, True)


def arm_wait(browser: ChromeSession, expected: ExpectedState, before: WorkspaceState) -> None:
    focus_condition = (
        f"window.__learningFocusInvocations >= {before['focusInvocations'] + expected.focus_delta}"
        if expected.focus_delta > 0
        else "true"
    )
    expression = f"""(() => {{
      window.__learningActionWait = new Promise((resolve, reject) => {{
        const timeout = setTimeout(() => finish(new Error('workspace action timeout')), 10000);
        let observer;
        const finish = error => {{
          clearTimeout(timeout);
          observer?.disconnect();
          removeEventListener('learningfocusinvoke', check);
          removeEventListener('focusin', check);
          error ? reject(error) : resolve();
        }};
        const check = () => {{
          const route = Array.from(document.getElementsByTagName('*'))
            .find(element => element.dataset.learningRouteId)?.dataset.learningRouteId;
          if (route === '{expected.route}' && {focus_condition}) finish();
        }};
        observer = new MutationObserver(check);
        observer.observe(document.documentElement, {{ subtree: true, childList: true, attributes: true }});
        addEventListener('learningfocusinvoke', check);
        addEventListener('focusin', check);
      }});
    }})()"""
    browser.require_cdp().evaluate(browser.page_session, expression)


def await_wait(browser: ChromeSession) -> None:
    browser.require_cdp().evaluate(
        browser.page_session, "window.__learningActionWait", True
    )


def click(browser: ChromeSession, locator: str) -> None:
    cdp = browser.require_cdp()
    session = browser.page_session
    element = element_expression(locator)
    point = cdp.evaluate(
        session,
        f"""(() => {{
          const element = {element};
          if (!element) throw new Error('missing stable action target');
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
        "focusDelta": actual["focusInvocations"] - before["focusInvocations"]
        >= expected.focus_delta,
        "focusAvailability": actual["focusAvailability"] == expected.focus_availability,
    }
    if expected.scroll_behavior is not None:
        expected_events: list[ScrollEventBehavior] = (
            [] if expected.scroll_behavior == "none" else [expected.scroll_behavior]
        )
        checks["scrollBehavior"] = (
            actual["scrollBehaviors"][len(before["scrollBehaviors"]) :]
            == expected_events
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


def _append_record(
    records: list[ActionRecord],
    name: str,
    before: WorkspaceState,
    after: WorkspaceState,
    geometry: AttentionScrollerGeometry | None = None,
) -> None:
    records.append({
        "action": name,
        "before": before,
        "after": after,
        "workerDelta": after["workerPosts"] - before["workerPosts"],
        "focusDelta": after["focusInvocations"] - before["focusInvocations"],
        "scrollBehaviorEvents": after["scrollBehaviors"][len(before["scrollBehaviors"]) :],
        "scrollEventSource": "product HTMLElement.scrollBy",
        "geometry": geometry,
    })


def record_click(
    browser: ChromeSession,
    records: list[ActionRecord],
    name: str,
    locator: str,
    expected: ExpectedState,
    geometry: AttentionScrollerGeometry | None = None,
) -> None:
    before = state(browser)
    arm_wait(browser, expected, before)
    click(browser, locator)
    await_wait(browser)
    after = state(browser)
    verify(after, expected, before)
    _append_record(records, name, before, after, geometry)


def record_keyboard(browser: ChromeSession, records: list[ActionRecord], name: str, locator: str, expected: ExpectedState) -> None:
    cdp = browser.require_cdp()
    cdp.evaluate(browser.page_session, f"({element_expression(locator)}).focus()")
    before = state(browser)
    arm_wait(browser, expected, before)
    dispatch_key(cdp, browser.page_session, "Enter", "Enter", 13)
    await_wait(browser)
    after = state(browser)
    verify(after, expected, before)
    _append_record(records, name, before, after)
