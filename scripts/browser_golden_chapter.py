#!/usr/bin/env python3
# /// script
# requires-python = ">=3.11"
# dependencies = []
# ///
# --- How to run ---
# PYTHONPATH=scripts python3 scripts/browser_golden_chapter.py --help
"""Capture and verify Chapter 0.1 Golden Narrative."""

from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import TypedDict

from browser_hybrid_capture import capture
from browser_hybrid_contract import number, require, set_viewport
from browser_hybrid_helpers import JsonObject, evaluate_dict, navigate_hash
from browser_learning_workspace_probes import browser_errors
from browser_session import ChromeSession
from browser_visual_narrative import _capture_chapter, _install_observer_probe, _serve
import golden_chapter_browser_capture as golden_capture
import golden_chapter_browser_geometry as golden_geometry
import golden_chapter_browser_motion as golden_motion
import golden_chapter_browser_probes as golden
import golden_chapter_browser_screenshots as golden_screenshots


class CandidateEvidence(TypedDict):
    desktopGridGeometry: list[JsonObject]
    errors: dict[str, list[str]]
    matrix: list[golden.Probe]
    mobileOrder: list[JsonObject]
    mobileStateGeometry: list[JsonObject]
    navigation: JsonObject
    observers: JsonObject
    reducedMotion: golden_motion.ReducedMotionEvidence
    representationGeometry: list[JsonObject]
    screenshots: dict[str, str]


def capture_desktop_states(
    browser: ChromeSession,
    evidence: Path,
    shots: dict[str, str],
) -> None:
    golden_capture.mark_persistent_objects(browser)
    heights: list[float] = []
    for label, stage, filename in golden.STATES:
        golden.select_state(browser, label, stage)
        golden_capture.center_capture(browser, stage)
        golden.select_state(browser, label, stage)
        data = golden.probe(browser)
        golden.assert_probe(data, 1440)
        require(data["stage"] == stage, f"Golden capture state: {data}")
        golden_capture.assert_object_permanence(browser, stage)
        heights.append(number(data["visualHeight"], "Golden visual height"))
        shots[stage] = capture(browser, evidence / filename)
    require(max(heights) - min(heights) <= 1, f"Golden CLS: {heights}")


def capture_motion(
    browser: ChromeSession,
    url: str,
    evidence: Path,
    shots: dict[str, str],
) -> None:
    golden.open_chapter(browser, url)
    golden_capture.center_visual(browser)
    golden.select_state(browser, "사람의 언어", "language")
    shots["languageNumericMid"] = golden_motion.capture_mid_transition(
        browser,
        "숫자 표현",
        "numeric",
        evidence / "09-language-numeric-mid.png",
    )
    shots["numericTransformMid"] = golden_motion.capture_mid_transition(
        browser,
        "표현 변화",
        "transform",
        evidence / "10-numeric-transform-mid.png",
    )


def capture_mobile_states(
    browser: ChromeSession,
    url: str,
    evidence: Path,
    shots: dict[str, str],
) -> list[JsonObject]:
    geometry: list[JsonObject] = []
    set_viewport(browser, 390, 844)
    golden.open_chapter(browser, url)
    for label, stage, filename in golden.STATES:
        golden.select_state(browser, label, stage)
        golden_capture.center_capture(browser, stage)
        golden.select_state(browser, label, stage)
        geometry.append(
            golden_capture.assert_mobile_state_geometry(browser, stage),
        )
        shots[f"mobile-{stage}"] = capture(browser, evidence / f"mobile-{filename}")
    return geometry


def run_candidate(url: str, evidence: Path) -> CandidateEvidence:
    shots: dict[str, str] = {}
    desktop_grid_geometry: list[JsonObject] = []
    matrix: list[golden.Probe] = []
    mobile_order: list[JsonObject] = []
    mobile_geometry: list[JsonObject] = []
    with ChromeSession(enable_gpu=True) as browser:
        _install_observer_probe(browser)
        browser.require_cdp().send(
            "Page.addScriptToEvaluateOnNewDocument",
            {"source": golden.RAF_PROBE},
            browser.page_session,
        )
        set_viewport(browser, 1440, 900)
        golden.open_chapter(browser, url)
        capture_desktop_states(browser, evidence, shots)
        shots.update(
            golden_screenshots.capture_additional_desktop(browser, url, evidence),
        )
        for viewport in golden_geometry.DESKTOP_VIEWPORTS:
            desktop_grid_geometry.extend(
                golden_geometry.collect_desktop_grid_geometry(
                    browser,
                    url,
                    viewport,
                ),
            )
        representation_geometry = golden_geometry.collect_representation_geometry(
            browser,
            url,
        )
        golden_capture.reset_scroll(browser)
        golden.select_state(browser, "다음 질문", "token-preview")
        shots["desktop"] = _capture_chapter(
            browser,
            golden.CHAPTER_SELECTOR,
            evidence / "06-full-chapter-desktop.png",
        )
        capture_motion(browser, url, evidence, shots)

        golden.open_chapter(browser, url)
        golden_capture.center_visual(browser)
        golden_motion.capture_keyboard_focus(
            browser,
            evidence / "11-keyboard-focus.png",
        )
        golden.keyboard_to_stage(browser, "사람의 언어", "language")
        golden.wheel_to_stage(browser, "numeric")
        golden.wheel_to_stage(browser, "transform")

        for width, height in golden.VIEWPORTS:
            set_viewport(browser, width, height)
            golden.open_chapter(browser, url)
            golden.select_state(browser, "다음 질문", "token-preview")
            if width <= 768:
                mobile_order.append(golden_capture.assert_mobile_order(browser))
            golden_capture.center_visual(browser)
            golden.select_state(browser, "다음 질문", "token-preview")
            data = golden.probe(browser)
            golden.assert_probe(data, width)
            require(
                data["stage"] == "token-preview",
                f"Golden matrix state: {data}",
            )
            matrix.append({"width": width, "height": height, **data})

        mobile_geometry.extend(
            golden_geometry.verify_mobile_geometry(browser, url, (320, 568)),
        )
        shots.update(
            golden_screenshots.capture_compact_mobile_states(
                browser,
                url,
                evidence,
            ),
        )
        mobile_geometry.extend(
            capture_mobile_states(browser, url, evidence, shots),
        )
        golden_capture.reset_scroll(browser)
        golden.select_state(browser, "다음 질문", "token-preview")
        shots["mobile"] = _capture_chapter(
            browser,
            golden.CHAPTER_SELECTOR,
            evidence / "07-full-chapter-mobile.png",
        )
        reduced_motion = golden_motion.reduced_motion_contract(
            browser,
            url,
            evidence,
        )
        set_viewport(browser, 390, 844)
        golden.open_chapter(browser, url)
        navigation = golden_motion.click_token_footer(browser)
        navigate_hash(
            browser,
            "#/",
            "document.querySelector('[data-narrative-layout=\"golden\"]')"
            " === null",
            "Golden cleanup",
        )
        observers = evaluate_dict(browser, "window.__narrativeObserverMetrics")
        require(observers["active"] == 0, f"Golden observers: {observers}")
        errors = browser_errors(browser)
        require(not errors["runtime"], f"Golden runtime errors: {errors}")
        require(not errors["network"], f"Golden network errors: {errors}")
    return {
        "desktopGridGeometry": desktop_grid_geometry,
        "errors": errors,
        "matrix": matrix,
        "mobileOrder": mobile_order,
        "mobileStateGeometry": mobile_geometry,
        "navigation": navigation,
        "observers": observers,
        "reducedMotion": reduced_motion,
        "representationGeometry": representation_geometry,
        "screenshots": shots,
    }


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--baseline-root", type=Path)
    parser.add_argument("--candidate-root", type=Path, required=True)
    parser.add_argument("--candidate-base", default="/")
    parser.add_argument("--evidence", type=Path, required=True)
    args = parser.parse_args()
    before: str | None = None
    if args.baseline_root is not None:
        baseline_server, baseline_thread, baseline_url = _serve(
            args.baseline_root,
        )
        try:
            before = golden_screenshots.capture_baseline(
                baseline_url,
                args.evidence,
            )
        finally:
            baseline_server.shutdown()
            baseline_server.server_close()
            baseline_thread.join(timeout=10)
    candidate_server, candidate_thread, candidate_url = _serve(
        args.candidate_root,
    )
    try:
        candidate = run_candidate(
            f"{candidate_url.rstrip('/')}{args.candidate_base}",
            args.evidence,
        )
    finally:
        candidate_server.shutdown()
        candidate_server.server_close()
        candidate_thread.join(timeout=10)
    args.evidence.mkdir(parents=True, exist_ok=True)
    (args.evidence / "evidence.json").write_text(
        json.dumps(
            {"before": before, "candidate": candidate},
            ensure_ascii=False,
            indent=2,
        )
        + "\n",
        encoding="utf-8",
    )
    print("GOLDEN_CHAPTER_BROWSER_PASS")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
