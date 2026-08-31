"""Motion, keyboard, and navigation evidence for Golden Chapter 0.1."""

from __future__ import annotations

import json
from pathlib import Path
from typing import TypeAlias

from browser_hybrid_capture import capture
from browser_hybrid_contract import number, require
from browser_hybrid_helpers import (
    JsonObject,
    evaluate_dict,
    pointer_click,
    settle,
    wait_for,
)
from browser_session import ChromeSession
import golden_chapter_browser_probes as golden

ReducedMotionEvidence: TypeAlias = dict[str, JsonObject]


def capture_mid_transition(
    browser: ChromeSession,
    label: str,
    stage: str,
    path: Path,
) -> str:
    count = browser.require_cdp().evaluate(
        browser.page_session,
        f"""new Promise((resolve, reject) => {{
          const button = Array.from(
            document.querySelectorAll('.visual-narrative__steps button'),
          ).find(item => item.textContent?.trim() === {json.dumps(label)});
          if (!(button instanceof HTMLButtonElement)) {{
            reject(new Error('Golden transition button missing'));
            return;
          }}
          button.click();
          requestAnimationFrame(() => requestAnimationFrame(() => {{
            const visual = document.querySelector(
              '{golden.VISUAL_SELECTOR}',
            );
            const animations = visual?.getAnimations({{subtree: true}}) ?? [];
            for (const animation of animations) {{
              const endTime = Number(
                animation.effect?.getComputedTiming().endTime ?? 0,
              );
              animation.pause();
              animation.currentTime = endTime / 2;
            }}
            resolve(animations.length);
          }}));
        }})""",
        True,
    )
    require(isinstance(count, int) and count > 0, f"Golden transition: {count}")
    result = capture(browser, path)
    browser.require_cdp().evaluate(
        browser.page_session,
        """document.getAnimations().forEach(animation => animation.finish())""",
        True,
    )
    wait_for(
        browser,
        f"document.querySelector('{golden.VISUAL_SELECTOR}')"
        f"?.getAttribute('data-nlp-stage') === {json.dumps(stage)}",
        f"Golden transition finish {stage}",
    )
    settle(browser)
    return result


def reduced_motion_contract(
    browser: ChromeSession,
    url: str,
    evidence: Path,
) -> ReducedMotionEvidence:
    browser.require_cdp().send(
        "Emulation.setEmulatedMedia",
        {
            "features": [
                {"name": "prefers-reduced-motion", "value": "reduce"},
            ],
        },
        browser.page_session,
    )
    golden.open_chapter(browser, url)
    results: ReducedMotionEvidence = {}
    for label, stage, _filename in golden.STATES:
        golden.select_state(browser, label, stage)
        data = evaluate_dict(
            browser,
            """(() => ({
              activeSummaryCount: document.querySelectorAll(
                '[data-nlp-fallback-stage][aria-current="step"]',
              ).length,
              cellsMs: parseFloat(getComputedStyle(
                document.querySelector('[data-testid="nlp-golden-cells"]'),
              ).transitionDuration) * 1000,
              sentenceMs: parseFloat(getComputedStyle(
                document.querySelector('[data-testid="nlp-golden-sentence"]'),
              ).transitionDuration) * 1000,
              stage: document.querySelector(
                '[data-testid="nlp-golden-visual"]',
              )?.getAttribute('data-nlp-stage') ?? '',
              visualMs: parseFloat(getComputedStyle(
                document.querySelector('.visual-narrative__visual'),
              ).transitionDuration) * 1000,
            }))()""",
        )
        require(data["stage"] == stage, f"Golden reduced state: {data}")
        require(
            data["activeSummaryCount"] == 1
            and all(
                isinstance(value, int | float) and value <= 1
                for key, value in data.items()
                if key.endswith("Ms")
            ),
            f"Golden reduced motion: {data}",
        )
        results[stage] = data
    capture(browser, evidence / "12-reduced-motion-token-preview.png")
    return results


def capture_keyboard_focus(browser: ChromeSession, path: Path) -> str:
    browser.require_cdp().evaluate(
        browser.page_session,
        """Array.from(
          document.querySelectorAll('.visual-narrative__steps button'),
        ).find(button => button.textContent?.trim() === '숫자 표현')?.focus()""",
        True,
    )
    bounds = evaluate_dict(
        browser,
        """(() => {
          const controls = document.querySelector('.visual-narrative__steps');
          const rect = controls?.getBoundingClientRect();
          return {
            bottom: rect?.bottom ?? -1,
            height: rect?.height ?? -1,
            left: rect?.left ?? -1,
            right: rect?.right ?? -1,
            top: rect?.top ?? -1,
          };
        })()""",
    )
    require(
        number(bounds["height"], "Golden keyboard height") >= 44
        and number(bounds["left"], "Golden keyboard left") >= 0
        and number(bounds["right"], "Golden keyboard right") <= 1440,
        f"Golden keyboard rail: {bounds}",
    )
    return capture(browser, path)


def click_token_footer(browser: ChromeSession) -> JsonObject:
    pointer_click(
        browser,
        "document.querySelector('a[aria-label=\"다음: Token이란?\"]')",
        condition=(
            "document.querySelector("
            "'[data-curriculum-chapter-id=\"decoder.chapter.0.2\"]'"
            ") !== null"
        ),
        label="Golden Token footer",
    )
    result = evaluate_dict(
        browser,
        """(() => ({
          focused: document.activeElement?.id ?? '',
          hash: location.hash,
        }))()""",
    )
    require(
        result["hash"] == "#/learn/decoder-only-fundamentals/0-2"
        and result["focused"] == "curriculum-chapter-title",
        f"Golden Token navigation: {result}",
    )
    return result
