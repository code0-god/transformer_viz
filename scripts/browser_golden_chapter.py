#!/usr/bin/env python3
# /// script
# requires-python = ">=3.11"
# dependencies = []
# ///
# --- How to run ---
# PYTHONPATH=scripts python3 scripts/browser_golden_chapter.py --help
"""Verify and capture the Chapter 0.1 five-slide production deck."""

from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import TypedDict

from browser_hybrid_contract import require, set_viewport
from browser_hybrid_helpers import JsonObject, evaluate_dict, navigate_hash
from browser_learning_workspace_probes import browser_errors
from browser_session import ChromeSession
from browser_visual_narrative import _install_observer_probe, _serve
import golden_chapter_browser_capture as golden_capture
import golden_chapter_browser_geometry as golden_geometry
import golden_chapter_browser_motion as golden_motion
import golden_chapter_browser_probes as golden
import golden_chapter_browser_screenshots as golden_screenshots


class CandidateEvidence(TypedDict):
    controls: JsonObject
    copyAndGeometry: list[JsonObject]
    errors: dict[str, list[str]]
    handoff: JsonObject
    motion: list[JsonObject]
    numericRepresentation: JsonObject
    observers: JsonObject
    reducedMotion: dict[str, JsonObject]
    screenshots: dict[str, str]


def run_candidate(url: str, evidence: Path) -> CandidateEvidence:
    evidence.mkdir(parents=True, exist_ok=True)
    geometry: list[JsonObject] = []
    shots: dict[str, str] = {}
    with ChromeSession(enable_gpu=True) as browser:
        _install_observer_probe(browser)
        browser.require_cdp().send(
            "Page.addScriptToEvaluateOnNewDocument",
            {"source": golden.RAF_PROBE},
            browser.page_session,
        )
        for viewport in golden.VIEWPORTS:
            geometry.extend(
                golden_geometry.collect_viewport(browser, url, viewport),
            )

        set_viewport(browser, 1440, 900)
        golden.open_chapter(browser, url)
        golden.finish_motion(browser)
        controls = golden_capture.controls_contract(browser)

        golden.open_chapter(browser, url)
        golden.finish_motion(browser)
        numeric = golden_capture.assert_numeric_representation(browser)

        motion, motion_shots = golden_motion.capture_transitions(
            browser, url, evidence,
        )
        shots.update(motion_shots)
        shots.update(
            golden_screenshots.capture_matrix(browser, url, evidence),
        )
        reduced = golden_motion.reduced_motion_contract(browser, url)

        set_viewport(browser, 390, 844)
        golden.open_chapter(browser, url)
        golden.select_state(browser, 4, "token-preview")
        handoff = golden_motion.click_token_handoff(browser)
        navigate_hash(
            browser,
            "#/",
            f"document.querySelector('{golden.DECK_SELECTOR}') === null",
            "Golden observer cleanup",
        )
        observers = evaluate_dict(browser, "window.__narrativeObserverMetrics")
        require(observers["active"] == 0, f"Golden observers: {observers}")
        errors = browser_errors(browser)
        require(not errors["runtime"], f"Golden runtime errors: {errors}")
        require(not errors["network"], f"Golden network errors: {errors}")
    return {
        "controls": controls,
        "copyAndGeometry": geometry,
        "errors": errors,
        "handoff": handoff,
        "motion": motion,
        "numericRepresentation": numeric,
        "observers": observers,
        "reducedMotion": reduced,
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
        server, thread, baseline_url = _serve(args.baseline_root)
        try:
            before = golden_screenshots.capture_baseline(
                baseline_url, args.evidence,
            )
        finally:
            server.shutdown()
            server.server_close()
            thread.join(timeout=10)
    server, thread, candidate_url = _serve(args.candidate_root)
    try:
        candidate = run_candidate(
            f"{candidate_url.rstrip('/')}{args.candidate_base}",
            args.evidence,
        )
    finally:
        server.shutdown()
        server.server_close()
        thread.join(timeout=10)
    (args.evidence / "evidence.json").write_text(
        json.dumps(
            {"before": before, "candidate": candidate},
            ensure_ascii=False,
            indent=2,
        ) + "\n",
        encoding="utf-8",
    )
    print("GOLDEN_CHAPTER_BROWSER_PASS")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
