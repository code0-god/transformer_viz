"""Production-browser geometry contract for Lab and focused viewers."""

from __future__ import annotations

import argparse
import json
from pathlib import Path

from browser_hybrid_capture import capture
from browser_hybrid_contract import canvas_metrics, number, require, set_viewport
from browser_hybrid_helpers import (
    JsonObject,
    evaluate_dict,
    navigate_hash,
    settle,
    wait_for,
)
from browser_hybrid_visualization import (
    _close_viewer,
    _mount_score_matrix,
    _open_lab_architecture,
    _open_score_viewer,
    _require_matrix_contract,
    _select_attention_head_two,
)
from browser_hybrid_input import select_canvas_cell
from browser_learning_workspace_probes import INSTRUMENT_LEARNING_WORKSPACE
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
LAB_BOUNDARIES = ("lab-prompt", "lab-output", "lab-runtime", "lab-inspect")


def _prepare_runtime(browser: ChromeSession) -> JsonObject:
    generation = evaluate_dict(
        browser,
        """new Promise((resolve, reject) => {
          const cleanup = () => {
            clearTimeout(timeout);
            removeEventListener('learningworkerresponse', receive);
          };
          const receive = (event) => {
            const response = event.detail;
            if (response?.type === 'error') {
              cleanup();
              reject(new Error(response.message));
            }
            if (response?.type !== 'generation_finished') return;
            cleanup();
            requestAnimationFrame(() => requestAnimationFrame(() => resolve({
              requestId: response.request_id,
              runId: response.run_id,
              reason: response.reason,
              stepCount: document.querySelectorAll(
                '.generation-steps button',
              ).length,
            })));
          };
          addEventListener('learningworkerresponse', receive);
          const timeout = setTimeout(() => {
            cleanup();
            reject(new Error('generation timeout'));
          }, 20000);
          const setValue = (id, value) => {
            const element = document.getElementById(id);
            const setter = Object.getOwnPropertyDescriptor(
              Object.getPrototypeOf(element),
              'value',
            )?.set;
            if (!element || !setter) throw new Error(`${id} missing`);
            setter.call(element, value);
            element.dispatchEvent(new Event('change', { bubbles: true }));
            element.dispatchEvent(new Event('input', { bubbles: true }));
          };
          setValue('max-new-tokens', '1');
          setValue('sampling-mode', 'greedy');
          const generate = document.querySelector('[data-testid="generate"]');
          if (!(generate instanceof HTMLButtonElement)) {
            cleanup();
            reject(new Error('Generate button missing'));
            return;
          }
          generate.click();
        })""",
    )
    require(
        number(generation["stepCount"], "Generated step count") == 1,
        f"Generation evidence failed: {generation}",
    )
    replay = evaluate_dict(
        browser,
        """new Promise((resolve, reject) => {
          let request;
          const cleanup = () => {
            clearTimeout(timeout);
            removeEventListener('learningworkerrequest', receiveRequest);
            removeEventListener('learningworkerresponse', receiveResponse);
          };
          const receiveRequest = (event) => {
            if (event.detail?.type === 'inspect_generation_step') {
              request = event.detail;
            }
          };
          const receiveResponse = (event) => {
            const response = event.detail;
            if (response?.type === 'error') {
              cleanup();
              reject(new Error(response.message));
            }
            if (response?.type !== 'generation_step_trace') return;
            cleanup();
            requestAnimationFrame(() => requestAnimationFrame(() => resolve({
              requestType: request?.type ?? '',
              requestId: request?.request_id ?? -1,
              responseRequestId: response.request_id,
              generationRunId: response.generation_run_id,
              stepIndex: response.step_index,
              sequenceLength: response.summary.tokens.length,
              selected:
                document.querySelector('.generation-steps button')
                ?.getAttribute('aria-current') === 'step',
              runtimeVisible:
                document.querySelector('.runtime-panel .token-details')
                instanceof HTMLElement,
            })));
          };
          addEventListener('learningworkerrequest', receiveRequest);
          addEventListener('learningworkerresponse', receiveResponse);
          const timeout = setTimeout(() => {
            cleanup();
            reject(new Error('replay timeout'));
          }, 20000);
          const step = document.querySelector('.generation-steps button');
          if (!(step instanceof HTMLButtonElement)) {
            cleanup();
            reject(new Error('Step button missing'));
            return;
          }
          step.click();
        })""",
    )
    require(
        replay["requestType"] == "inspect_generation_step"
        and replay["requestId"] == replay["responseRequestId"]
        and replay["stepIndex"] == 0
        and number(replay["sequenceLength"], "Replay sequence") > 0
        and replay["selected"] is True
        and replay["runtimeVisible"] is True,
        f"Replay evidence failed: {replay}",
    )
    return {"generation": generation, "replay": replay}


def _go_lab(browser: ChromeSession) -> None:
    navigate_hash(
        browser,
        "#/lab",
        "document.querySelector('[data-app-view=\"lab\"]') !== null",
        "Lab",
    )
    browser.require_cdp().evaluate(
        browser.page_session,
        "window.scrollTo({ top: 0, left: 0, behavior: 'auto' })",
        True,
    )
    wait_for(browser, "scrollY === 0", "Lab top")
    settle(browser)


def _lab_geometry(browser: ChromeSession) -> JsonObject:
    probe = evaluate_dict(
        browser,
        f"""(() => {{
          const rect = (selector) =>
            document.querySelector(selector)?.getBoundingClientRect();
          const boundaries = {json.dumps(LAB_BOUNDARIES)}.map((id) => {{
            const node = document.querySelector(`[data-boundary-id="${{id}}"]`);
            const box = node?.getBoundingClientRect();
            return {{
              id,
              left: box?.left ?? -1,
              right: box?.right ?? -1,
              width: box?.width ?? -1,
              height: box?.height ?? -1,
              color: node ? getComputedStyle(node).backgroundColor : '',
            }};
          }});
          const regions = [
            '.lab-introduction',
            '.generation-bar',
            '.continuation-panel',
            '.runtime-panel',
            '.lab-inspection',
          ].map((selector) => {{
            const box = rect(selector);
            return {{
              selector,
              left: box?.left ?? -1,
              right: box?.right ?? -1,
              top: box?.top ?? -1,
              bottom: box?.bottom ?? -1,
            }};
          }});
          const verticalOffenders = [...document.querySelectorAll(
            '.lab-workspace *',
          )].flatMap((node) => {{
            if (!(node instanceof HTMLElement)) return [];
            if (node.matches('input, select, textarea')) return [];
            if (node.closest('.threeui-action-host')) return [];
            const box = node.getBoundingClientRect();
            const style = getComputedStyle(node);
            return (
              Number.parseFloat(style.borderInlineStartWidth) >= 1
              && box.height > 80
            ) ? [{{
              className: node.className,
              height: box.height,
              border: style.borderInlineStartWidth,
            }}] : [];
          }});
          return {{
            boundaries,
            regions,
            verticalOffenders,
            clientWidth: document.documentElement.clientWidth,
            overflow:
              document.documentElement.scrollWidth
              - document.documentElement.clientWidth,
          }};
        }})()""",
    )
    boundaries = probe["boundaries"]
    regions = probe["regions"]
    require(isinstance(boundaries, list), f"Lab boundaries missing: {probe}")
    require(isinstance(regions, list), f"Lab regions missing: {probe}")
    require(
        all(
            abs(number(item["left"], "Lab boundary left")) <= 1
            and abs(
                number(item["right"], "Lab boundary right")
                - number(probe["clientWidth"], "client width")
            )
            <= 1
            and abs(number(item["height"], "Lab boundary height") - 1) <= 0.1
            for item in boundaries
            if isinstance(item, dict)
        ),
        f"Lab structural bounds diverged: {probe}",
    )
    region_lefts = {
        round(number(item["left"], "Lab region left"), 1)
        for item in regions
        if isinstance(item, dict)
    }
    region_rights = {
        round(number(item["right"], "Lab region right"), 1)
        for item in regions
        if isinstance(item, dict)
    }
    region_tops = [
        number(item["top"], "Lab region top")
        for item in regions
        if isinstance(item, dict)
    ]
    require(
        len(region_lefts) == 1
        and len(region_rights) == 1
        and region_tops == sorted(region_tops),
        f"Lab regions do not share one stack: {probe}",
    )
    require(
        probe["verticalOffenders"] == [] and probe["overflow"] == 0,
        f"Lab vertical or overflow regression: {probe}",
    )
    return probe


def _overlay_geometry(browser: ChromeSession, kind: str) -> JsonObject:
    probe = evaluate_dict(
        browser,
        f"""(() => {{
          const viewer = document.querySelector('#focused-viewer');
          const viewerRect = viewer?.getBoundingClientRect();
          const innerLeft = (viewerRect?.left ?? -1) + (viewer?.clientLeft ?? 0);
          const innerRight = innerLeft + (viewer?.clientWidth ?? 0);
          const body = viewer?.querySelector('.focused-viewer__body');
          const bodyRect = body?.getBoundingClientRect();
          const bodyLeft = (bodyRect?.left ?? -1) + (body?.clientLeft ?? 0);
          const bodyRight = bodyLeft + (body?.clientWidth ?? 0);
          const ids = {json.dumps(["overlay-header", "architecture-controls", "architecture-caption"] if kind == "architecture" else ["overlay-header", "score-renderer", "score-legend"])};
          const boundaries = ids.flatMap((id) => {{
            const node = viewer?.querySelector(`[data-boundary-id="${{id}}"]`);
            if (!(node instanceof HTMLElement)) return [];
            const box = node.getBoundingClientRect();
            return [{{
              id,
              left: box.left,
              right: box.right,
              width: box.width,
              height: box.height,
              color: getComputedStyle(node).backgroundColor,
            }}];
          }});
          const surface = viewer?.querySelector(
            '[data-testid="diagram-viewport-surface"]',
          );
          const status = viewer?.querySelector('.architecture-viewer-status');
          return {{
            boundaries,
            innerLeft,
            innerRight,
            bodyLeft,
            bodyRight,
            viewerLeft: viewerRect?.left ?? -1,
            viewerRight: viewerRect?.right ?? -1,
            outerBorder: viewer ? getComputedStyle(viewer).borderWidth : '',
            diagramBorder: surface ? getComputedStyle(surface).borderWidth : '',
            statusVisible:
              status instanceof HTMLElement
              && status.getBoundingClientRect().height > 0,
            overflow:
              document.documentElement.scrollWidth
              - document.documentElement.clientWidth,
          }};
        }})()""",
    )
    boundaries = probe["boundaries"]
    require(isinstance(boundaries, list), f"Overlay boundaries missing: {probe}")
    required = 2 if kind == "architecture" else 3
    require(len(boundaries) >= required, f"Overlay boundary count: {probe}")
    require(
        all(
            abs(
                number(item["left"], "Overlay boundary left")
                - number(
                    probe[
                        "innerLeft"
                        if item["id"] == "overlay-header"
                        else "bodyLeft"
                    ],
                    "Overlay boundary left scope",
                )
            )
            <= 1
            and abs(
                number(item["right"], "Overlay boundary right")
                - number(
                    probe[
                        "innerRight"
                        if item["id"] == "overlay-header"
                        else "bodyRight"
                    ],
                    "Overlay boundary right scope",
                )
            )
            <= 1
            and abs(number(item["height"], "Overlay boundary height") - 1)
            <= 0.1
            for item in boundaries
            if isinstance(item, dict)
            and item["id"] != "score-selected-column"
        ),
        f"Overlay structural bounds diverged: {probe}",
    )
    require(probe["overflow"] == 0, f"Overlay document overflow: {probe}")
    if kind == "architecture":
        require(
            probe["outerBorder"] in ("0px", "1px")
            and probe["diagramBorder"] == "0px"
            and probe["statusVisible"] is True,
            f"Architecture nested framing or status: {probe}",
        )
    return probe


def _score_geometry(browser: ChromeSession, stacked: bool) -> JsonObject:
    probe = evaluate_dict(
        browser,
        """(() => {
          const main = document.querySelector('.score-matrix-main');
          const divider = document.querySelector(
            '[data-boundary-id="score-selected-column"]',
          );
          const stage = document.querySelector('.score-matrix-stage');
          const selection = document.querySelector(
            '.score-matrix-selection--primary',
          );
          const legend = document.querySelector('.score-matrix-legend-region');
          const m = main?.getBoundingClientRect();
          const d = divider?.getBoundingClientRect();
          const s = stage?.getBoundingClientRect();
          const selected = selection?.getBoundingClientRect();
          const l = legend?.getBoundingClientRect();
          return {
            main: m ? {
              left: m.left, right: m.right, top: m.top, bottom: m.bottom,
              width: m.width, height: m.height,
            } : null,
            divider: d ? {
              left: d.left, right: d.right, top: d.top, bottom: d.bottom,
              width: d.width, height: d.height,
            } : null,
            stage: s ? {
              left: s.left, right: s.right, top: s.top, bottom: s.bottom,
            } : null,
            selection: selected ? {
              left: selected.left, right: selected.right,
              top: selected.top, bottom: selected.bottom,
            } : null,
            legendTop: l?.top ?? -1,
            legendVisible: !!l && l.height > 0,
            renderer: document.querySelector(
              '.score-matrix-canvas canvas[data-render-state="ready"]',
            ) !== null,
            queryAxis: document.querySelector('[aria-label="Query axis"]')
              !== null,
            keyAxis: document.querySelector('[aria-label="Key axis"]') !== null,
            zeroPlane: document.querySelector('.score-matrix-zero-plane')
              ?.textContent?.includes('0 plane') ?? false,
            selectedColumnCount: document.querySelectorAll(
              '.score-matrix-main__divider',
            ).length,
          };
        })()""",
    )
    main = probe["main"]
    divider = probe["divider"]
    stage = probe["stage"]
    selection = probe["selection"]
    require(
        all(isinstance(item, dict) for item in (main, divider, stage, selection)),
        f"Score regions missing: {probe}",
    )
    assert isinstance(main, dict)
    assert isinstance(divider, dict)
    assert isinstance(stage, dict)
    assert isinstance(selection, dict)
    if stacked:
        require(
            abs(number(divider["height"], "Stack divider height") - 1) <= 0.1
            and abs(
                number(divider["width"], "Stack divider width")
                - number(main["width"], "Score main width")
            )
            <= 1
            and number(selection["top"], "Selection top")
            >= number(divider["bottom"], "Stack divider bottom"),
            f"Score Matrix did not stack: {probe}",
        )
    else:
        require(
            abs(number(divider["width"], "Column divider width") - 1) <= 0.1
            and abs(
                number(divider["top"], "Column divider top")
                - number(main["top"], "Score main top")
            )
            <= 1
            and abs(
                number(divider["bottom"], "Column divider bottom")
                - number(main["bottom"], "Score main bottom")
            )
            <= 1
            and number(stage["right"], "Stage right")
            <= number(divider["left"], "Column divider left") + 1
            and number(selection["left"], "Selection left")
            >= number(divider["right"], "Column divider right") - 1,
            f"Score Matrix column divider is discontinuous: {probe}",
        )
    require(
        probe["renderer"] is True
        and probe["queryAxis"] is True
        and probe["keyAxis"] is True
        and probe["zeroPlane"] is True
        and probe["legendVisible"] is True
        and probe["selectedColumnCount"] == 1
        and number(probe["legendTop"], "Legend top")
        >= number(main["bottom"], "Score main bottom"),
        f"Score Matrix semantic regions failed: {probe}",
    )
    return probe


def run_contract(url: str, screenshots: Path, evidence_path: Path) -> None:
    evidence: JsonObject = {"viewports": []}
    with ChromeSession(enable_gpu=True) as browser:
        cdp = browser.require_cdp()
        cdp.send(
            "Page.addScriptToEvaluateOnNewDocument",
            {"source": INSTRUMENT_LEARNING_WORKSPACE},
            browser.page_session,
        )
        browser.navigate(url)
        cdp.evaluate(browser.page_session, READY_PROBE, True)
        wait_for(
            browser,
            "document.querySelector('.architecture-app') !== null",
            "Application shell",
        )
        wait_for(
            browser,
            "['ready', 'complete'].includes("
            "document.querySelector('[data-threeui-status]')"
            "?.getAttribute('data-threeui-status') ?? '')",
            "Model ready",
        )

        set_viewport(browser, 1440, 900)
        _go_lab(browser)
        evidence["runtime"] = _prepare_runtime(browser)
        _lab_geometry(browser)
        capture(browser, screenshots / "lab-1440.png")

        _open_lab_architecture(browser)
        evidence["architecture1440"] = _overlay_geometry(browser, "architecture")
        capture(browser, screenshots / "architecture-1440.png")
        _select_attention_head_two(browser)
        _close_viewer(browser)

        evidence["scoreRenderer"] = _mount_score_matrix(browser)
        matrix = canvas_metrics(browser)
        _require_matrix_contract(matrix)
        evidence["scoreParity"] = matrix
        evidence["scoreSelection1440"] = select_canvas_cell(browser)
        evidence["score1440"] = {
            **_overlay_geometry(browser, "visualization"),
            **_score_geometry(browser, stacked=False),
        }
        capture(browser, screenshots / "score-matrix-1440.png")
        _close_viewer(browser)

        responsive = []
        for width, height in VIEWPORTS:
            set_viewport(browser, width, height)
            _go_lab(browser)
            lab = _lab_geometry(browser)
            if width == 390:
                capture(browser, screenshots / "lab-390.png")

            architecture_workflow = _open_lab_architecture(browser)
            architecture = _overlay_geometry(browser, "architecture")
            if width == 390:
                capture(browser, screenshots / "architecture-390.png")
            _close_viewer(browser)

            _open_score_viewer(browser)
            wait_for(
                browser,
                "document.querySelector('.score-matrix-canvas canvas')"
                "?.dataset.renderState === 'ready'",
                f"Score Matrix {width}",
            )
            settle(browser)
            if width in (390, 1024):
                select_canvas_cell(browser)
            score_overlay = _overlay_geometry(browser, "visualization")
            score = _score_geometry(browser, stacked=width <= 1024)
            if width in (390, 1024):
                capture(
                    browser,
                    screenshots / f"score-matrix-{width}.png",
                )
            _close_viewer(browser)
            responsive.append(
                {
                    "width": width,
                    "height": height,
                    "lab": lab,
                    "architectureWorkflow": architecture_workflow,
                    "architecture": architecture,
                    "scoreOverlay": score_overlay,
                    "score": score,
                }
            )
        evidence["viewports"] = responsive

    evidence_path.parent.mkdir(parents=True, exist_ok=True)
    evidence_path.write_text(
        json.dumps(evidence, ensure_ascii=False, indent=2) + "\n",
    )
    print("Lab viewer structural browser contract: PASS (6 viewports, 7 screenshots)")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--url", default="http://127.0.0.1:5173/")
    parser.add_argument(
        "--screenshots",
        type=Path,
        default=Path(".omo/evidence/lab-viewer-pass/final"),
    )
    parser.add_argument(
        "--evidence",
        type=Path,
        default=Path(".omo/evidence/lab-viewer-pass/final-browser.json"),
    )
    args = parser.parse_args()
    run_contract(args.url, args.screenshots, args.evidence)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
