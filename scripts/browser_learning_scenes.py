#!/usr/bin/env python3
"""Production Chrome verifier for visible-only Part 2 Learning Scenes."""

from __future__ import annotations

import argparse
import json
import threading
from functools import partial
from http.server import ThreadingHTTPServer
from pathlib import Path

from browser_hybrid_capture import capture, request_urls
from browser_hybrid_contract import button_with_text, require, set_viewport
from browser_hybrid_foundation import QuietHandler
from browser_hybrid_helpers import (
    JsonObject,
    evaluate_dict,
    navigate_hash,
    pointer_click,
    wait_for,
)
from browser_learning_workspace_probes import browser_errors
from browser_probes import READY_PROBE
from browser_session import ChromeSession

TOKEN_ID = "decoder.diagram.representation.embedding"
POSITION_ID = "decoder.diagram.representation.position"
HIDDEN_ID = "decoder.diagram.representation.hidden-state"

RESPONSIVE_SCENES = (
    (
        "2-1",
        "decoder.chapter.2.1",
        TOKEN_ID,
        "Token",
    ),
    (
        "2-2",
        "decoder.chapter.2.2",
        POSITION_ID,
        "Position",
    ),
    (
        "2-3",
        "decoder.chapter.2.3",
        HIDDEN_ID,
        "Hidden",
    ),
)


def _evaluate(browser: ChromeSession, expression: str) -> object:
    return browser.require_cdp().evaluate(
        browser.page_session,
        expression,
        True,
    )


def _settle_scene(
    browser: ChromeSession,
    *,
    after_frame: int | None = None,
) -> int:
    required = "null" if after_frame is None else str(after_frame)
    result = _evaluate(
        browser,
        f"""new Promise((resolve, reject) => {{
          const timeout = setTimeout(
            () => reject(new Error('Learning Scene did not settle')),
            30000,
          );
          let prior = window.__learningSceneMetrics?.animationFrameCount ?? 0;
          let stable = 0;
          const start = prior;
          const required = {required};
          const check = () => {{
            const current =
              window.__learningSceneMetrics?.animationFrameCount ?? 0;
            const started = required === null || current > required;
            stable = started && current === prior ? stable + 1 : 0;
            prior = current;
            if (stable >= 4) {{
              clearTimeout(timeout);
              resolve(current - start);
            }}
            else requestAnimationFrame(check);
          }};
          requestAnimationFrame(check);
        }})""",
    )
    if not isinstance(result, int):
        raise TypeError(f"Scene frame count must be integer: {result!r}")
    return result


def _probe(browser: ChromeSession) -> JsonObject:
    return evaluate_dict(
        browser,
        f"""(() => {{
          const figure = document.querySelector(
            '[data-figure-id="{TOKEN_ID}"]',
          );
          const scene = figure?.querySelector('.scene-figure');
          const state = figure?.querySelector('[data-testid="token-scene-state"]');
          const canvas = figure?.querySelector('canvas');
          const controls = Array.from(figure?.querySelectorAll('button') ?? []);
          const semantic = figure?.querySelector(
            '.scene-figure__fallback--semantic',
          );
          const box = canvas?.getBoundingClientRect();
          return {{
            status: scene?.getAttribute('data-scene-status') ?? '',
            viewport: scene?.getAttribute('data-scene-viewport') ?? '',
            visible: scene?.getAttribute('data-scene-visible') ?? '',
            phase: state?.getAttribute('data-phase') ?? '',
            token: state?.getAttribute('data-selected-token') ?? '',
            canvasCount: figure?.querySelectorAll('canvas').length ?? -1,
            canvasWidth: box?.width ?? 0,
            canvasHeight: box?.height ?? 0,
            controlCount: controls.length,
            controlMinHeight: Math.min(
              ...controls.map(control => control.getBoundingClientRect().height),
            ),
            semanticFallbackPresent: semantic instanceof HTMLElement,
            semanticFallbackHidden:
              semantic instanceof HTMLElement
              && semantic.getBoundingClientRect().width <= 1,
            overflow:
              document.documentElement.scrollWidth
              - document.documentElement.clientWidth,
            metrics: {{ ...(window.__learningSceneMetrics ?? {{}}) }},
          }};
        }})()""",
    )


def _open_token_scene(browser: ChromeSession) -> None:
    navigate_hash(
        browser,
        "#/learn/decoder-only-fundamentals/2-1",
        (
            "document.querySelector("
            "'[data-curriculum-chapter-id=\"decoder.chapter.2.1\"]'"
            ") !== null"
        ),
        "Token Embedding Chapter",
    )
    _evaluate(
        browser,
        f"""document.querySelector(
          '[data-figure-id="{TOKEN_ID}"]',
        )?.scrollIntoView({{ block: 'start', inline: 'nearest' }})""",
    )
    wait_for(
        browser,
        (
            f"document.querySelector('[data-figure-id=\"{TOKEN_ID}\"] "
            "[data-scene-status=\"ready\"]') !== null"
        ),
        "Token Scene ready",
    )
    _settle_scene(browser, after_frame=0)


def _position_probe(browser: ChromeSession) -> JsonObject:
    return evaluate_dict(
        browser,
        f"""(() => {{
          const figure = document.querySelector(
            '[data-figure-id="{POSITION_ID}"]',
          );
          const scene = figure?.querySelector('.scene-figure');
          const state = figure?.querySelector(
            '[data-testid="position-scene-state"]',
          );
          const canvas = figure?.querySelector('canvas');
          const controls = Array.from(figure?.querySelectorAll('button') ?? []);
          const box = canvas?.getBoundingClientRect();
          return {{
            status: scene?.getAttribute('data-scene-status') ?? '',
            viewport: scene?.getAttribute('data-scene-viewport') ?? '',
            visible: scene?.getAttribute('data-scene-visible') ?? '',
            phase: state?.getAttribute('data-phase') ?? '',
            position: state?.getAttribute('data-position') ?? '',
            stateText: state?.textContent?.trim() ?? '',
            canvasCount: figure?.querySelectorAll('canvas').length ?? -1,
            canvasWidth: box?.width ?? 0,
            canvasHeight: box?.height ?? 0,
            controlCount: controls.length,
            controlMinHeight: Math.min(
              ...controls.map(control => control.getBoundingClientRect().height),
            ),
            overflow:
              document.documentElement.scrollWidth
              - document.documentElement.clientWidth,
            metrics: {{ ...(window.__learningSceneMetrics ?? {{}}) }},
          }};
        }})()""",
    )


def _open_position_scene(browser: ChromeSession) -> None:
    before = _evaluate(
        browser,
        "window.__learningSceneMetrics?.animationFrameCount ?? 0",
    )
    if not isinstance(before, int):
        raise TypeError(f"Scene frame count must be integer: {before!r}")
    set_viewport(browser, 1440, 900)
    navigate_hash(
        browser,
        "#/learn/decoder-only-fundamentals/2-2",
        (
            "document.querySelector("
            "'[data-curriculum-chapter-id=\"decoder.chapter.2.2\"]'"
            ") !== null"
        ),
        "Position Embedding Chapter",
    )
    _evaluate(
        browser,
        f"""document.querySelector(
          '[data-figure-id="{POSITION_ID}"]',
        )?.scrollIntoView({{ block: 'start', inline: 'nearest' }})""",
    )
    wait_for(
        browser,
        (
            f"document.querySelector('[data-figure-id=\"{POSITION_ID}\"] "
            "[data-scene-status=\"ready\"]') !== null"
        ),
        "Position Scene ready",
    )
    _settle_scene(browser, after_frame=before)


def _hidden_probe(browser: ChromeSession) -> JsonObject:
    return evaluate_dict(
        browser,
        f"""(() => {{
          const figure = document.querySelector(
            '[data-figure-id="{HIDDEN_ID}"]',
          );
          const scene = figure?.querySelector('.scene-figure');
          const state = figure?.querySelector(
            '[data-testid="hidden-scene-state"]',
          );
          const canvas = figure?.querySelector('canvas');
          const controls = Array.from(figure?.querySelectorAll('button') ?? []);
          const shapes = Array.from(
            state?.querySelectorAll('.hidden-scene__flow em') ?? [],
            shape => shape.textContent?.trim() ?? '',
          );
          const box = canvas?.getBoundingClientRect();
          return {{
            status: scene?.getAttribute('data-scene-status') ?? '',
            viewport: scene?.getAttribute('data-scene-viewport') ?? '',
            visible: scene?.getAttribute('data-scene-visible') ?? '',
            stage: state?.getAttribute('data-stage') ?? '',
            stateText: state?.textContent?.trim() ?? '',
            shapes,
            canvasCount: figure?.querySelectorAll('canvas').length ?? -1,
            canvasWidth: box?.width ?? 0,
            canvasHeight: box?.height ?? 0,
            controlCount: controls.length,
            controlMinHeight: Math.min(
              ...controls.map(control => control.getBoundingClientRect().height),
            ),
            overflow:
              document.documentElement.scrollWidth
              - document.documentElement.clientWidth,
            metrics: {{ ...(window.__learningSceneMetrics ?? {{}}) }},
          }};
        }})()""",
    )


def _open_hidden_scene(browser: ChromeSession) -> None:
    before = _evaluate(
        browser,
        "window.__learningSceneMetrics?.animationFrameCount ?? 0",
    )
    if not isinstance(before, int):
        raise TypeError(f"Scene frame count must be integer: {before!r}")
    set_viewport(browser, 1440, 900)
    navigate_hash(
        browser,
        "#/learn/decoder-only-fundamentals/2-3",
        (
            "document.querySelector("
            "'[data-curriculum-chapter-id=\"decoder.chapter.2.3\"]'"
            ") !== null"
        ),
        "Hidden State Chapter",
    )
    _evaluate(
        browser,
        f"""document.querySelector(
          '[data-figure-id="{HIDDEN_ID}"]',
        )?.scrollIntoView({{ block: 'start', inline: 'nearest' }})""",
    )
    wait_for(
        browser,
        (
            f"document.querySelector('[data-figure-id=\"{HIDDEN_ID}\"] "
            "[data-scene-status=\"ready\"]') !== null"
        ),
        "Hidden Scene ready",
    )
    _settle_scene(browser, after_frame=before)


def _click_phase(browser: ChromeSession, label: str, phase: str) -> None:
    before = _probe(browser).get("metrics", {})
    before_frame = (
        before.get("animationFrameCount", 0)
        if isinstance(before, dict)
        else 0
    )
    if not isinstance(before_frame, int):
        raise TypeError(f"Scene frame count must be integer: {before_frame!r}")
    pointer_click(
        browser,
        button_with_text(label),
        condition=(
            "document.querySelector('[data-testid=\"token-scene-state\"]')"
            f"?.getAttribute('data-phase') === {json.dumps(phase)}"
        ),
        label=f"Token phase {phase}",
    )
    _settle_scene(browser, after_frame=before_frame)


def _click_position_phase(
    browser: ChromeSession,
    label: str,
    phase: str,
) -> None:
    before = _position_probe(browser).get("metrics", {})
    before_frame = (
        before.get("animationFrameCount", 0)
        if isinstance(before, dict)
        else 0
    )
    if not isinstance(before_frame, int):
        raise TypeError(f"Scene frame count must be integer: {before_frame!r}")
    pointer_click(
        browser,
        button_with_text(label),
        condition=(
            "document.querySelector('[data-testid=\"position-scene-state\"]')"
            f"?.getAttribute('data-phase') === {json.dumps(phase)}"
        ),
        label=f"Position phase {phase}",
    )
    _settle_scene(browser, after_frame=before_frame)


def _click_hidden_stage(
    browser: ChromeSession,
    label: str,
    stage: str,
) -> None:
    before = _hidden_probe(browser).get("metrics", {})
    before_frame = (
        before.get("animationFrameCount", 0)
        if isinstance(before, dict)
        else 0
    )
    if not isinstance(before_frame, int):
        raise TypeError(f"Scene frame count must be integer: {before_frame!r}")
    pointer_click(
        browser,
        button_with_text(label),
        condition=(
            "document.querySelector('[data-testid=\"hidden-scene-state\"]')"
            f"?.getAttribute('data-stage') === {json.dumps(stage)}"
        ),
        label=f"Hidden stage {stage}",
    )
    _settle_scene(browser, after_frame=before_frame)


def _verify_idle(browser: ChromeSession) -> int:
    result = _evaluate(
        browser,
        """new Promise(resolve => {
          const before =
            window.__learningSceneMetrics?.animationFrameCount ?? 0;
          let frames = 0;
          const check = () => {
            frames += 1;
            if (frames === 12) {
              const after =
                window.__learningSceneMetrics?.animationFrameCount ?? 0;
              resolve(after - before);
            } else {
              requestAnimationFrame(check);
            }
          };
          requestAnimationFrame(check);
        })""",
    )
    if not isinstance(result, int):
        raise TypeError(f"Idle frame delta must be integer: {result!r}")
    return result


def run_contract(url: str, evidence_dir: Path) -> None:
    screenshots = evidence_dir / "screenshots"
    evidence: JsonObject = {}
    shots: dict[str, str] = {}

    with ChromeSession(enable_gpu=True) as browser:
        set_viewport(browser, 1440, 900)
        browser.navigate(url)
        browser.require_cdp().evaluate(browser.page_session, READY_PROBE, True)
        home_requests = request_urls(browser)
        home_scene_requests = [
            request
            for request in home_requests
            if "TokenEmbeddingScene" in request
            or "PositionEmbeddingScene" in request
            or "HiddenStateScene" in request
            or "react-three-fiber" in request
        ]
        require(
            home_scene_requests == [],
            f"Home eagerly loaded Learning Scene runtime: {home_scene_requests}",
        )
        home_idle_delta = _verify_idle(browser)
        require(home_idle_delta == 0, f"Home scene RAF leaked: {home_idle_delta}")

        _open_token_scene(browser)
        initial = _probe(browser)
        require(initial["status"] == "ready", f"Token initial failed: {initial}")
        require(initial["canvasCount"] == 1, f"Token Canvas failed: {initial}")
        require(initial["phase"] == "id", f"Token initial phase failed: {initial}")
        require(initial["overflow"] == 0, f"Token overflow: {initial}")
        require(
            initial["controlCount"] == 4
            and isinstance(initial["controlMinHeight"], int | float)
            and initial["controlMinHeight"] >= 44,
            f"Token control contract failed: {initial}",
        )
        require(
            initial["semanticFallbackPresent"] is True
            and initial["semanticFallbackHidden"] is True,
            f"Token fallback missing: {initial}",
        )
        shots["tokenInitialDesktop"] = capture(
            browser,
            screenshots / "token-initial-1440x900.png",
        )

        frames_before = initial.get("metrics", {})
        _click_phase(browser, "Row 찾기", "lookup")
        lookup = _probe(browser)
        shots["tokenLookupDesktop"] = capture(
            browser,
            screenshots / "token-lookup-1440x900.png",
        )

        _click_phase(browser, "Vector 추출", "vector")
        vector = _probe(browser)
        shots["tokenVectorDesktop"] = capture(
            browser,
            screenshots / "token-vector-1440x900.png",
        )
        idle_frame_delta = _verify_idle(browser)
        require(idle_frame_delta == 0, f"Token idle RAF leaked: {idle_frame_delta}")

        pointer_click(
            browser,
            button_with_text("cat · ID 42"),
            condition=(
                "document.querySelector('[data-testid=\"token-scene-state\"]')"
                "?.getAttribute('data-selected-token') === 'cat'"
            ),
            label="Token cat selection",
        )
        cat_frame = vector.get("metrics", {})
        previous_cat_frame = (
            cat_frame.get("animationFrameCount", 0)
            if isinstance(cat_frame, dict)
            else 0
        )
        if not isinstance(previous_cat_frame, int):
            raise TypeError(
                f"Scene frame count must be integer: {previous_cat_frame!r}",
            )
        _settle_scene(browser, after_frame=previous_cat_frame)
        cat = _probe(browser)
        require(
            cat["token"] == "cat" and cat["phase"] == "id",
            f"Token selection not synchronized: {cat}",
        )

        mobile_frame = cat.get("metrics", {})
        previous_mobile_frame = (
            mobile_frame.get("animationFrameCount", 0)
            if isinstance(mobile_frame, dict)
            else 0
        )
        if not isinstance(previous_mobile_frame, int):
            raise TypeError(
                f"Scene frame count must be integer: {previous_mobile_frame!r}",
            )
        set_viewport(browser, 390, 844)
        wait_for(
            browser,
            (
                f"document.querySelector('[data-figure-id=\"{TOKEN_ID}\"] "
                "[data-scene-viewport=\"mobile\"]"
                "[data-scene-status=\"ready\"]') !== null"
            ),
            "Token mobile scene mode",
        )
        _evaluate(
            browser,
            f"""document.querySelector(
              '[data-figure-id="{TOKEN_ID}"]',
            )?.scrollIntoView({{ block: 'start', inline: 'nearest' }})""",
        )
        _settle_scene(browser, after_frame=previous_mobile_frame)
        mobile = _probe(browser)
        require(
            mobile["viewport"] == "mobile"
            and mobile["status"] == "ready"
            and mobile["overflow"] == 0
            and isinstance(mobile["canvasWidth"], int | float)
            and mobile["canvasWidth"] <= 390
            and isinstance(mobile["metrics"], dict)
            and mobile["metrics"].get("activeCanvasCount") == 1,
            f"Token mobile contract failed: {mobile}",
        )
        _click_phase(browser, "Row 찾기", "lookup")
        _click_phase(browser, "Vector 추출", "vector")
        _evaluate(
            browser,
            """document.querySelector('.scene-figure__plane')
              ?.scrollIntoView({ block: 'center', inline: 'nearest' })""",
        )
        _settle_scene(browser)
        mobile = _probe(browser)
        require(
            mobile["phase"] == "vector",
            f"Token mobile vector phase failed: {mobile}",
        )
        shots["tokenMobile"] = capture(
            browser,
            screenshots / "token-vector-390x844.png",
        )

        _evaluate(
            browser,
            """window.scrollTo({
              top: document.documentElement.scrollHeight,
              left: 0,
            })""",
        )
        wait_for(
            browser,
            (
                f"document.querySelector('[data-figure-id=\"{TOKEN_ID}\"] "
                "[data-scene-visible=\"false\"]') !== null"
                f" && document.querySelector('[data-figure-id=\"{TOKEN_ID}\"] "
                "canvas') === null"
            ),
            "Token offscreen Canvas cleanup",
        )
        offscreen = _probe(browser)
        metrics = offscreen.get("metrics", {})
        require(
            isinstance(metrics, dict)
            and metrics.get("activeCanvasCount") == 0
            and metrics.get("webglContextCount") == 0,
            f"Token offscreen context leaked: {offscreen}",
        )

        _open_position_scene(browser)
        position_before = _position_probe(browser)
        require(
            position_before["status"] == "ready"
            and position_before["phase"] == "before"
            and position_before["position"] == "0"
            and position_before["canvasCount"] == 1
            and position_before["controlCount"] == 4
            and isinstance(position_before["controlMinHeight"], int | float)
            and position_before["controlMinHeight"] >= 44
            and position_before["overflow"] == 0,
            f"Position initial contract failed: {position_before}",
        )
        require(
            "cat · E_tok [C]" in str(position_before["stateText"])
            and "[C] + [C] → [C]" in str(position_before["stateText"])
            and "concatenation 아님" in str(position_before["stateText"]),
            f"Position semantics missing: {position_before}",
        )
        shots["positionBeforeDesktop"] = capture(
            browser,
            screenshots / "position-before-add-1440x900.png",
        )

        _click_position_phase(browser, "원소별 더하기", "sum")
        position_sum = _position_probe(browser)
        _evaluate(
            browser,
            """document.querySelector('.scene-figure__plane')
              ?.scrollIntoView({ block: 'center', inline: 'nearest' })""",
        )
        _settle_scene(browser)
        shots["positionAfterDesktop"] = capture(
            browser,
            screenshots / "position-after-add-1440x900.png",
        )
        position_idle_delta = _verify_idle(browser)
        require(
            position_idle_delta == 0,
            f"Position idle RAF leaked: {position_idle_delta}",
        )

        position_frame = position_sum.get("metrics", {})
        previous_position_frame = (
            position_frame.get("animationFrameCount", 0)
            if isinstance(position_frame, dict)
            else 0
        )
        if not isinstance(previous_position_frame, int):
            raise TypeError(
                "Scene frame count must be integer: "
                f"{previous_position_frame!r}",
            )
        pointer_click(
            browser,
            button_with_text("position 1"),
            condition=(
                "document.querySelector("
                "'[data-testid=\"position-scene-state\"]'"
                ")?.getAttribute('data-position') === '1'"
            ),
            label="Position 1 comparison",
        )
        _settle_scene(browser, after_frame=previous_position_frame)
        _click_position_phase(browser, "원소별 더하기", "sum")
        position_compare = _position_probe(browser)
        require(
            position_compare["position"] == "1"
            and "cat · E_tok [C]" in str(position_compare["stateText"]),
            f"Position comparison changed token: {position_compare}",
        )
        _evaluate(
            browser,
            """document.querySelector('.scene-figure__plane')
              ?.scrollIntoView({ block: 'center', inline: 'nearest' })""",
        )
        _settle_scene(browser)
        shots["positionCompareDesktop"] = capture(
            browser,
            screenshots / "position-compare-1440x900.png",
        )

        position_mobile_frame = position_compare.get("metrics", {})
        previous_position_mobile_frame = (
            position_mobile_frame.get("animationFrameCount", 0)
            if isinstance(position_mobile_frame, dict)
            else 0
        )
        if not isinstance(previous_position_mobile_frame, int):
            raise TypeError(
                "Scene frame count must be integer: "
                f"{previous_position_mobile_frame!r}",
            )
        set_viewport(browser, 390, 844)
        wait_for(
            browser,
            (
                f"document.querySelector('[data-figure-id=\"{POSITION_ID}\"] "
                "[data-scene-viewport=\"mobile\"]"
                "[data-scene-status=\"ready\"]') !== null"
            ),
            "Position mobile scene mode",
        )
        _settle_scene(
            browser,
            after_frame=previous_position_mobile_frame,
        )
        _evaluate(
            browser,
            """document.querySelector('.scene-figure__plane')
              ?.scrollIntoView({ block: 'center', inline: 'nearest' })""",
        )
        _settle_scene(browser)
        position_mobile = _position_probe(browser)
        require(
            position_mobile["viewport"] == "mobile"
            and position_mobile["status"] == "ready"
            and isinstance(position_mobile["canvasWidth"], int | float)
            and position_mobile["canvasWidth"] <= 390
            and position_mobile["overflow"] == 0,
            f"Position mobile contract failed: {position_mobile}",
        )
        shots["positionMobile"] = capture(
            browser,
            screenshots / "position-sum-390x844.png",
        )

        _open_hidden_scene(browser)
        hidden_x0 = _hidden_probe(browser)
        require(
            hidden_x0["status"] == "ready"
            and hidden_x0["stage"] == "x0"
            and hidden_x0["canvasCount"] == 1
            and hidden_x0["controlCount"] == 4
            and isinstance(hidden_x0["controlMinHeight"], int | float)
            and hidden_x0["controlMinHeight"] >= 44
            and hidden_x0["overflow"] == 0,
            f"Hidden X_0 contract failed: {hidden_x0}",
        )
        require(
            hidden_x0["shapes"] == ["[T,C]", "[T,C]", "[T,C]"]
            and "t0 · the" in str(hidden_x0["stateText"])
            and "t1 · cat" in str(hidden_x0["stateText"])
            and "causal prefix" not in str(hidden_x0["stateText"]).lower(),
            f"Hidden shape or row identity failed: {hidden_x0}",
        )
        shots["hiddenX0Desktop"] = capture(
            browser,
            screenshots / "hidden-x0-1440x900.png",
        )

        _click_hidden_stage(browser, "X_1", "x1")
        hidden_x1 = _hidden_probe(browser)
        shots["hiddenX1Desktop"] = capture(
            browser,
            screenshots / "hidden-x1-1440x900.png",
        )

        _click_hidden_stage(browser, "X_N", "xn")
        hidden_xn = _hidden_probe(browser)
        shots["hiddenXNDesktop"] = capture(
            browser,
            screenshots / "hidden-xn-1440x900.png",
        )
        hidden_idle_delta = _verify_idle(browser)
        require(
            hidden_idle_delta == 0,
            f"Hidden idle RAF leaked: {hidden_idle_delta}",
        )

        hidden_mobile_frame = hidden_xn.get("metrics", {})
        previous_hidden_mobile_frame = (
            hidden_mobile_frame.get("animationFrameCount", 0)
            if isinstance(hidden_mobile_frame, dict)
            else 0
        )
        if not isinstance(previous_hidden_mobile_frame, int):
            raise TypeError(
                "Scene frame count must be integer: "
                f"{previous_hidden_mobile_frame!r}",
            )
        set_viewport(browser, 390, 844)
        wait_for(
            browser,
            (
                f"document.querySelector('[data-figure-id=\"{HIDDEN_ID}\"] "
                "[data-scene-viewport=\"mobile\"]"
                "[data-scene-status=\"ready\"]') !== null"
            ),
            "Hidden mobile scene mode",
        )
        _settle_scene(
            browser,
            after_frame=previous_hidden_mobile_frame,
        )
        _evaluate(
            browser,
            """document.querySelector('.scene-figure__plane')
              ?.scrollIntoView({ block: 'center', inline: 'nearest' })""",
        )
        _settle_scene(browser)
        hidden_mobile = _hidden_probe(browser)
        require(
            hidden_mobile["viewport"] == "mobile"
            and hidden_mobile["stage"] == "xn"
            and isinstance(hidden_mobile["canvasWidth"], int | float)
            and hidden_mobile["canvasWidth"] <= 390
            and hidden_mobile["overflow"] == 0,
            f"Hidden mobile contract failed: {hidden_mobile}",
        )
        shots["hiddenMobile"] = capture(
            browser,
            screenshots / "hidden-xn-390x844.png",
        )

        _evaluate(
            browser,
            """window.scrollTo({
              top: document.documentElement.scrollHeight,
              left: 0,
            })""",
        )
        wait_for(
            browser,
            (
                f"document.querySelector('[data-figure-id=\"{HIDDEN_ID}\"] "
                "[data-scene-visible=\"false\"]') !== null"
                f" && document.querySelector('[data-figure-id=\"{HIDDEN_ID}\"] "
                "canvas') === null"
            ),
            "Hidden offscreen Canvas cleanup",
        )
        hidden_offscreen = _hidden_probe(browser)
        hidden_offscreen_metrics = hidden_offscreen.get("metrics", {})
        require(
            isinstance(hidden_offscreen_metrics, dict)
            and hidden_offscreen_metrics.get("activeCanvasCount") == 0
            and hidden_offscreen_metrics.get("webglContextCount") == 0,
            f"Hidden offscreen context leaked: {hidden_offscreen}",
        )

        lifecycle_before = dict(hidden_offscreen_metrics)
        for cycle in range(20):
            before_frame = _evaluate(
                browser,
                "window.__learningSceneMetrics?.animationFrameCount ?? 0",
            )
            if not isinstance(before_frame, int):
                raise TypeError(
                    f"Scene frame count must be integer: {before_frame!r}",
                )
            _evaluate(
                browser,
                f"""document.querySelector(
                  '[data-figure-id="{HIDDEN_ID}"]',
                )?.scrollIntoView({{ block: 'start', inline: 'nearest' }})""",
            )
            wait_for(
                browser,
                (
                    f"document.querySelector('[data-figure-id=\"{HIDDEN_ID}\"] "
                    "[data-scene-visible=\"true\"]"
                    "[data-scene-status=\"ready\"] canvas') !== null"
                ),
                f"Lifecycle mount {cycle + 1}",
            )
            _settle_scene(browser, after_frame=before_frame)
            mounted_cycle = _hidden_probe(browser)
            require(
                mounted_cycle["canvasCount"] == 1,
                f"Lifecycle Canvas count {cycle + 1}: {mounted_cycle}",
            )

            _evaluate(
                browser,
                """window.scrollTo({
                  top: document.documentElement.scrollHeight,
                  left: 0,
                })""",
            )
            wait_for(
                browser,
                (
                    f"document.querySelector('[data-figure-id=\"{HIDDEN_ID}\"] "
                    "[data-scene-visible=\"false\"]') !== null"
                    f" && document.querySelector('[data-figure-id=\"{HIDDEN_ID}\"] "
                    "canvas') === null"
                ),
                f"Lifecycle unmount {cycle + 1}",
            )

        lifecycle_after = _hidden_probe(browser)
        lifecycle_metrics = lifecycle_after.get("metrics", {})
        require(
            isinstance(lifecycle_metrics, dict)
            and lifecycle_metrics.get("mountCount", 0)
            - lifecycle_before.get("mountCount", 0)
            == 20
            and lifecycle_metrics.get("unmountCount", 0)
            - lifecycle_before.get("unmountCount", 0)
            == 20
            and lifecycle_metrics.get("activeCanvasCount") == 0
            and lifecycle_metrics.get("webglContextCount") == 0
            and lifecycle_metrics.get("peakCanvasCount") == 1
            and lifecycle_metrics.get("observerCount") == 2,
            f"Twenty-cycle lifecycle leaked: {lifecycle_after}",
        )
        lifecycle_idle_delta = _verify_idle(browser)
        require(
            lifecycle_idle_delta == 0,
            f"Offscreen lifecycle RAF leaked: {lifecycle_idle_delta}",
        )

        context_before_frame = _evaluate(
            browser,
            "window.__learningSceneMetrics?.animationFrameCount ?? 0",
        )
        if not isinstance(context_before_frame, int):
            raise TypeError(
                f"Scene frame count must be integer: {context_before_frame!r}",
            )
        _evaluate(
            browser,
            f"""document.querySelector(
              '[data-figure-id="{HIDDEN_ID}"]',
            )?.scrollIntoView({{ block: 'start', inline: 'nearest' }})""",
        )
        wait_for(
            browser,
            (
                f"document.querySelector('[data-figure-id=\"{HIDDEN_ID}\"] "
                "[data-scene-status=\"ready\"] canvas') !== null"
            ),
            "Context test scene ready",
        )
        _settle_scene(browser, after_frame=context_before_frame)
        wait_for(
            browser,
            (
                f"document.querySelector('[data-figure-id=\"{HIDDEN_ID}\"] "
                "[data-scene-status=\"context-lost\"]') !== null"
            ),
            "Learning Scene context loss",
            f"""(() => {{
              const canvas = document.querySelector(
                '[data-figure-id="{HIDDEN_ID}"] canvas',
              );
              const gl = canvas?.getContext('webgl2')
                ?? canvas?.getContext('webgl');
              const extension = gl?.getExtension('WEBGL_lose_context');
              if (!extension)
                throw new Error('WEBGL_lose_context unavailable');
              window.__learningSceneLoseContext = extension;
              extension.loseContext();
            }})();""",
        )
        context_lost = _hidden_probe(browser)
        require(
            context_lost["status"] == "context-lost"
            and context_lost["canvasCount"] == 1,
            f"Context fallback failed: {context_lost}",
        )
        _evaluate(
            browser,
            """document.querySelector('.scene-figure__plane')
              ?.scrollIntoView({ block: 'center', inline: 'nearest' })""",
        )
        shots["webglFallback"] = capture(
            browser,
            screenshots / "webgl-context-fallback-390x844.png",
        )
        wait_for(
            browser,
            (
                f"document.querySelector('[data-figure-id=\"{HIDDEN_ID}\"] "
                "[data-scene-status=\"ready\"]') !== null"
            ),
            "Learning Scene context restore",
            "window.__learningSceneLoseContext.restoreContext();",
        )
        context_restored = _hidden_probe(browser)

        browser.require_cdp().send(
            "Emulation.setEmulatedMedia",
            {
                "media": "screen",
                "features": [
                    {
                        "name": "prefers-reduced-motion",
                        "value": "reduce",
                    },
                ],
            },
            browser.page_session,
        )
        wait_for(
            browser,
            (
                f"document.querySelector('[data-figure-id=\"{HIDDEN_ID}\"] "
                "[data-scene-motion=\"reduced\"]') !== null"
            ),
            "Learning Scene reduced motion",
        )
        reduced_before = _evaluate(
            browser,
            "window.__learningSceneMetrics?.animationFrameCount ?? 0",
        )
        if not isinstance(reduced_before, int):
            raise TypeError(
                f"Scene frame count must be integer: {reduced_before!r}",
            )
        pointer_click(
            browser,
            button_with_text("X_0"),
            condition=(
                "document.querySelector('[data-testid=\"hidden-scene-state\"]')"
                "?.getAttribute('data-stage') === 'x0'"
            ),
            label="Reduced-motion final state",
        )
        _settle_scene(browser)
        reduced_after = _evaluate(
            browser,
            "window.__learningSceneMetrics?.animationFrameCount ?? 0",
        )
        require(
            isinstance(reduced_after, int) and reduced_after == reduced_before,
            "Reduced-motion transition scheduled scene frames: "
            f"{reduced_before} -> {reduced_after}",
        )
        _evaluate(
            browser,
            """document.querySelector('.scene-figure__plane')
              ?.scrollIntoView({ block: 'center', inline: 'nearest' })""",
        )
        shots["reducedMotion"] = capture(
            browser,
            screenshots / "reduced-motion-final-390x844.png",
        )

        browser.require_cdp().send(
            "Emulation.setEmulatedMedia",
            {"media": "screen", "features": []},
            browser.page_session,
        )
        responsive_matrix: list[JsonObject] = []
        for width, height in (
            (1440, 900),
            (1366, 768),
            (1024, 768),
            (768, 1024),
            (390, 844),
            (320, 568),
        ):
            set_viewport(browser, width, height)
            for slug, chapter_id, figure_id, label in RESPONSIVE_SCENES:
                before_frame = _evaluate(
                    browser,
                    "window.__learningSceneMetrics?.animationFrameCount ?? 0",
                )
                if not isinstance(before_frame, int):
                    raise TypeError(
                        "Scene frame count must be integer: "
                        f"{before_frame!r}",
                    )
                navigate_hash(
                    browser,
                    f"#/learn/decoder-only-fundamentals/{slug}",
                    (
                        "document.querySelector("
                        f"'[data-curriculum-chapter-id=\"{chapter_id}\"]'"
                        ") !== null"
                    ),
                    f"{label} responsive Chapter {width}",
                )
                _evaluate(
                    browser,
                    f"""document.querySelector(
                      '[data-figure-id="{figure_id}"]',
                    )?.scrollIntoView({{
                      block: 'start',
                      inline: 'nearest',
                    }})""",
                )
                wait_for(
                    browser,
                    (
                        f"document.querySelector('[data-figure-id=\"{figure_id}\"] "
                        "[data-scene-status=\"ready\"] canvas') !== null"
                    ),
                    f"{label} responsive scene {width}",
                )
                _settle_scene(browser, after_frame=before_frame)
                probe = (
                    _probe(browser)
                    if figure_id == TOKEN_ID
                    else _position_probe(browser)
                    if figure_id == POSITION_ID
                    else _hidden_probe(browser)
                )
                expected_mode = "mobile" if width <= 600 else "desktop"
                metrics = probe.get("metrics", {})
                require(
                    probe["status"] == "ready"
                    and probe["viewport"] == expected_mode
                    and probe["canvasCount"] == 1
                    and isinstance(probe["canvasWidth"], int | float)
                    and probe["canvasWidth"] <= width
                    and probe["overflow"] == 0
                    and isinstance(probe["controlMinHeight"], int | float)
                    and probe["controlMinHeight"] >= 44
                    and isinstance(metrics, dict)
                    and metrics.get("peakCanvasCount") == 1,
                    f"{label} responsive contract {width}: {probe}",
                )
                responsive_matrix.append(
                    {
                        "scene": label,
                        "width": width,
                        "height": height,
                        "viewport": probe["viewport"],
                        "canvasWidth": probe["canvasWidth"],
                        "canvasHeight": probe["canvasHeight"],
                        "overflow": probe["overflow"],
                        "controlMinHeight": probe["controlMinHeight"],
                    },
                )

        navigate_hash(
            browser,
            "#/learn/decoder-only-fundamentals/1-1",
            (
                "document.querySelector("
                "'[data-curriculum-chapter-id=\"decoder.chapter.1.1\"]'"
                ") !== null"
            ),
            "Part 1 idle control",
        )
        wait_for(
            browser,
            "document.querySelector('.scene-figure') === null",
            "Part 1 has no Learning Scene",
        )
        part1_idle_delta = _verify_idle(browser)
        part1_canvas_count = _evaluate(
            browser,
            "document.querySelectorAll('canvas').length",
        )
        require(
            part1_idle_delta == 0
            and part1_canvas_count == 0,
            "Part 1 scene activity leaked: "
            f"frames={part1_idle_delta}, canvas={part1_canvas_count}",
        )

        errors = browser_errors(browser)
        require(not errors["network"], f"Network errors: {errors['network']}")
        require(not errors["runtime"], f"Runtime errors: {errors['runtime']}")
        evidence["token"] = {
            "initial": initial,
            "lookup": lookup,
            "vector": vector,
            "cat": cat,
            "mobile": mobile,
            "offscreen": offscreen,
            "idleFrameDelta": idle_frame_delta,
            "framesBefore": frames_before,
        }
        evidence["position"] = {
            "before": position_before,
            "sum": position_sum,
            "compare": position_compare,
            "mobile": position_mobile,
            "idleFrameDelta": position_idle_delta,
        }
        evidence["hidden"] = {
            "x0": hidden_x0,
            "x1": hidden_x1,
            "xn": hidden_xn,
            "mobile": hidden_mobile,
            "offscreen": hidden_offscreen,
            "idleFrameDelta": hidden_idle_delta,
        }
        evidence["lifecycle"] = {
            "before": lifecycle_before,
            "after": lifecycle_metrics,
            "cycles": 20,
            "offscreenIdleFrameDelta": lifecycle_idle_delta,
            "contextLost": context_lost,
            "contextRestored": context_restored,
            "reducedMotionFrameDelta": reduced_after - reduced_before,
        }
        evidence["responsiveMatrix"] = responsive_matrix
        evidence["routeIdleFrames"] = {
            "home": home_idle_delta,
            "part1": part1_idle_delta,
        }
        evidence["requests"] = request_urls(browser)
        evidence["errors"] = errors
        evidence["screenshots"] = shots

    evidence_dir.mkdir(parents=True, exist_ok=True)
    (evidence_dir / "evidence.json").write_text(
        json.dumps(evidence, ensure_ascii=False, indent=2) + "\n",
    )
    print(f"Learning Scene browser: PASS ({len(shots)} screenshots)")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--root", type=Path, required=True)
    parser.add_argument("--entry", default="index.html")
    parser.add_argument("--evidence", type=Path, required=True)
    args = parser.parse_args()

    server = ThreadingHTTPServer(
        ("127.0.0.1", 0),
        partial(QuietHandler, directory=str(args.root.resolve())),
    )
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    try:
        base = "/" if args.entry == "index.html" else "/transformer_viz/"
        run_contract(
            f"http://127.0.0.1:{server.server_port}{base}",
            args.evidence,
        )
    finally:
        server.shutdown()
        server.server_close()
        thread.join(timeout=10)
        args.evidence.mkdir(parents=True, exist_ok=True)
        (args.evidence / "cleanup.txt").write_text(
            "Chrome contexts closed; static server stopped; "
            "ephemeral ports released.\n",
        )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
