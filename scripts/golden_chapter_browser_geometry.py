"""Geometry contracts for the Chapter 0.1 Golden Narrative."""

from __future__ import annotations

import json
from typing import Final

from browser_hybrid_contract import number, require, set_viewport
from browser_hybrid_helpers import JsonObject, evaluate_dict
from browser_session import ChromeSession
import golden_chapter_browser_capture as golden_capture
import golden_chapter_browser_probes as golden


DESKTOP_VIEWPORTS: Final = (
    (1024, 768), (1366, 768), (1440, 900), (2000, 1284),
)


def collect_desktop_grid_geometry(
    browser: ChromeSession,
    url: str,
    viewport: tuple[int, int],
) -> list[JsonObject]:
    """Verify every beat uses one shared desktop explanation/visual grid."""
    width, height = viewport
    set_viewport(browser, width, height)
    golden.open_chapter(browser, url)
    measurements: list[JsonObject] = []
    for label, stage, _filename in golden.STATES:
        golden.select_state(browser, label, stage)
        golden_capture.center_capture(browser, stage)
        golden.select_state(browser, label, stage)
        boxes = evaluate_dict(
            browser,
            f"""(() => {{
              const chapter = document.querySelector('{golden.CHAPTER_SELECTOR}');
              const beat = chapter?.querySelector(
                '.visual-narrative__beat[data-narrative-stage={json.dumps(stage)}]',
              );
              const narrative = chapter?.querySelector('.visual-narrative--golden');
              const visual = narrative?.querySelector(
                ':scope > .visual-narrative__visual',
              );
              const content = chapter?.querySelector(
                '.learning-guide-section-heading',
              );
              const guide = chapter?.querySelector('.learning-guide');
              const rect = element => element?.getBoundingClientRect();
              const beatRect = rect(beat);
              const visualRect = rect(visual);
              const narrativeRect = rect(narrative);
              const contentRect = rect(content);
              const guideRect = rect(guide);
              const field = narrative?.querySelector(
                '[data-testid="nlp-golden-numeric-field"]',
              );
              const fieldRect = rect(field);
              const result = narrative?.querySelector('.nlp-golden__result');
              const resultRect = rect(result);
              const cells = narrative?.querySelector('.nlp-golden__cells');
              const cellsLabel = narrative?.querySelector(
                '.nlp-golden__cells-label',
              );
              const sentenceRect = rect(
                narrative?.querySelector('.nlp-golden__sentence'),
              );
              const tokenRect = rect(
                narrative?.querySelector('.nlp-golden__token-note'),
              );
              return {{
                accentContent: beat instanceof Element
                  ? getComputedStyle(beat, '::before').content
                  : '',
                cellsOpacity: cells instanceof Element
                  ? Number.parseFloat(getComputedStyle(cells).opacity)
                  : -1,
                cellsLabelOpacity: cellsLabel instanceof Element
                  ? Number.parseFloat(getComputedStyle(cellsLabel).opacity)
                  : -1,
                contentLeft: contentRect?.left ?? -1,
                explanationLeft: beatRect?.left ?? -1,
                explanationWidth: beatRect?.width ?? -1,
                fieldBottom: fieldRect?.bottom ?? -1,
                fieldCenter: (fieldRect?.left ?? -1)
                  + (fieldRect?.width ?? 0) / 2,
                narrativeLeft: narrativeRect?.left ?? -1,
                narrativeRight: narrativeRect?.right ?? -1,
                narrativeWidth: narrativeRect?.width ?? -1,
                resultCenter: (resultRect?.left ?? -1)
                  + (resultRect?.width ?? 0) / 2,
                resultTop: resultRect?.top ?? -1,
                sentenceCenter: (sentenceRect?.left ?? -1)
                  + (sentenceRect?.width ?? 0) / 2,
                stage: {json.dumps(stage)},
                tokenCenter: (tokenRect?.left ?? -1)
                  + (tokenRect?.width ?? 0) / 2,
                visualCenter: (visualRect?.left ?? -1)
                  + (visualRect?.width ?? 0) / 2,
                visualLeft: visualRect?.left ?? -1,
                visualWidth: visualRect?.width ?? -1,
                wideRight: guideRect?.right ?? -1,
              }};
            }})()""",
        )
        measurements.append(boxes)

    baseline = measurements[0]
    for current in measurements:
        for key in (
            "explanationLeft",
            "explanationWidth",
            "narrativeLeft",
            "narrativeWidth",
            "visualLeft",
            "visualWidth",
        ):
            delta = abs(
                number(current[key], f"Golden {key}")
                - number(baseline[key], f"Golden baseline {key}"),
            )
            require(delta <= 1, f"Golden desktop grid drift at {width}: {measurements}")
        gap = number(current["visualLeft"], "Golden visual left") - (
            number(current["explanationLeft"], "Golden explanation left")
            + number(current["explanationWidth"], "Golden explanation width")
        )
        require(
            55 <= gap <= 73,
            f"Golden desktop grid gap at {width}: {measurements}",
        )
        require(
            current["accentContent"] == "none",
            f"Golden ambiguous accent line at {width}: {measurements}",
        )
        left_delta = abs(
            number(current["explanationLeft"], "Golden LEFT_START")
            - number(current["contentLeft"], "Golden CONTENT_START"),
        )
        require(left_delta <= 1, f"Golden LEFT_START at {width}: {measurements}")
        right_delta = abs(
            number(current["narrativeRight"], "Golden RIGHT_END")
            - number(current["wideRight"], "Golden WIDE_END"),
        )
        require(right_delta <= 1, f"Golden RIGHT_END at {width}: {measurements}")
        for key in ("fieldCenter", "resultCenter", "sentenceCenter", "tokenCenter"):
            center_delta = abs(
                number(current[key], f"Golden {key}")
                - number(current["visualCenter"], "Golden visual center"),
            )
            require(
                center_delta <= 1,
                f"Golden visual anchor drift at {width}: {measurements}",
            )
        if current["stage"] == "result":
            require(
                number(current["cellsLabelOpacity"], "Golden result field label")
                <= 0.01,
                f"Golden result field label clutter at {width}: {measurements}",
            )
            require(
                number(current["fieldBottom"], "Golden result field bottom") + 2
                <= number(current["resultTop"], "Golden result top"),
                f"Golden desktop result collision at {width}: {measurements}",
            )
        if current["stage"] == "token-preview":
            require(
                number(current["cellsOpacity"], "Golden Token field opacity")
                <= 0.01,
                f"Golden Token ghost field at {width}: {measurements}",
            )
    return measurements


def collect_representation_geometry(
    browser: ChromeSession,
    url: str,
) -> list[JsonObject]:
    """Verify Numeric and Transform share one unchanged representation field."""
    set_viewport(browser, 1440, 900)
    golden.open_chapter(browser, url)
    golden_capture.center_visual(browser)
    measurements: list[JsonObject] = []
    for label, stage in (("숫자 표현", "numeric"), ("표현 변화", "transform")):
        golden.select_state(browser, label, stage)
        boxes = evaluate_dict(
            browser,
            f"""(() => {{
              const field = document.querySelector(
                '[data-testid="nlp-golden-numeric-field"]',
              );
              const fieldRect = field?.getBoundingClientRect();
              const cells = Array.from(
                field?.querySelectorAll('[data-nlp-cell]') ?? [],
              );
              const firstCell = cells[0]?.getBoundingClientRect();
              return {{
                cellCount: cells.length,
                cellHeight: firstCell?.height ?? -1,
                cellWidth: firstCell?.width ?? -1,
                columnCount: Number(field?.getAttribute('data-nlp-columns') ?? -1),
                fieldHeight: fieldRect?.height ?? -1,
                fieldLeft: fieldRect?.left ?? -1,
                fieldTop: fieldRect?.top ?? -1,
                fieldWidth: fieldRect?.width ?? -1,
                groupCount: document.querySelectorAll(
                  '[data-nlp-cell-group]',
                ).length,
                rowCount: Number(field?.getAttribute('data-nlp-rows') ?? -1),
                stage: {json.dumps(stage)},
              }};
            }})()""",
        )
        require(boxes["cellCount"] == 16, f"Golden cell count: {boxes}")
        require(boxes["groupCount"] == 0, f"Golden grouped matrices: {boxes}")
        require(boxes["rowCount"] == 2, f"Golden numeric rows: {boxes}")
        require(boxes["columnCount"] == 8, f"Golden numeric columns: {boxes}")
        measurements.append(boxes)

    numeric, transformed = measurements
    for key in (
        "fieldHeight",
        "fieldLeft",
        "fieldTop",
        "fieldWidth",
        "cellHeight",
        "cellWidth",
    ):
        delta = abs(
            number(numeric[key], f"Golden numeric {key}")
            - number(transformed[key], f"Golden transform {key}"),
        )
        require(delta <= 1, f"Golden representation geometry drift: {measurements}")
    return measurements


def verify_mobile_geometry(
    browser: ChromeSession,
    url: str,
    viewport: tuple[int, int],
) -> list[JsonObject]:
    """Verify every mobile state keeps one stable visual width."""
    width, height = viewport
    set_viewport(browser, width, height)
    golden.open_chapter(browser, url)
    geometry: list[JsonObject] = []
    for label, stage, _filename in golden.STATES:
        golden.select_state(browser, label, stage)
        golden_capture.center_capture(browser, stage)
        golden.select_state(browser, label, stage)
        geometry.append(
            golden_capture.assert_mobile_state_geometry(browser, stage),
        )
    widths = [
        number(item["visualWidth"], "Golden mobile visual width")
        for item in geometry
    ]
    require(
        max(widths) - min(widths) <= 1,
        f"Golden mobile width drift: {geometry}",
    )
    return geometry
