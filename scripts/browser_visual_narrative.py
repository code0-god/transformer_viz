#!/usr/bin/env python3
"""Verify three benchmark Learn Visual Narrative layouts in production Chrome."""

from __future__ import annotations

import argparse
import base64
import json
import threading
from functools import partial
from http.server import ThreadingHTTPServer
from pathlib import Path
from typing import NamedTuple

from browser_hybrid_capture import capture
from browser_hybrid_contract import require, set_viewport
from browser_hybrid_foundation import QuietHandler
from browser_hybrid_helpers import (
    JsonObject,
    evaluate_dict,
    navigate_hash,
    pointer_click,
    settle,
    wait_for,
)
from browser_learning_scenes import _settle_scene, _verify_idle
from browser_learning_workspace_probes import browser_errors
from browser_probes import READY_PROBE
from browser_session import ChromeSession

VIEWPORTS = (
    (320, 568),
    (390, 844),
    (768, 1024),
    (1024, 768),
    (1366, 768),
    (1440, 900),
)


class NarrativeSpec(NamedTuple):
    chapter: str
    figure_id: str
    layout: str
    name: str
    state_attribute: str
    state_test_id: str
    states: tuple[tuple[str, str], ...]


SPECS = (
    NarrativeSpec(
        "0-2",
        "decoder.diagram.tokenization.token",
        "inline",
        "tokenization",
        "data-phase",
        "tokenization-unit-scene-state",
        (("문장", "source"), ("경계", "boundaries"), ("Token", "split")),
    ),
    NarrativeSpec(
        "2-1",
        "decoder.diagram.representation.embedding",
        "split",
        "embedding",
        "data-phase",
        "token-scene-state",
        (
            ("ID", "id"),
            ("Row", "lookup"),
            ("선택", "lift"),
            ("Vector", "vector"),
        ),
    ),
    NarrativeSpec(
        "5-1",
        "self-attention",
        "sticky",
        "attention",
        "data-stage",
        "attention-scene-state",
        (
            ("Overview", "overview"),
            ("Q/K/V", "qkv"),
            ("Scores", "scores"),
            ("Mask", "mask"),
            ("Softmax", "softmax"),
            ("Value", "value"),
        ),
    ),
)

OBSERVER_PROBE = r"""
(() => {
  const NativeObserver = window.IntersectionObserver;
  const metrics = { active: 0, created: 0, disconnected: 0 };
  class TrackedObserver extends NativeObserver {
    constructor(callback, options) {
      super(callback, options);
      this.__trackedDisconnected = false;
      metrics.active += 1;
      metrics.created += 1;
    }
    disconnect() {
      if (!this.__trackedDisconnected) {
        this.__trackedDisconnected = true;
        metrics.active -= 1;
        metrics.disconnected += 1;
      }
      super.disconnect();
    }
  }
  Object.defineProperty(window, 'IntersectionObserver', {
    configurable: true,
    value: TrackedObserver,
  });
  Object.defineProperty(window, '__narrativeObserverMetrics', {
    configurable: true,
    value: metrics,
  });
})();
"""


def _install_observer_probe(browser: ChromeSession) -> None:
    browser.require_cdp().send(
        "Page.addScriptToEvaluateOnNewDocument",
        {"source": OBSERVER_PROBE},
        browser.page_session,
    )


def _chapter_selector(spec: NarrativeSpec) -> str:
    chapter_id = f"decoder.chapter.{spec.chapter.replace('-', '.')}"
    return f'[data-curriculum-chapter-id="{chapter_id}"]'


def _open_chapter(browser: ChromeSession, spec: NarrativeSpec) -> None:
    navigate_hash(
        browser,
        f"#/learn/decoder-only-fundamentals/{spec.chapter}",
        (
            "Boolean(document.querySelector("
            + json.dumps(_chapter_selector(spec))
            + "))"
        ),
        f"{spec.name} Chapter",
    )


def _open_narrative(browser: ChromeSession, spec: NarrativeSpec) -> None:
    _open_chapter(browser, spec)
    wait_for(
        browser,
        (
            f"document.querySelector('[data-figure-id=\"{spec.figure_id}\"] "
            "[data-scene-status=\"ready\"]') !== null"
        ),
        f"{spec.name} narrative ready",
        (
            f"document.querySelector('[data-figure-id=\"{spec.figure_id}\"]')"
            "?.scrollIntoView({ block: 'center', inline: 'nearest' });"
        ),
    )
    _settle_scene(browser)


def _state_condition(spec: NarrativeSpec, state: str) -> str:
    return (
        f"document.querySelector('[data-testid=\"{spec.state_test_id}\"]')"
        f"?.getAttribute('{spec.state_attribute}') === {json.dumps(state)}"
    )


def _click_stage(
    browser: ChromeSession,
    spec: NarrativeSpec,
    label: str,
    state: str,
) -> None:
    encoded = json.dumps(label, ensure_ascii=False)
    before = browser.require_cdp().evaluate(
        browser.page_session,
        "window.__learningSceneMetrics?.animationFrameCount ?? 0",
        True,
    )
    current = browser.require_cdp().evaluate(
        browser.page_session,
        (
            f"document.querySelector('[data-testid=\"{spec.state_test_id}\"]')"
            f"?.getAttribute('{spec.state_attribute}') ?? ''"
        ),
        True,
    )
    if not isinstance(before, int):
        raise TypeError(f"{spec.name} frame count: {before!r}")
    pointer_click(
        browser,
        (
            "Array.from(document.querySelectorAll("
            "'.visual-narrative__steps button'))"
            f".find(button => button.textContent?.trim() === {encoded})"
        ),
        condition=_state_condition(spec, state),
        label=f"{spec.name} {state}",
    )
    _settle_scene(
        browser,
        after_frame=before if current != state else None,
    )


def _capture_chapter(
    browser: ChromeSession,
    selector: str,
    path: Path,
) -> str:
    box = evaluate_dict(
        browser,
        f"""(() => {{
          const element = document.querySelector({json.dumps(selector)});
          if (!(element instanceof HTMLElement))
            throw new Error('Chapter capture target missing');
          const rect = element.getBoundingClientRect();
          return {{
            x: Math.max(0, rect.left + scrollX),
            y: Math.max(0, rect.top + scrollY),
            width: rect.width,
            height: rect.height,
          }};
        }})()""",
    )
    payload = browser.require_cdp().send(
        "Page.captureScreenshot",
        {
            "format": "png",
            "captureBeyondViewport": True,
            "fromSurface": True,
            "clip": {
                "x": float(box["x"]),
                "y": float(box["y"]),
                "width": float(box["width"]),
                "height": float(box["height"]),
                "scale": 1,
            },
        },
        browser.page_session,
    )
    content = base64.b64decode(str(payload["data"]))
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(content)
    return str(path)


def _probe(browser: ChromeSession, spec: NarrativeSpec) -> JsonObject:
    return evaluate_dict(
        browser,
        f"""(() => {{
          const narrative = document.querySelector(
            '[data-narrative-layout="{spec.layout}"]',
          );
          const visual = narrative?.querySelector('.visual-narrative__visual');
          const figure = narrative?.querySelector(
            '[data-figure-id="{spec.figure_id}"]',
          );
          const plane = figure?.querySelector('.scene-figure__plane');
          const header = figure?.querySelector('.scene-figure__header');
          const caption = figure?.querySelector('figcaption');
          const sceneControls = figure?.querySelector(
            '.scene-figure__controls',
          );
          const stageButtons = Array.from(
            narrative?.querySelectorAll('.visual-narrative__steps button')
              ?? [],
          );
          const allButtons = Array.from(
            narrative?.querySelectorAll('button') ?? [],
          );
          const rect = element => {{
            const box = element?.getBoundingClientRect();
            return box === undefined
              ? null
              : {{
                  top: box.top,
                  right: box.right,
                  bottom: box.bottom,
                  left: box.left,
                  width: box.width,
                  height: box.height,
                }};
          }};
          const style = element =>
            element instanceof Element ? getComputedStyle(element) : null;
          const narrativeStyle = style(narrative);
          const planeStyle = style(plane);
          const figureStyle = style(figure);
          return {{
            activeBeatCount: narrative?.querySelectorAll(
              '[data-narrative-active="true"]',
            ).length ?? -1,
            allControlMinHeight:
              allButtons.length === 0
                ? 0
                : Math.min(...allButtons.map(button =>
                    button.getBoundingClientRect().height
                  )),
            beatCount:
              narrative?.querySelectorAll('[data-narrative-stage]').length
              ?? -1,
            canvasCount: figure?.querySelectorAll('canvas').length ?? -1,
            captionRect: rect(caption),
            chapterRect: rect(document.querySelector(
              {json.dumps(_chapter_selector(spec))},
            )),
            documentOverflow: Math.max(
              0,
              document.documentElement.scrollWidth
                - document.documentElement.clientWidth,
            ),
            figureBackground: figureStyle?.backgroundColor ?? '',
            figureBorderWidth: figureStyle?.borderTopWidth ?? '',
            figureRect: rect(figure),
            headerRect: rect(header),
            internalControlCount:
              sceneControls?.querySelectorAll('button').length ?? 0,
            layout: narrative?.getAttribute('data-narrative-layout') ?? '',
            localOverflow:
              narrative instanceof HTMLElement
                ? Math.max(0, narrative.scrollWidth - narrative.clientWidth)
                : -1,
            narrativeBackground: narrativeStyle?.backgroundColor ?? '',
            narrativeBorderWidth: narrativeStyle?.borderTopWidth ?? '',
            narrativeRect: rect(narrative),
            observerMetrics: window.__narrativeObserverMetrics ?? null,
            planeBackground: planeStyle?.backgroundImage ?? '',
            planeBackgroundColor: planeStyle?.backgroundColor ?? '',
            planeBorderWidth: planeStyle?.borderTopWidth ?? '',
            planeRect: rect(plane),
            sceneStatus:
              figure?.querySelector('.scene-figure')
                ?.getAttribute('data-scene-status') ?? '',
            sceneMetrics: {{ ...(window.__learningSceneMetrics ?? {{}}) }},
            sceneViewport:
              figure?.querySelector('.scene-figure')
                ?.getAttribute('data-scene-viewport') ?? '',
            stageButtonCount: stageButtons.length,
            stageControlMinHeight:
              stageButtons.length === 0
                ? 0
                : Math.min(...stageButtons.map(button =>
                    button.getBoundingClientRect().height
                  )),
            state: Object.fromEntries(
              Array.from(
                figure?.querySelector(
                  '[data-testid="{spec.state_test_id}"]',
                )?.attributes ?? [],
              )
                .filter(attribute => attribute.name.startsWith('data-'))
                .map(attribute => [attribute.name, attribute.value]),
            ),
            stickyPosition: style(visual)?.position ?? '',
            visualRect: rect(visual),
          }};
        }})()""",
    )


def _number(data: JsonObject, key: str) -> float:
    value = data[key]
    if not isinstance(value, int | float):
        raise TypeError(f"{key} must be numeric: {value!r}")
    return float(value)


def _rect_height(probe: JsonObject, key: str) -> float:
    value = probe[key]
    if not isinstance(value, dict):
        raise TypeError(f"{key} missing: {value!r}")
    height = value.get("height")
    if not isinstance(height, int | float):
        raise TypeError(f"{key}.height missing: {value!r}")
    return float(height)


def _assert_probe(
    probe: JsonObject,
    spec: NarrativeSpec,
    width: int,
) -> None:
    require(probe["layout"] == spec.layout, f"{spec.name} layout: {probe}")
    require(probe["sceneStatus"] == "ready", f"{spec.name} scene: {probe}")
    require(probe["canvasCount"] == 1, f"{spec.name} Canvas: {probe}")
    require(
        probe["documentOverflow"] == 0 and probe["localOverflow"] == 0,
        f"{spec.name} overflow at {width}: {probe}",
    )
    require(
        probe["narrativeBorderWidth"] == "0px"
        and probe["figureBorderWidth"] == "0px"
        and probe["planeBorderWidth"] == "0px",
        f"{spec.name} visible card border: {probe}",
    )
    require(
        probe["narrativeBackground"] in ("rgba(0, 0, 0, 0)", "transparent")
        and probe["figureBackground"] in ("rgba(0, 0, 0, 0)", "transparent")
        and probe["planeBackground"] == "none"
        and probe["planeBackgroundColor"] in (
            "rgba(0, 0, 0, 0)",
            "transparent",
        ),
        f"{spec.name} visible panel background: {probe}",
    )
    require(
        _rect_height(probe, "headerRect") <= 1
        and _rect_height(probe, "captionRect") <= 1,
        f"{spec.name} duplicated Figure chrome visible: {probe}",
    )
    require(
        probe["activeBeatCount"] == 1
        and probe["beatCount"] == len(spec.states),
        f"{spec.name} beat state: {probe}",
    )
    require(
        _number(probe, "stageControlMinHeight") >= 44
        and _number(probe, "allControlMinHeight") >= 44,
        f"{spec.name} targets: {probe}",
    )
    expected_internal = 2 if spec.name in ("tokenization", "embedding") else 0
    require(
        probe["internalControlCount"] == expected_internal,
        f"{spec.name} auxiliary controls: {probe}",
    )
    plane_height = _rect_height(probe, "planeRect")
    compact_mobile = width <= 390
    height_limit = {
        "attention": 360 if compact_mobile else 540,
        "embedding": 330 if compact_mobile else 430,
        "tokenization": 260 if compact_mobile else 330,
    }[spec.name]
    require(
        100 <= plane_height <= height_limit,
        f"{spec.name} density at {width}: {probe}",
    )
    if width <= 768:
        require(
            probe["stickyPosition"] == "static",
            f"{spec.name} mobile/tablet sticky: {probe}",
        )
    elif spec.layout == "sticky":
        require(
            probe["stickyPosition"] == "sticky",
            f"{spec.name} desktop sticky: {probe}",
        )


def _center_narrative(browser: ChromeSession, spec: NarrativeSpec) -> None:
    browser.require_cdp().evaluate(
        browser.page_session,
        (
            "document.querySelector("
            f"'[data-narrative-layout=\"{spec.layout}\"] "
            ".visual-narrative__visual'"
            ")"
            "?.scrollIntoView({ block: 'center', inline: 'nearest' })"
        ),
        True,
    )
    settle(browser)


def _wheel_to_stage(
    browser: ChromeSession,
    spec: NarrativeSpec,
    stage: str,
    *,
    steps: int,
) -> None:
    delta = evaluate_dict(
        browser,
        f"""(() => {{
          const target = document.querySelector(
            '[data-narrative-stage="{stage}"]',
          );
          if (!(target instanceof HTMLElement))
            throw new Error('Narrative beat missing');
          const box = target.getBoundingClientRect();
          return {{ delta: box.top + box.height / 2 - innerHeight / 2 }};
        }})()""",
    )["delta"]
    if not isinstance(delta, int | float):
        raise TypeError(f"Wheel delta missing: {delta!r}")
    if abs(delta) < steps:
        delta = float(steps if delta >= 0 else -steps)
    cdp = browser.require_cdp()
    for _ in range(steps):
        cdp.send(
            "Input.dispatchMouseEvent",
            {
                "type": "mouseWheel",
                "x": 160,
                "y": 300,
                "deltaX": 0,
                "deltaY": float(delta) / steps,
            },
            browser.page_session,
        )
        settle(browser)
    diagnostics = evaluate_dict(
        browser,
        f"""(() => {{
          const target = document.querySelector(
            '[data-narrative-stage="{stage}"]',
          );
          const box = target?.getBoundingClientRect();
          return {{
            active:
              document.querySelector('[data-narrative-active="true"]')
                ?.getAttribute('data-narrative-stage') ?? '',
            observerMetrics: window.__narrativeObserverMetrics ?? null,
            scrollY,
            state:
              document.querySelector(
                '[data-testid="{spec.state_test_id}"]',
              )?.getAttribute('{spec.state_attribute}') ?? '',
            targetBottom: box?.bottom ?? 0,
            targetTop: box?.top ?? 0,
            viewportHeight: innerHeight,
          }};
        }})()""",
    )
    require(
        diagnostics["state"] == stage,
        f"{spec.name} wheel stage {stage}: {diagnostics}",
    )


def _keyboard_stage(
    browser: ChromeSession,
    spec: NarrativeSpec,
    label: str,
    stage: str,
) -> None:
    encoded = json.dumps(label, ensure_ascii=False)
    browser.require_cdp().evaluate(
        browser.page_session,
        (
            "Array.from(document.querySelectorAll("
            "'.visual-narrative__steps button'))"
            f".find(button => button.textContent?.trim() === {encoded})"
            "?.focus()"
        ),
        True,
    )
    cdp = browser.require_cdp()
    for event_type in ("keyDown", "keyUp"):
        cdp.send(
            "Input.dispatchKeyEvent",
            {
                "type": event_type,
                "key": "Enter",
                "code": "Enter",
                "windowsVirtualKeyCode": 13,
            },
            browser.page_session,
        )
    wait_for(
        browser,
        _state_condition(spec, stage),
        f"{spec.name} keyboard stage {stage}",
    )


def _sticky_probe(browser: ChromeSession, spec: NarrativeSpec) -> JsonObject:
    browser.require_cdp().evaluate(
        browser.page_session,
        """(() => {
          const beat = document.querySelector(
            '[data-narrative-stage="mask"]',
          );
          beat?.scrollIntoView({ block: 'center', inline: 'nearest' });
        })()""",
        True,
    )
    wait_for(browser, _state_condition(spec, "mask"), "Attention sticky mask")
    middle = evaluate_dict(
        browser,
        """(() => {
          const narrative = document.querySelector(
            '[data-narrative-layout="sticky"]',
          );
          const visual = narrative?.querySelector(
            '.visual-narrative__visual',
          );
          const header = document.querySelector('.architecture-header');
          const n = narrative?.getBoundingClientRect();
          const v = visual?.getBoundingClientRect();
          const h = header?.getBoundingClientRect();
          return {
            narrativeBottom: n?.bottom ?? 0,
            visualBottom: v?.bottom ?? 0,
            visualTop: v?.top ?? 0,
            headerBottom: h?.bottom ?? 0,
          };
        })()""",
    )
    require(
        _number(middle, "visualTop") >= _number(middle, "headerBottom"),
        f"Attention sticky covers Header: {middle}",
    )
    require(
        _number(middle, "visualBottom") <= _number(middle, "narrativeBottom"),
        f"Attention sticky escapes narrative: {middle}",
    )
    browser.require_cdp().evaluate(
        browser.page_session,
        """document.querySelector('.learning-guide-takeaway')
          ?.scrollIntoView({ block: 'center', inline: 'nearest' })""",
        True,
    )
    settle(browser)
    ending = evaluate_dict(
        browser,
        """(() => {
          const visual = document.querySelector(
            '[data-narrative-layout="sticky"] .visual-narrative__visual',
          );
          const following = document.querySelector(
            '.learning-guide-takeaway',
          );
          const v = visual?.getBoundingClientRect();
          const f = following?.getBoundingClientRect();
          return {
            overlap:
              v !== undefined
              && f !== undefined
              && v.bottom > f.top
              && v.top < f.bottom,
          };
        })()""",
    )
    require(ending["overlap"] is False, f"Attention sticky overlap: {ending}")
    return {"middle": middle, "ending": ending}


def _baseline_contract(url: str, evidence: Path) -> JsonObject:
    screenshots = evidence / "before"
    result: JsonObject = {}
    with ChromeSession(enable_gpu=True) as browser:
        set_viewport(browser, 1440, 900)
        browser.navigate(url)
        browser.require_cdp().evaluate(browser.page_session, READY_PROBE, True)
        for spec in SPECS:
            _open_chapter(browser, spec)
            target = f'[data-figure-id="{spec.figure_id}"]'
            browser.require_cdp().evaluate(
                browser.page_session,
                (
                    f"document.querySelector({json.dumps(target)})"
                    "?.scrollIntoView({ block: 'center', inline: 'nearest' })"
                ),
                True,
            )
            settle(browser)
            result[f"{spec.name}Viewport"] = capture(
                browser,
                screenshots / f"{spec.name}-before-1440x900.png",
            )
            result[f"{spec.name}Chapter"] = _capture_chapter(
                browser,
                _chapter_selector(spec),
                screenshots / f"{spec.name}-before-chapter-1440.png",
            )
    return result


def _candidate_contract(url: str, evidence: Path) -> JsonObject:
    screenshots = evidence / "after"
    result: JsonObject = {}
    with ChromeSession(enable_gpu=True) as browser:
        _install_observer_probe(browser)
        set_viewport(browser, 1440, 900)
        browser.navigate(url)
        browser.require_cdp().evaluate(browser.page_session, READY_PROBE, True)

        state_evidence: JsonObject = {}
        for spec in SPECS:
            _open_narrative(browser, spec)
            states: JsonObject = {}
            heights: list[float] = []
            for label, state in spec.states:
                _center_narrative(browser, spec)
                _click_stage(browser, spec, label, state)
                probe = _probe(browser, spec)
                _assert_probe(probe, spec, 1440)
                state_data = probe["state"]
                require(
                    isinstance(state_data, dict)
                    and state_data.get(spec.state_attribute) == state,
                    f"{spec.name} captured wrong state {state}: {probe}",
                )
                heights.append(_rect_height(probe, "visualRect"))
                states[state] = probe
                capture(
                    browser,
                    screenshots / f"{spec.name}-{state}-1440x900.png",
                )
            require(
                max(heights) - min(heights) <= 1,
                f"{spec.name} state height shift: {heights}",
            )
            if spec.name == "tokenization":
                before = browser.require_cdp().evaluate(
                    browser.page_session,
                    "window.__learningSceneMetrics?.animationFrameCount ?? 0",
                    True,
                )
                if not isinstance(before, int):
                    raise TypeError(f"Tokenization frame count: {before!r}")
                pointer_click(
                    browser,
                    (
                        "Array.from(document.querySelectorAll("
                        "'.scene-choice-group button'))"
                        ".find(button => button.textContent?.trim()"
                        " === '현재 byte')"
                    ),
                    condition=(
                        "document.querySelector("
                        "'[data-testid=\"tokenization-unit-scene-state\"]'"
                        ")?.getAttribute('data-mode') === 'byte'"
                    ),
                    label="Tokenization byte mode",
                )
                _settle_scene(browser, after_frame=before)
                capture(
                    browser,
                    screenshots / "tokenization-byte-1440x900.png",
                )
            result[f"{spec.name}Chapter"] = _capture_chapter(
                browser,
                _chapter_selector(spec),
                screenshots / f"{spec.name}-after-chapter-1440.png",
            )
            idle = _verify_idle(browser)
            require(
                idle == 0,
                f"{spec.name} idle RAF: {idle}; probe={_probe(browser, spec)}",
            )
            state_evidence[spec.name] = {
                "states": states,
                "idleFrameDelta": idle,
            }

        # Natural wheel, keyboard, and history are independent access paths.
        attention = SPECS[2]
        _open_narrative(browser, attention)
        _click_stage(browser, attention, "Overview", "overview")
        browser.require_cdp().evaluate(
            browser.page_session,
            """window.scrollTo({ top: 0, left: 0, behavior: 'instant' })""",
            True,
        )
        settle(browser)
        _wheel_to_stage(browser, attention, "qkv", steps=6)
        _wheel_to_stage(browser, attention, "scores", steps=1)
        _keyboard_stage(browser, attention, "Value", "value")
        _open_chapter(browser, SPECS[1])
        wait_for(
            browser,
            _state_condition(SPECS[1], "id"),
            "Embedding deterministic entrance",
        )
        wait_for(
            browser,
            _state_condition(attention, "overview"),
            "Attention back navigation initial state",
            "history.back();",
        )
        history_state = evaluate_dict(
            browser,
            """(() => ({
              hash: location.hash,
              stage: document.querySelector(
                '[data-testid="attention-scene-state"]',
              )?.getAttribute('data-stage') ?? '',
            }))()""",
        )
        require(
            history_state["stage"] == "overview",
            f"Attention history state: {history_state}",
        )

        # Six widths × three narratives.
        matrix: list[JsonObject] = []
        for width, height in VIEWPORTS:
            set_viewport(browser, width, height)
            for spec in SPECS:
                _open_narrative(browser, spec)
                _center_narrative(browser, spec)
                probe = _probe(browser, spec)
                _assert_probe(probe, spec, width)
                matrix.append(
                    {
                        "width": width,
                        "height": height,
                        "name": spec.name,
                        **probe,
                    },
                )
        set_viewport(browser, 1440, 900)
        _open_narrative(browser, attention)
        sticky = _sticky_probe(browser, attention)

        # Mobile main states.
        set_viewport(browser, 390, 844)
        for spec in SPECS:
            _open_narrative(browser, spec)
            _center_narrative(browser, spec)
            label, state = spec.states[-1]
            _click_stage(browser, spec, label, state)
            probe = _probe(browser, spec)
            state_data = probe["state"]
            require(
                isinstance(state_data, dict)
                and state_data.get(spec.state_attribute) == state,
                f"{spec.name} mobile captured wrong state {state}: {probe}",
            )
            capture(
                browser,
                screenshots / f"{spec.name}-{state}-390x844.png",
            )

        # All narrative and scene observers disconnect after leaving Learn.
        navigate_hash(
            browser,
            "#/",
            "document.querySelector('[data-narrative-layout]') === null",
            "Home after narratives",
        )
        observer_metrics = evaluate_dict(
            browser,
            "window.__narrativeObserverMetrics",
        )
        require(
            observer_metrics["active"] == 0,
            f"Narrative observers leaked: {observer_metrics}",
        )
        errors = browser_errors(browser)
        require(not errors["runtime"], f"Runtime errors: {errors}")
        require(not errors["network"], f"Network errors: {errors}")
        result.update(
            {
                "errors": errors,
                "history": history_state,
                "matrix": matrix,
                "observerMetrics": observer_metrics,
                "states": state_evidence,
                "sticky": sticky,
            },
        )
    return result


def _serve(root: Path) -> tuple[ThreadingHTTPServer, threading.Thread, str]:
    server = ThreadingHTTPServer(
        ("127.0.0.1", 0),
        partial(QuietHandler, directory=str(root.resolve())),
    )
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    return server, thread, f"http://127.0.0.1:{server.server_port}/"


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--baseline-root", type=Path, required=True)
    parser.add_argument("--candidate-root", type=Path, required=True)
    parser.add_argument("--candidate-base", default="/")
    parser.add_argument("--evidence", type=Path, required=True)
    args = parser.parse_args()

    baseline_server, baseline_thread, baseline_url = _serve(args.baseline_root)
    try:
        baseline = _baseline_contract(baseline_url, args.evidence)
    finally:
        baseline_server.shutdown()
        baseline_server.server_close()
        baseline_thread.join(timeout=10)

    candidate_server, candidate_thread, candidate_url = _serve(
        args.candidate_root,
    )
    try:
        candidate = _candidate_contract(
            f"{candidate_url.rstrip('/')}{args.candidate_base}",
            args.evidence,
        )
    finally:
        candidate_server.shutdown()
        candidate_server.server_close()
        candidate_thread.join(timeout=10)

    args.evidence.mkdir(parents=True, exist_ok=True)
    (args.evidence / "evidence.json").write_text(
        json.dumps(
            {"baseline": baseline, "candidate": candidate},
            ensure_ascii=False,
            indent=2,
        )
        + "\n",
    )
    print("Learn Visual Narrative browser: PASS")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
