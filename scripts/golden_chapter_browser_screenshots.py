"""Deterministic screenshot names for the Chapter 0.1 deck."""

from __future__ import annotations

from pathlib import Path

from browser_hybrid_capture import capture
from browser_hybrid_contract import set_viewport
from browser_session import ChromeSession
from browser_visual_narrative import _capture_chapter
import golden_chapter_browser_probes as golden

_DESKTOP_NAMES = (
    "01-language.png",
    "02-numeric.png",
    "03-transform.png",
    "04-result.png",
    "05-token-preview.png",
)
_MOBILE_NAMES = (
    "07-slide-language-390.png",
    "08-slide-numeric-390.png",
    "09-slide-transform-390.png",
    "10-slide-result-390.png",
    "11-slide-token-390.png",
)


def capture_baseline(url: str, evidence: Path) -> dict[str, str]:
    shots: dict[str, str] = {}
    with ChromeSession(enable_gpu=True) as browser:
        set_viewport(browser, 1440, 900)
        golden.open_chapter(browser, url)
        for index, (stage, _label) in enumerate(golden.STATES):
            golden.select_state(browser, index, stage)
            golden.position_deck(browser)
            golden.finish_motion(browser)
            name = f"before-{index + 1:02d}-{stage}.png"
            shots[name] = capture(browser, evidence / name)
    return shots


def capture_matrix(
    browser: ChromeSession,
    url: str,
    evidence: Path,
) -> dict[str, str]:
    shots: dict[str, str] = {}
    for width, height in golden.VIEWPORTS:
        set_viewport(browser, width, height)
        golden.open_chapter(browser, url)
        for index, (stage, _label) in enumerate(golden.STATES):
            golden.select_state(browser, index, stage)
            golden.position_deck(browser)
            golden.finish_motion(browser)
            matrix_name = f"viewport-{width}x{height}-{index + 1:02d}-{stage}.png"
            shots[matrix_name] = capture(browser, evidence / matrix_name)
            canonical = None
            if (width, height) == (1440, 900):
                canonical = _DESKTOP_NAMES[index]
            elif (width, height) == (390, 844):
                canonical = _MOBILE_NAMES[index]
            if canonical is not None:
                shots[canonical] = capture(browser, evidence / canonical)
            if (width, height) == (1440, 900) and index in (0, 2, 4):
                browser.require_cdp().evaluate(
                    browser.page_session,
                    "window.scrollTo({top: 0, left: 0, behavior: 'instant'})",
                    True,
                )
                golden.finish_motion(browser)
                full_name = f"full-chapter-{index + 1:02d}-{stage}.png"
                shots[full_name] = _capture_chapter(
                    browser,
                    golden.CHAPTER_SELECTOR,
                    evidence / full_name,
                )
        if (width, height) == (1440, 900):
            browser.require_cdp().evaluate(
                browser.page_session,
                "window.scrollTo({top: 0, left: 0, behavior: 'instant'})",
                True,
            )
            golden.finish_motion(browser)
            shots["06-full-chapter.png"] = _capture_chapter(
                browser, golden.CHAPTER_SELECTOR, evidence / "06-full-chapter.png",
            )
    return shots
