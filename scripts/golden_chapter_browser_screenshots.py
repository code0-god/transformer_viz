"""Additional viewport captures for the Chapter 0.1 Golden Narrative."""

from __future__ import annotations

import json
from pathlib import Path

from browser_hybrid_capture import capture
from browser_hybrid_contract import set_viewport
from browser_hybrid_helpers import wait_for
from browser_probes import READY_PROBE
from browser_session import ChromeSession
import golden_chapter_browser_capture as golden_capture
import golden_chapter_browser_probes as golden


def capture_baseline(url: str, evidence: Path) -> str:
    """Capture the pre-refinement Chapter 0.1 Figure."""
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


def capture_additional_desktop(
    browser: ChromeSession,
    url: str,
    evidence: Path,
) -> dict[str, str]:
    """Capture the Numeric split layout at intermediate desktop widths."""
    shots: dict[str, str] = {}
    states = (
        (1024, 768, "숫자 표현", "numeric", "desktop-1024-numeric.png"),
        (1366, 768, "숫자 표현", "numeric", "desktop-1366-numeric.png"),
        (2000, 1284, "사람의 언어", "language", "desktop-2000-language.png"),
    )
    for width, height, label, stage, filename in states:
        set_viewport(browser, width, height)
        golden.open_chapter(browser, url)
        golden.select_state(browser, label, stage)
        golden_capture.center_capture(browser, stage)
        golden.select_state(browser, label, stage)
        shots[f"desktop-{width}-{stage}"] = capture(
            browser,
            evidence / filename,
        )
    return shots


def capture_compact_mobile_states(
    browser: ChromeSession,
    url: str,
    evidence: Path,
) -> dict[str, str]:
    """Capture required 320px Numeric, Transform, and Result states."""
    set_viewport(browser, 320, 568)
    golden.open_chapter(browser, url)
    shots: dict[str, str] = {}
    for label, stage in (
        ("숫자 표현", "numeric"),
        ("표현 변화", "transform"),
        ("활용 결과", "result"),
    ):
        golden.select_state(browser, label, stage)
        golden_capture.center_capture(browser, stage)
        golden.select_state(browser, label, stage)
        shots[f"mobile-320-{stage}"] = capture(
            browser,
            evidence / f"mobile-320-{stage}.png",
        )
    return shots
