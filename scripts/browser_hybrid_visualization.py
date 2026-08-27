"""Actual-trace R3F visualization browser QA phase."""

from __future__ import annotations

from pathlib import Path

from browser_hybrid_capture import capture, request_urls, screenshot_hash
from browser_hybrid_contract import (
    button_with_text,
    canvas_metrics,
    go_chapter,
    lose_context,
    number,
    require,
)
from browser_hybrid_helpers import (
    evaluate_dict,
    evaluate_int,
    navigate_hash,
    pointer_click,
    wait_for,
)
from browser_hybrid_input import drag_canvas, select_canvas_cell
from browser_learning_workspace_runtime import prepare_runtime_evidence
from browser_session import ChromeSession


def capture_visualization_phase(
    browser: ChromeSession,
    screenshots: Path,
    evidence: dict[str, object],
    shots: dict[str, str],
) -> None:
    navigate_hash(
        browser,
        "#/lab",
        "document.querySelector('.generation-bar') !== null",
        "Lab",
    )
    evidence["runtime"] = prepare_runtime_evidence(browser)
    shots["lab"] = capture(browser, screenshots / "hybrid-lab.png")

    go_chapter(browser, "5-1")
    pointer_click(
        browser,
        "document.querySelector('button[data-head-index=\"1\"]')",
        condition=(
            "document.querySelector('button[data-head-index=\"1\"]')"
            "?.getAttribute('aria-pressed') === 'true'"
        ),
        label="Head 2 selection",
    )
    pointer_click(
        browser,
        "document.querySelector('[role=\"tab\"]"
        "[aria-controls=\"learning-visualization-panel\"]')",
        condition=(
            "document.querySelector('#learning-visualization-panel')"
            "?.hidden === false"
        ),
        label="Visualization tab",
    )
    require(
        not any(
            "ScoreMatrixScene" in url for url in request_urls(browser)
        ),
        "Visualization chunk loaded before trace activation",
    )
    pointer_click(
        browser,
        button_with_text("Layer 1, Head 2 Score 불러오기"),
        condition=(
            "window.__learningWorkerResponses.some("
            "item => item?.type === 'attention_head_trace')"
        ),
        label="Score Matrix trace response",
    )
    wait_for(
        browser,
        (
            "document.querySelector('.score-matrix-canvas canvas')"
            "?.dataset.renderState === 'ready'"
            " || document.querySelector('[data-visualization-state="
            "\"unavailable\"]') !== null"
            " || document.querySelector('[data-visualization-state="
            "\"error\"]') !== null"
        ),
        "Score Matrix renderer",
    )
    renderer = evaluate_dict(
        browser,
        """(() => ({
          canvas: document.querySelector(
            '.score-matrix-canvas canvas',
          )?.dataset.renderState === 'ready',
          unavailable: document.querySelector(
            '[data-visualization-state="unavailable"]',
          ) !== null,
          rendererError: document.querySelector(
            '[data-visualization-state="error"]',
          )?.textContent ?? null,
        }))()""",
    )
    require(renderer["canvas"] is True, f"Score renderer: {renderer}")
    matrix = canvas_metrics(browser)
    _require_matrix_contract(matrix)
    cell_interaction = select_canvas_cell(browser)
    require(
        cell_interaction["hoverChanged"] is True,
        f"Canvas hover produced no visual response: {cell_interaction}",
    )
    evidence["cellInteraction"] = cell_interaction
    shots["visualization"] = capture(
        browser,
        screenshots / "hybrid-self-attention-visualization.png",
    )
    require(
        any("ScoreMatrixScene" in url for url in request_urls(browser)),
        "Visualization chunk never requested",
    )
    evidence["camera"] = _exercise_camera(browser)
    context = lose_context(browser)
    require(
        context["fallbackOpen"] is True
        and context["tableVisible"] is True,
        f"Context fallback failed: {context}",
    )
    evidence["accessibility"] = _accessibility_summary(browser)
    _restore_context(browser)
    pointer_click(browser, button_with_text("설명"))
    pointer_click(browser, button_with_text("시각화"))
    stable = canvas_metrics(browser)
    require(stable["canvasCount"] == 1, f"Canvas leak: {stable}")
    require(
        stable["inspectRequests"] == matrix["inspectRequests"],
        f"Duplicate inspection request: {stable}",
    )
    idle_frames = _idle_animation_frames(browser)
    require(idle_frames <= 2, f"Continuous idle frames: {idle_frames}")
    evidence["visualization"] = {
        **matrix,
        "contextLoss": context,
        "idleAnimationFrames": idle_frames,
        "lazyChunkRequested": True,
    }


def _require_matrix_contract(matrix: dict[str, object]) -> None:
    require(matrix["canvasCount"] == 1, f"Canvas duplication: {matrix}")
    require(
        number(matrix["dpr"], "DPR") <= 2.01,
        f"DPR uncapped: {matrix}",
    )
    require(
        matrix["expected"] == matrix["tableValue"],
        f"Parity: {matrix}",
    )
    require(
        matrix["requestId"] == matrix["responseRequestId"]
        and matrix["runId"] == matrix["responseRunId"],
        f"Trace correlation failed: {matrix}",
    )


def _exercise_camera(browser: ChromeSession) -> dict[str, bool]:
    browser.require_cdp().evaluate(
        browser.page_session,
        "document.activeElement?.blur()",
    )
    initial_hash = screenshot_hash(browser)
    drag_canvas(browser, button="left", delta_x=70, delta_y=-35)
    orbit_hash = screenshot_hash(browser)
    require(initial_hash != orbit_hash, "Orbit did not change rendered scene")
    drag_canvas(browser, button="right", delta_x=45, delta_y=30)
    pan_hash = screenshot_hash(browser)
    require(orbit_hash != pan_hash, "Pan did not change rendered scene")
    pointer_click(browser, button_with_text("확대"))
    zoom_hash = screenshot_hash(browser)
    require(pan_hash != zoom_hash, "Zoom did not change rendered scene")
    pointer_click(browser, button_with_text("시점 초기화"))
    reset_hash = screenshot_hash(browser)
    require(zoom_hash != reset_hash, "Reset did not change rendered scene")
    return {
        "orbitChanged": True,
        "panChanged": True,
        "zoomChanged": True,
        "resetChanged": True,
    }


def _restore_context(browser: ChromeSession) -> None:
    wait_for(
        browser,
        (
            "document.querySelector('[data-visualization-state=\"context-lost\"]')"
            " === null && document.querySelector("
            "'.score-matrix-canvas canvas') !== null"
        ),
        "WebGL context restoration",
        """(() => {
          const extension = window.__scoreMatrixLoseContext;
          if (!extension)
            throw new Error('WEBGL_lose_context unavailable');
          extension.restoreContext();
        })();""",
    )


def _idle_animation_frames(browser: ChromeSession) -> int:
    return evaluate_int(
        browser,
        """new Promise(resolve => {
          const canvas = document.querySelector(
            '.score-matrix-canvas canvas',
          );
          const before = Number(canvas?.dataset.renderCount ?? 0);
          setTimeout(() => {
            const after = Number(canvas?.dataset.renderCount ?? 0);
            resolve(after - before);
          }, 1000);
        })""",
    )


def _accessibility_summary(browser: ChromeSession) -> dict[str, object]:
    result = browser.require_cdp().send(
        "Accessibility.getFullAXTree",
        session_id=browser.page_session,
    )
    nodes = result.get("nodes", [])
    roles = [
        node.get("role", {}).get("value")
        for node in nodes
        if isinstance(node, dict)
    ]
    names = [
        node.get("name", {}).get("value")
        for node in nodes
        if isinstance(node, dict)
    ]
    require("table" in roles, "Score Matrix table missing from AX tree")
    require(
        any(
            isinstance(name, str) and "Score Matrix" in name
            for name in names
        ),
        "Score Matrix name missing from AX tree",
    )
    return {
        "nodeCount": len(nodes),
        "tableCount": roles.count("table"),
        "scoreMatrixNamed": True,
    }
