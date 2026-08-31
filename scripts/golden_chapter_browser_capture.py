"""Capture helpers for Chapter 0.1 Golden Narrative evidence."""

from __future__ import annotations

import json
from pathlib import Path
from browser_hybrid_capture import capture
from browser_hybrid_contract import number, require, set_viewport
from browser_hybrid_helpers import (
    JsonObject,
    evaluate_dict,
    settle,
    wait_for,
)
from browser_probes import READY_PROBE
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
        else f'[data-narrative-stage="{stage}"]'
    )
    browser.require_cdp().evaluate(
        browser.page_session,
        f"""document.querySelector({json.dumps(selector)})
          ?.scrollIntoView({{ block: 'center', inline: 'nearest' }})""",
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


def capture_baseline(url: str, evidence: Path) -> str:
    with ChromeSession(enable_gpu=True) as browser:
        set_viewport(browser, 1440, 900)
        browser.navigate(url)
        browser.require_cdp().evaluate(browser.page_session, READY_PROBE, True)
        browser.require_cdp().evaluate(
            browser.page_session,
            f"location.hash = {json.dumps(golden.CHAPTER_HASH)}",
            True,
        )
        wait_for(
            browser,
            f"document.querySelector('{golden.CHAPTER_SELECTOR}') !== null",
            "Baseline Chapter",
        )
        wait_for(
            browser,
            "document.querySelector("
            "'[data-figure-id=\"decoder.diagram.intro.nlp\"]'"
            ") !== null",
            "Baseline Figure",
            "document.querySelector("
            "'[data-figure-id=\"decoder.diagram.intro.nlp\"]'"
            ")?.scrollIntoView({block:'center'});",
        )
        return capture(browser, evidence / "00-before-figure.png")


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
          const label = box('.nlp-golden__state-label');
          const result = box('.nlp-golden__result');
          const sentence = box('.nlp-golden__sentence');
          return {
            cellsBottom: cells.bottom,
            cellsOpacity: cells.opacity,
            cellsTop: cells.top,
            labelBottom: label.bottom,
            resultOpacity: result.opacity,
            resultTop: result.top,
            sentenceBottom: sentence.bottom,
            sentenceTop: sentence.top,
          };
        })()""",
    )
    require(
        number(boxes["labelBottom"], "Golden label bottom") + 8
        <= number(boxes["sentenceTop"], "Golden sentence top"),
        f"Golden mobile label collision at {stage}: {boxes}",
    )
    if number(boxes["cellsOpacity"], "Golden cells opacity") >= 0.1:
        require(
            number(boxes["sentenceBottom"], "Golden sentence bottom") + 4
            <= number(boxes["cellsTop"], "Golden cells top"),
            f"Golden mobile cell collision at {stage}: {boxes}",
        )
    if number(boxes["resultOpacity"], "Golden result opacity") >= 0.1:
        require(
            number(boxes["cellsBottom"], "Golden cells bottom") + 2
            <= number(boxes["resultTop"], "Golden result top"),
            f"Golden mobile result collision at {stage}: {boxes}",
        )
    return boxes
