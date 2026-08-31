"""Capture helpers for Chapter 0.1 Golden Narrative evidence."""

from __future__ import annotations

import json
from browser_hybrid_contract import number, require
from browser_hybrid_helpers import (
    JsonObject,
    evaluate_dict,
    settle,
    wait_for,
)
from browser_session import ChromeSession
import golden_chapter_browser_probes as golden

def center_visual(browser: ChromeSession) -> None:
    browser.require_cdp().evaluate(
        browser.page_session,
        f"""document.querySelector('{golden.VISUAL_SELECTOR}')
          ?.scrollIntoView({{ block: 'center', inline: 'nearest' }})""",
        True,
    )
    settle(browser)


def center_capture(browser: ChromeSession, stage: str) -> None:
    selector = (
        golden.VISUAL_SELECTOR
        if stage == "language"
        else f'.visual-narrative__beat[data-narrative-stage="{stage}"]'
    )
    browser.require_cdp().evaluate(
        browser.page_session,
        f"""(() => {{
          const target = document.querySelector({json.dumps(selector)});
          if (!(target instanceof HTMLElement)) return;
          if (
            innerWidth <= 768
            && target.matches('.visual-narrative__beat')
          ) {{
            const targetRect = target.getBoundingClientRect();
            const visualRect = document.querySelector(
              '.visual-narrative--golden > .visual-narrative__visual',
            )?.getBoundingClientRect();
            const desiredTop = Math.min(
              innerHeight - targetRect.height - 16,
              (visualRect?.bottom ?? 0) + 16,
            );
            window.scrollBy({{
              behavior: 'instant',
              left: 0,
              top: targetRect.top - desiredTop,
            }});
            return;
          }}
          target.scrollIntoView({{ block: 'center', inline: 'nearest' }});
        }})()""",
        True,
    )
    settle(browser)
    if stage == "language":
        return
    for _ in range(2):
        browser.require_cdp().evaluate(
            browser.page_session,
            f"""(() => {{
              if (innerWidth > 768) return;
              const target = document.querySelector({json.dumps(selector)});
              const visual = document.querySelector(
                '.visual-narrative--golden > .visual-narrative__visual',
              );
              if (!(target instanceof HTMLElement) || !(visual instanceof HTMLElement))
                return;
              const targetRect = target.getBoundingClientRect();
              const visualRect = visual.getBoundingClientRect();
              const desiredTop = visualRect.bottom + 16;
              window.scrollBy({{
                behavior: 'instant',
                left: 0,
                top: targetRect.top - desiredTop,
              }});
            }})()""",
            True,
        )
        settle(browser)
    browser.require_cdp().evaluate(
        browser.page_session,
        "if (innerWidth <= 768) window.scrollBy({top: 13, behavior: 'instant'})",
        True,
    )
    settle(browser)


def reset_scroll(browser: ChromeSession) -> None:
    browser.require_cdp().evaluate(
        browser.page_session,
        "window.scrollTo({top: 0, left: 0, behavior: 'instant'})",
        True,
    )
    wait_for(browser, "scrollY === 0", "Golden document top")


def mark_persistent_objects(browser: ChromeSession) -> None:
    objects = evaluate_dict(
        browser,
        """(() => {
          const sentence = document.querySelector(
            '[data-testid="nlp-golden-sentence"]',
          );
          const cells = document.querySelector(
            '[data-testid="nlp-golden-cells"]',
          );
          sentence?.setAttribute('data-object-permanence', 'sentence');
          cells?.setAttribute('data-object-permanence', 'cells');
          return { sentence: Boolean(sentence), cells: Boolean(cells) };
        })()""",
    )
    require(objects == {"sentence": True, "cells": True}, str(objects))


def assert_object_permanence(browser: ChromeSession, stage: str) -> None:
    objects = evaluate_dict(
        browser,
        """(() => ({
          sentence: document.querySelector(
            '[data-object-permanence="sentence"]',
          ) !== null,
          cells: document.querySelector(
            '[data-object-permanence="cells"]',
          ) !== null,
        }))()""",
    )
    require(
        objects == {"sentence": True, "cells": True},
        f"Golden object replaced at {stage}",
    )


def assert_mobile_order(browser: ChromeSession) -> JsonObject:
    reset_scroll(browser)
    order = evaluate_dict(
        browser,
        """(() => {
          const beats = document.querySelectorAll(
            '.visual-narrative--golden > .visual-narrative__beat',
          );
          const visual = document.querySelector(
            '.visual-narrative--golden > .visual-narrative__visual',
          );
          const first = beats[0]?.getBoundingClientRect();
          const second = beats[1]?.getBoundingClientRect();
          const stage = visual?.getBoundingClientRect();
          return {
            firstTop: first?.top ?? -1,
            firstBottom: first?.bottom ?? -1,
            visualTop: stage?.top ?? -1,
            visualBottom: stage?.bottom ?? -1,
            secondTop: second?.top ?? -1,
          };
        })()""",
    )
    require(
        number(order["firstTop"], "Golden first beat")
        < number(order["visualTop"], "Golden mobile visual")
        < number(order["secondTop"], "Golden second beat"),
        f"Golden mobile source order: {order}",
    )
    return order


def assert_mobile_state_geometry(
    browser: ChromeSession,
    stage: str,
) -> JsonObject:
    boxes = evaluate_dict(
        browser,
        """(() => {
          const box = selector => {
            const element = document.querySelector(selector);
            const rect = element?.getBoundingClientRect();
            return {
              bottom: rect?.bottom ?? -1,
              opacity: Number.parseFloat(
                element ? getComputedStyle(element).opacity : '0',
              ),
              top: rect?.top ?? -1,
            };
          };
           const cells = box('.nlp-golden__cells');
           const activeBeat = box(
             '.visual-narrative__beat[data-narrative-active="true"]',
           );
           const field = box('[data-testid="nlp-golden-numeric-field"]');
           const label = box('.nlp-golden__state-label');
           const result = box('.nlp-golden__result');
           const sentence = box('.nlp-golden__sentence');
           const visual = box('.nlp-golden__visual');
           const visibleCells = Array.from(
             document.querySelectorAll('[data-nlp-cell]'),
           ).filter(cell => getComputedStyle(cell).display !== 'none').length;
           return {
             activeBeatBottom: activeBeat.bottom,
             activeBeatTop: activeBeat.top,
             cellsBottom: cells.bottom,
             cellsOpacity: cells.opacity,
             cellsTop: cells.top,
             fieldBottom: field.bottom,
             labelBottom: label.bottom,
             resultOpacity: result.opacity,
             resultTop: result.top,
             sentenceBottom: sentence.bottom,
             sentenceTop: sentence.top,
             visibleCellCount: visibleCells,
             viewportHeight: innerHeight,
             visualBottom: visual.bottom,
             visualWidth: visual.bottom > visual.top
               ? document.querySelector('.nlp-golden__visual')
                   ?.getBoundingClientRect().width ?? -1
               : -1,
           };
        })()""",
    )
    require(
        number(boxes["labelBottom"], "Golden label bottom") + 7
        <= number(boxes["sentenceTop"], "Golden sentence top"),
        f"Golden mobile label collision at {stage}: {boxes}",
    )
    if stage != "language":
        prose_gap = (
            number(boxes["activeBeatTop"], "Golden mobile active beat top")
            - number(boxes["visualBottom"], "Golden mobile visual bottom")
        )
        require(
            15 <= prose_gap <= 40,
            f"Golden mobile prose occlusion at {stage}: {boxes}",
        )
        require(
            number(boxes["activeBeatBottom"], "Golden mobile active beat bottom")
            <= number(boxes["viewportHeight"], "Golden mobile viewport") - 16,
            f"Golden mobile prose clipping at {stage}: {boxes}",
        )
    require(boxes["visibleCellCount"] == 12, f"Golden mobile cells: {boxes}")
    if number(boxes["cellsOpacity"], "Golden cells opacity") >= 0.1:
        require(
            number(boxes["sentenceBottom"], "Golden sentence bottom") + 3
            <= number(boxes["cellsTop"], "Golden cells top"),
            f"Golden mobile cell collision at {stage}: {boxes}",
        )
    if number(boxes["resultOpacity"], "Golden result opacity") >= 0.1:
        require(
            number(boxes["fieldBottom"], "Golden field bottom") + 2
            <= number(boxes["resultTop"], "Golden result top"),
            f"Golden mobile result collision at {stage}: {boxes}",
        )
    if stage == "token-preview":
        require(
            number(boxes["cellsOpacity"], "Golden Token field opacity") <= 0.01,
            f"Golden mobile Token ghost field: {boxes}",
        )
    return boxes
