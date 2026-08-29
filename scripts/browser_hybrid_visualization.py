"""Actual-trace R3F focused-viewer browser QA phase."""

from __future__ import annotations

# noqa: SIZE_OK — one ordered WebGL E2E scenario owns live renderer state

from pathlib import Path

from browser_hybrid_capture import capture, request_urls, screenshot_hash
from browser_hybrid_contract import (
    button_with_text,
    canvas_metrics,
    lose_context,
    number,
    require,
    set_viewport,
)
from browser_hybrid_helpers import (
    JsonObject,
    JsonValue,
    evaluate_dict,
    evaluate_int,
    navigate_hash,
    pointer_click,
    settle,
    settle_animations,
    wait_for,
)
from browser_hybrid_input import drag_canvas, select_canvas_cell
from browser_learning_workspace_runtime import prepare_runtime_evidence
from browser_session import ChromeSession


def _close_viewer(browser: ChromeSession) -> None:
    pointer_click(
        browser,
        "document.querySelector('[aria-label=\"집중 보기 닫기\"]')",
        condition="document.querySelector('#focused-viewer') === null",
        label="focused viewer close",
    )


def _open_score_viewer(browser: ChromeSession) -> None:
    pointer_click(
        browser,
        "document.querySelector('[data-inspection-kind=\"score-matrix\"]')",
        condition=(
            "document.querySelector('#focused-viewer"
            "[data-viewer-kind=\"visualization\"]') !== null"
        ),
        label="Score Matrix viewer",
    )
    settle_animations(
        browser,
        "[data-viewer-backdrop]",
        "Score Matrix viewer animation",
    )
    viewer = evaluate_dict(
        browser,
        """(() => {
          const dialogs = document.querySelectorAll(
            '#focused-viewer[role="dialog"]',
          );
          const dialog = dialogs[0];
          return {
            count: dialogs.length,
            source: dialog?.getAttribute('data-viewer-source') ?? '',
            kind: dialog?.getAttribute('data-viewer-kind') ?? '',
            modal: dialog?.getAttribute('aria-modal') ?? '',
          };
        })()""",
    )
    require(
        viewer
        == {"count": 1, "source": "lab", "kind": "visualization", "modal": "true"},
        f"Score Matrix viewer boundary: {viewer}",
    )


def _assert_lab_base(browser: ChromeSession) -> JsonObject:
    lab = evaluate_dict(
        browser,
        """(() => {
          const main = document.querySelector('.architecture-main');
          const style = main ? getComputedStyle(main) : null;
          return {
            prompt: document.querySelector('textarea') !== null,
            generate: document.querySelector('[data-testid="generate"]') !== null,
            continuation:
              document.querySelector('.continuation-panel') !== null,
            inspectionActions: document.querySelectorAll(
              '.lab-inspection__launcher button',
            ).length,
            architectureMounted:
              document.querySelector('[data-testid="architecture-root"]')
              !== null,
            canvasMounted: document.querySelector('canvas') !== null,
            dialogMounted:
              document.querySelector('[role="dialog"]') !== null,
            columns: style?.gridTemplateColumns ?? null,
            mainWidth: main?.getBoundingClientRect().width ?? 0,
            overflowX: document.documentElement.scrollWidth > innerWidth,
          };
        })()""",
    )
    require(
        lab["prompt"] is True
        and lab["generate"] is True
        and lab["continuation"] is True
        and lab["inspectionActions"] == 4,
        f"Lab experiment flow missing: {lab}",
    )
    require(
        lab["architectureMounted"] is False
        and lab["canvasMounted"] is False
        and lab["dialogMounted"] is False
        and lab["overflowX"] is False,
        f"Lab mounted permanent inspection UI: {lab}",
    )
    require(
        isinstance(lab["columns"], str)
        and " " not in lab["columns"].strip()
        and number(lab["mainWidth"], "Lab width") <= 1200,
        f"Lab fixed split remains: {lab}",
    )
    return lab


def _open_lab_architecture(browser: ChromeSession) -> JsonObject:
    pointer_click(
        browser,
        "document.querySelector('[data-testid=\"lab-open-architecture-root\"]')",
        condition=(
            "document.querySelector('#focused-viewer "
            "[data-testid=\"architecture-root\"]') !== null"
        ),
        label="Lab Architecture viewer",
    )
    settle_animations(
        browser,
        "[data-viewer-backdrop]",
        "Lab Architecture viewer animation",
    )
    pointer_click(
        browser,
        (
            "document.querySelector('#focused-viewer "
            "button[aria-label=\"확대\"]')"
        ),
        condition=(
            "document.querySelector('#focused-viewer "
            "[data-testid=\"diagram-viewport-surface\"]')"
            "?.dataset.viewportMode === 'zoomed'"
        ),
        label="Architecture viewer zoom before refit",
    )
    pointer_click(
        browser,
        (
            "document.querySelector('#focused-viewer "
            "button[aria-label=\"전체 보기\"]')"
        ),
        condition=(
            "document.querySelector('#focused-viewer "
            "[data-testid=\"diagram-viewport-surface\"]')"
            "?.dataset.viewportMode === 'fit'"
        ),
        label="Architecture viewer stable fit",
    )
    settle(browser)
    overlay = evaluate_dict(
        browser,
        """(() => {
          const viewer = document.querySelector('#focused-viewer');
          const rect = viewer?.getBoundingClientRect();
          const surface = viewer?.querySelector(
            '[data-testid="diagram-viewport-surface"]',
          )?.getBoundingClientRect();
          const content = viewer?.querySelector(
            '.diagram-viewport__content',
          )?.getBoundingClientRect();
          const diagram = viewer?.querySelector(
            '.architecture-diagram',
          )?.getBoundingClientRect();
          return {
            dialogCount: document.querySelectorAll('[role="dialog"]').length,
            kind: viewer?.dataset.viewerKind ?? null,
            source: viewer?.dataset.viewerSource ?? null,
            widthRatio: (rect?.width ?? 0) / innerWidth,
            heightRatio: (rect?.height ?? 0) / innerHeight,
            contentTop: content?.top ?? -1,
            contentBottom: content?.bottom ?? -1,
            diagramTop: diagram?.top ?? -1,
            diagramBottom: diagram?.bottom ?? -1,
            surfaceTop: surface?.top ?? -1,
            surfaceBottom: surface?.bottom ?? -1,
            pageInert:
              document.querySelector('.architecture-app')?.hasAttribute(
                'inert',
              ) ?? false,
          };
        })()""",
    )
    require(
        overlay["dialogCount"] == 1
        and overlay["kind"] == "architecture"
        and overlay["source"] == "lab"
        and overlay["pageInert"] is True,
        f"Lab Architecture overlay contract failed: {overlay}",
    )
    require(
        number(overlay["widthRatio"], "Architecture viewer width") >= 0.8
        and number(overlay["heightRatio"], "Architecture viewer height") >= 0.78,
        f"Lab Architecture viewer too small: {overlay}",
    )
    require(
        number(overlay["contentTop"], "Architecture content top")
        >= number(overlay["surfaceTop"], "Architecture surface top")
        and number(overlay["contentBottom"], "Architecture content bottom")
        <= number(overlay["surfaceBottom"], "Architecture surface bottom"),
        f"Lab Architecture content clipped after fit: {overlay}",
    )
    require(
        number(overlay["diagramTop"], "Architecture diagram top")
        >= number(overlay["surfaceTop"], "Architecture surface top")
        and number(overlay["diagramBottom"], "Architecture diagram bottom")
        <= number(overlay["surfaceBottom"], "Architecture surface bottom"),
        f"Lab Architecture diagram clipped after fit: {overlay}",
    )
    return overlay


def _select_attention_head_two(browser: ChromeSession) -> None:
    pointer_click(
        browser,
        "document.querySelector('#focused-viewer "
        "[data-node-id=\"transformer-block\"]')",
        condition=(
            "document.querySelector('#focused-viewer "
            "[data-testid=\"architecture-detail\"]') !== null"
        ),
        label="Architecture Block drill-down",
    )
    pointer_click(
        browser,
        "document.querySelector('#focused-viewer "
        "[data-node-id=\"self-attention\"]')",
        condition=(
            "document.querySelector('#focused-viewer "
            "[data-testid=\"attention-detail\"]') !== null"
        ),
        label="Architecture Attention drill-down",
    )
    pointer_click(
        browser,
        "document.querySelector('#focused-viewer "
        "button[data-head-index=\"1\"]')",
        condition=(
            "document.querySelector('#focused-viewer "
            "button[data-head-index=\"1\"]')?.getAttribute('aria-pressed')"
            " === 'true'"
        ),
        label="Head 2 selection",
    )


def _mount_score_matrix(browser: ChromeSession) -> JsonObject:
    require(
        not any("ScoreMatrixScene" in url for url in request_urls(browser)),
        "Visualization chunk loaded before focused viewer activation",
    )
    _open_score_viewer(browser)
    require(
        not any("ScoreMatrixScene" in url for url in request_urls(browser)),
        "Visualization chunk loaded before trace request",
    )
    pointer_click(
        browser,
        button_with_text(
            "Layer 1, Head 2 Score 불러오기",
            "document.querySelector('#focused-viewer')",
        ),
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
          ) !== null,
          unavailable: document.querySelector(
            '[data-visualization-state="unavailable"]',
          ) !== null,
          error: document.querySelector(
            '[data-visualization-state="error"]',
          ) !== null,
        }))()""",
    )
    require(renderer["canvas"] is True, f"Score renderer: {renderer}")
    require(
        any("ScoreMatrixScene" in url for url in request_urls(browser)),
        "Visualization chunk never requested",
    )
    return renderer


def _verify_reopen_teardown(
    browser: ChromeSession,
    inspect_requests: JsonValue,
) -> JsonObject:
    for iteration in range(20):
        _open_score_viewer(browser)
        wait_for(
            browser,
            "document.querySelector('.score-matrix-canvas canvas') !== null",
            f"Score Matrix reopen {iteration + 1}",
        )
        _close_viewer(browser)
        require(
            evaluate_int(
                browser,
                "document.querySelectorAll('.score-matrix-canvas canvas').length",
            )
            == 0,
            f"Canvas remained after reopen {iteration + 1}",
        )
    final = evaluate_dict(
        browser,
        """(() => ({
          canvasCount: document.querySelectorAll('canvas').length,
          dialogCount: document.querySelectorAll('[role="dialog"]').length,
          inspectRequests: window.__learningWorkerRequests.filter(
            item => item?.type === 'inspect_attention_head',
          ).length,
        }))()""",
    )
    require(
        final["canvasCount"] == 0
        and final["dialogCount"] == 0
        and final["inspectRequests"] == inspect_requests,
        f"Visualization teardown leaked state: {final}",
    )
    return {**final, "reopenCount": 20}


def capture_visualization_phase(
    browser: ChromeSession,
    screenshots: Path,
    evidence: JsonObject,
    shots: dict[str, str],
) -> None:
    set_viewport(browser, 1440, 900)
    navigate_hash(
        browser,
        "#/lab",
        "document.querySelector('[data-app-view=\"lab\"]') !== null",
        "Lab",
    )
    settle(browser)
    evidence["runtime"] = prepare_runtime_evidence(browser)
    lab = _assert_lab_base(browser)
    evidence["lab"] = lab
    shots["labBase"] = capture(
        browser, screenshots / "lab-base-1440x900.png"
    )
    shots["requiredLabDesktop"] = capture(
        browser,
        screenshots / "04-lab-1440.png",
    )
    browser.require_cdp().evaluate(
        browser.page_session,
        """document.querySelector('.lab-inspection')
          ?.scrollIntoView({ block: 'center', behavior: 'auto' })""",
        True,
    )
    settle(browser)
    shots["labInspection"] = capture(
        browser,
        screenshots / "lab-inspection-1440x900.png",
    )

    evidence["labArchitectureViewer"] = _open_lab_architecture(browser)
    shots["labArchitectureViewer"] = capture(
        browser, screenshots / "lab-architecture-viewer-1440x900.png"
    )
    shots["requiredArchitectureDesktop"] = capture(
        browser,
        screenshots / "05-lab-architecture-viewer-1440.png",
    )
    _select_attention_head_two(browser)
    _close_viewer(browser)

    evidence["scoreRenderer"] = _mount_score_matrix(browser)
    matrix = canvas_metrics(browser)
    _require_matrix_contract(matrix)
    cell_interaction = select_canvas_cell(browser)
    require(
        cell_interaction["hoverChanged"] is True,
        f"Canvas hover produced no visual response: {cell_interaction}",
    )
    evidence["cellInteraction"] = cell_interaction
    shots["scoreMatrixViewer"] = capture(
        browser, screenshots / "viewer-score-matrix-3d-1440x900.png"
    )
    shots["requiredScoreMatrixDesktop"] = capture(
        browser,
        screenshots / "06-lab-score-matrix-1440.png",
    )
    pointer_click(
        browser,
        button_with_text("2D Matrix", "document.querySelector('#focused-viewer')"),
        condition=(
            "document.querySelector('[data-score-matrix-mode=\"2d\"]') !== null"
            " && document.querySelector('.score-matrix-table-mode:not([hidden])"
            " .score-matrix-table') !== null"
        ),
        label="Score Matrix 2D mode",
    )
    mode_evidence = evaluate_dict(
        browser,
        """(() => {
          const selectedTableCell = document.querySelector(
            '.score-matrix-table-mode:not([hidden]) td[data-selected="true"]',
          );
          const selectedScore = document.querySelector(
            '.score-matrix-selection--primary [data-selected-value="score"]',
          );
          const canvas = document.querySelector('.score-matrix-canvas');
          return {
            mode: document.querySelector('.score-matrix-visualization')
              ?.getAttribute('data-score-matrix-mode') ?? '',
            tableVisible: selectedTableCell instanceof HTMLElement
              && selectedTableCell.getBoundingClientRect().height > 0,
            canvasVisible: canvas instanceof HTMLElement
              && canvas.getBoundingClientRect().height > 0,
            selectedTableValue:
              selectedTableCell?.querySelector(
                '.score-matrix-cell-button > span:not(.score-matrix-visually-hidden)',
              )?.textContent?.trim() ?? '',
            selectedDetailValue: selectedScore?.textContent?.trim() ?? '',
            inspectRequests: window.__learningWorkerRequests.filter(
              item => item?.type === 'inspect_attention_head',
            ).length,
          };
        })()""",
    )
    require(
        mode_evidence["mode"] == "2d"
        and mode_evidence["tableVisible"] is True
        and mode_evidence["canvasVisible"] is False
        and mode_evidence["selectedTableValue"]
        == mode_evidence["selectedDetailValue"],
        f"Score Matrix 2D mode failed: {mode_evidence}",
    )
    require(
        mode_evidence["inspectRequests"] == matrix["inspectRequests"],
        f"2D mode changed Worker requests: {mode_evidence}",
    )
    evidence["viewModes"] = mode_evidence
    shots["scoreMatrixTable"] = capture(
        browser, screenshots / "viewer-score-matrix-2d-1440x900.png"
    )
    pointer_click(
        browser,
        button_with_text("3D Surface", "document.querySelector('#focused-viewer')"),
        condition=(
            "document.querySelector('[data-score-matrix-mode=\"3d\"]') !== null"
            " && document.querySelector('.score-matrix-canvas')"
            "?.getBoundingClientRect().height > 0"
        ),
        label="Score Matrix 3D mode restore",
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
    stable = canvas_metrics(browser)
    require(stable["canvasCount"] == 1, f"Canvas leak: {stable}")
    require(
        stable["inspectRequests"] == matrix["inspectRequests"],
        f"Duplicate inspection request: {stable}",
    )
    idle_frames = _idle_animation_frames(browser)
    require(idle_frames <= 2, f"Continuous idle frames: {idle_frames}")
    _close_viewer(browser)
    evidence["visualization"] = {
        **matrix,
        "contextLoss": context,
        "idleAnimationFrames": idle_frames,
        "lazyChunkRequested": True,
        "teardown": _verify_reopen_teardown(
            browser,
            matrix["inspectRequests"],
        ),
    }
    evidence["labResponsive"] = _verify_lab_responsive(
        browser,
        screenshots,
        shots,
    )


def _verify_lab_responsive(
    browser: ChromeSession,
    screenshots: Path,
    shots: dict[str, str],
) -> list[JsonObject]:
    evidence: list[JsonObject] = []
    for width, height in (
        (1440, 900),
        (1366, 768),
        (1024, 768),
        (768, 1024),
        (390, 844),
        (320, 568),
    ):
        set_viewport(browser, width, height)
        base = _assert_lab_base(browser)
        require(base["overflowX"] is False, f"Lab base overflow: {base}")
        if width in (320, 390):
            browser.require_cdp().evaluate(
                browser.page_session,
                "window.scrollTo({ top: 0, left: 0, behavior: 'auto' })",
                True,
            )
            wait_for(browser, "scrollY === 0", f"Lab {width} top")
        layout = evaluate_dict(
            browser,
            """(() => {
              const stacked = (selector) => {
                const children = Array.from(
                  document.querySelector(selector)?.children ?? [],
                ).filter((child) => child instanceof HTMLElement);
                if (children.length < 2) return false;
                const first = children[0]?.getBoundingClientRect();
                const second = children[1]?.getBoundingClientRect();
                return !!first && !!second
                  && Math.abs(first.left - second.left) <= 1
                  && second.top >= first.bottom - 1;
              };
              const settings = document.querySelector(
                '.generation-settings',
              );
              if (settings instanceof HTMLDetailsElement) settings.open = true;
              const controls = Array.from(
                document.querySelectorAll(
                  '.generation-bar :is(button, input, textarea, select)',
                ),
              );
              const generation = document.querySelector('.generation-bar')
                ?.getBoundingClientRect();
              return {
                experimentStacked: stacked('.lab-experiment-grid'),
                primaryStacked: stacked('.generation-primary'),
                settingsStacked: stacked('.generation-settings-grid'),
                controlsFit: controls.every((control) => {
                  const rect = control.getBoundingClientRect();
                  return !!generation
                    && rect.left >= generation.left - 1
                    && rect.right <= generation.right + 1;
                }),
                controlMinHeight: Math.min(
                  ...controls.map(
                    (control) => control.getBoundingClientRect().height,
                  ),
                ),
              };
            })()""",
        )
        if width <= 880:
            require(
                layout["experimentStacked"] is True,
                f"Lab experiment did not stack at {width}: {layout}",
            )
        if width <= 640:
            require(
                layout["primaryStacked"] is True
                and layout["settingsStacked"] is True,
                f"Lab controls did not stack at {width}: {layout}",
            )
        require(
            layout["controlsFit"] is True
            and number(layout["controlMinHeight"], "Lab control height") >= 44,
            f"Lab controls exceed mobile surface at {width}: {layout}",
        )
        if width == 390:
            shots["labBaseMobile"] = capture(
                browser,
                screenshots / "lab-base-390x844.png",
            )
            shots["requiredLabMobile"] = capture(
                browser,
                screenshots / "09-lab-390.png",
            )
            browser.require_cdp().evaluate(
                browser.page_session,
                """document.querySelector('.lab-inspection')
                  ?.scrollIntoView({ block: 'center', behavior: 'auto' })""",
                True,
            )
            settle(browser)
            shots["labInspectionMobile"] = capture(
                browser,
                screenshots / "lab-inspection-390x844.png",
            )
        elif width == 320:
            shots["labBaseNarrow"] = capture(
                browser,
                screenshots / "lab-base-320x568.png",
            )
        pointer_click(
            browser,
            "document.querySelector('[data-testid=\"lab-open-architecture-root\"]')",
            condition=(
                "document.querySelector('#focused-viewer"
                "[data-viewer-kind=\"architecture\"]') !== null"
            ),
            label=f"Lab architecture {width}",
        )
        settle_animations(
            browser,
            "[data-viewer-backdrop]",
            f"Lab architecture animation {width}",
        )
        probe = evaluate_dict(
            browser,
            """(() => {
              const viewer = document.querySelector('#focused-viewer');
              const close = viewer?.querySelector(
                '[aria-label="집중 보기 닫기"]',
              );
              const v = viewer?.getBoundingClientRect();
              const c = close?.getBoundingClientRect();
              const root = viewer?.querySelector('[data-testid="architecture-root"]');
              const r = root?.getBoundingClientRect();
              const body = viewer?.querySelector('.focused-viewer__body');
              return {
                count: document.querySelectorAll(
                  '#focused-viewer[role="dialog"]',
                ).length,
                source: viewer?.getAttribute('data-viewer-source') ?? '',
                kind: viewer?.getAttribute('data-viewer-kind') ?? '',
                modal: viewer?.getAttribute('aria-modal') ?? '',
                overflow:
                  Math.max(
                    0,
                    document.documentElement.scrollWidth
                    - document.documentElement.clientWidth,
                  ),
                localOverflow: body
                  ? Math.max(0, body.scrollWidth - body.clientWidth)
                  : -1,
                fits:
                  !!v && v.left >= 0 && v.top >= 0
                  && v.right <= innerWidth + 1 && v.bottom <= innerHeight + 1,
                contentVisible: !!r && r.width > 1 && r.height > 1,
                backgroundInert:
                  document.querySelector('.architecture-app')?.hasAttribute(
                    'inert',
                  ) ?? false,
                scrollLocked: document.body.style.position === 'fixed',
                closeFocused: document.activeElement === close,
                closeWidth: c?.width ?? 0,
                closeHeight: c?.height ?? 0,
              };
            })()""",
        )
        require(probe["count"] == 1, f"Wrong dialog count: {probe}")
        require(probe["source"] == "lab", f"Wrong overlay source: {probe}")
        require(probe["kind"] == "architecture", f"Wrong overlay kind: {probe}")
        require(probe["modal"] == "true", f"Lab dialog is not modal: {probe}")
        require(probe["overflow"] == 0, f"Lab overflow at {width}: {probe}")
        require(
            probe["localOverflow"] == 0,
            f"Lab viewer local overflow at {width}: {probe}",
        )
        require(probe["fits"] is True, f"Lab overlay exceeds viewport: {probe}")
        require(probe["contentVisible"] is True, f"Lab viewer blank: {probe}")
        require(probe["backgroundInert"] is True, f"Lab background active: {probe}")
        require(probe["scrollLocked"] is True, f"Lab scroll unlocked: {probe}")
        require(probe["closeFocused"] is True, f"Lab close not focused: {probe}")
        require(
            number(probe["closeWidth"], "close width") >= 44
            and number(probe["closeHeight"], "close height") >= 44,
            f"Lab close target too small: {probe}",
        )
        if width == 390:
            shots["labArchitectureMobile"] = capture(
                browser,
                screenshots / "lab-architecture-viewer-390x844.png",
            )
        elif width == 320:
            shots["labArchitectureNarrow"] = capture(
                browser,
                screenshots / "lab-architecture-viewer-320x568.png",
            )
        evidence.append(
            {
                "width": width,
                "height": height,
                "layout": layout,
                **probe,
            },
        )
        _close_viewer(browser)
        focus = evaluate_dict(
            browser,
            """(() => ({
              dialogCount: document.querySelectorAll('[role="dialog"]').length,
              triggerFocused:
                document.activeElement?.getAttribute('data-testid')
                === 'lab-open-architecture-root',
              backgroundInert:
                document.querySelector('.architecture-app')?.hasAttribute(
                  'inert',
                ) ?? false,
            }))()""",
        )
        require(
            focus
            == {
                "dialogCount": 0,
                "triggerFocused": True,
                "backgroundInert": False,
            },
            f"Lab close restoration failed: {focus}",
        )
        if width == 390:
            _open_score_viewer(browser)
            wait_for(
                browser,
                "document.querySelector('.score-matrix-canvas canvas')"
                "?.dataset.renderState === 'ready'",
                "Score Matrix mobile renderer",
            )
            settle(browser)
            shots["scoreMatrixMobile"] = capture(
                browser,
                screenshots / "viewer-score-matrix-3d-390x844.png",
            )
            shots["requiredScoreMatrixMobile"] = capture(
                browser,
                screenshots / "10-score-matrix-390.png",
            )
            _close_viewer(browser)
    browser.require_cdp().evaluate(
        browser.page_session,
        """
        window.scrollTo({
          top: document.documentElement.scrollHeight,
          left: 0,
          behavior: 'auto',
        })
        """,
        True,
    )
    wait_for(browser, "scrollY > 0", "Lab mobile scroll baseline")
    scroll_before = evaluate_int(browser, "Math.round(scrollY)")
    opened = browser.require_cdp().evaluate(
        browser.page_session,
        """(() => {
          const trigger = document.querySelector(
            '[data-testid="lab-open-architecture-root"]',
          );
          if (!(trigger instanceof HTMLButtonElement)) return false;
          trigger.dispatchEvent(new MouseEvent('click', { bubbles: true }));
          return true;
        })()""",
        True,
    )
    require(opened is True, "Lab architecture trigger missing")
    wait_for(
        browser,
        (
            "document.querySelector('#focused-viewer"
            "[data-viewer-kind=\"architecture\"]') !== null"
        ),
        "Lab scroll restoration overlay",
    )
    _close_viewer(browser)
    scroll_after = evaluate_int(browser, "Math.round(scrollY)")
    require(
        scroll_after == scroll_before,
        f"Lab overlay changed page scroll: {scroll_before} -> {scroll_after}",
    )
    evidence[-1] = {
        **evidence[-1],
        "closeScrollBefore": scroll_before,
        "closeScrollAfter": scroll_after,
    }
    set_viewport(browser, 1440, 900)
    return evidence


def _require_matrix_contract(matrix: JsonObject) -> None:
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


def _accessibility_summary(browser: ChromeSession) -> JsonObject:
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
