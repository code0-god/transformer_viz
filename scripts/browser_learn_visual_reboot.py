#!/usr/bin/env python3
"""Capture and verify course-order Learn Visual Reboot scenes."""

from __future__ import annotations

import argparse
import json
import threading
from functools import partial
from http.server import ThreadingHTTPServer
from pathlib import Path
from typing import NamedTuple

from browser_hybrid_capture import capture, request_urls
from browser_hybrid_contract import require, set_viewport
from browser_hybrid_foundation import QuietHandler
from browser_hybrid_helpers import (
    JsonObject,
    evaluate_dict,
    navigate_hash,
    pointer_click,
    wait_for,
)
from browser_learning_scenes import _evaluate, _settle_scene, _verify_idle
from browser_learning_workspace_probes import browser_errors
from browser_probes import READY_PROBE
from browser_session import ChromeSession


class SceneSpec(NamedTuple):
    chapter: str
    figure_id: str
    name: str
    state_test_id: str


PART0_SCENES = (
    SceneSpec(
        "0-2",
        "decoder.diagram.tokenization.token",
        "token",
        "tokenization-unit-scene-state",
    ),
    SceneSpec(
        "0-3",
        "decoder.diagram.tokenization.vocabulary",
        "vocabulary",
        "vocabulary-scene-state",
    ),
    SceneSpec(
        "0-4",
        "decoder.diagram.tokenization.methods",
        "tokenization",
        "tokenization-method-scene-state",
    ),
)

PART1_SCENES = (
    SceneSpec(
        "1-1",
        "decoder.diagram.language-model.definition",
        "language-model",
        "language-model-scene-state",
    ),
    SceneSpec(
        "1-2",
        "decoder.diagram.language-model.next-token",
        "next-token",
        "next-token-scene-state",
    ),
    SceneSpec(
        "1-3",
        "decoder.diagram.language-model.conditional-probability",
        "conditional",
        "conditional-scene-state",
    ),
    SceneSpec(
        "1-4",
        "decoder.diagram.language-model.autoregressive",
        "autoregressive",
        "autoregressive-scene-state",
    ),
)

PART2_SCENES = (
    SceneSpec(
        "2-1",
        "decoder.diagram.representation.embedding",
        "embedding",
        "token-scene-state",
    ),
    SceneSpec(
        "2-2",
        "decoder.diagram.representation.position",
        "position",
        "position-scene-state",
    ),
    SceneSpec(
        "2-3",
        "decoder.diagram.representation.hidden-state",
        "hidden",
        "hidden-scene-state",
    ),
)

GPT_SCENES = (
    SceneSpec(
        "3-1",
        "root",
        "gpt",
        "gpt-scene-state",
    ),
)

BLOCK_SCENES = (
    SceneSpec(
        "4-1",
        "transformer-block",
        "block",
        "block-scene-state",
    ),
)

ATTENTION_SCENE = SceneSpec(
    "5-1",
    "self-attention",
    "attention",
    "attention-scene-state",
)


def _probe(browser: ChromeSession, spec: SceneSpec) -> JsonObject:
    return evaluate_dict(
        browser,
        f"""(() => {{
          const figure = document.querySelector(
            '[data-figure-id="{spec.figure_id}"]',
          );
          const narrative = figure?.closest('.visual-narrative');
          const scene = figure?.querySelector('.scene-figure');
          const plane = figure?.querySelector('.scene-figure__plane');
          const controls =
            narrative?.querySelector('.visual-narrative__steps')
            ?? figure?.querySelector('.scene-figure__controls');
          const state = figure?.querySelector(
            '[data-testid="{spec.state_test_id}"]',
          );
          const canvas = figure?.querySelector('canvas');
          const canvasBox = canvas?.getBoundingClientRect();
          const stageBox = plane?.getBoundingClientRect();
          const buttons = Array.from(
            (narrative ?? figure)?.querySelectorAll('button') ?? [],
          );
          return {{
            status: scene?.getAttribute('data-scene-status') ?? '',
            viewport: scene?.getAttribute('data-scene-viewport') ?? '',
            canvasCount: figure?.querySelectorAll('canvas').length ?? -1,
            canvasWidth: canvasBox?.width ?? 0,
            canvasHeight: canvasBox?.height ?? 0,
            stageWidth: stageBox?.width ?? 0,
            stageHeight: stageBox?.height ?? 0,
            labelCount:
              figure?.querySelectorAll(
                '.scene-stage-label, .part0-scene__segment-labels li',
              ).length ?? 0,
            controlsAfterStage:
              plane !== null
              && controls !== null
              && Boolean(
                plane.compareDocumentPosition(controls)
                & Node.DOCUMENT_POSITION_FOLLOWING
              ),
            controlMinHeight:
              buttons.length === 0
                ? 0
                : Math.min(...buttons.map(button =>
                    button.getBoundingClientRect().height
                  )),
            documentOverflow: Math.max(
              0,
              document.documentElement.scrollWidth
                - document.documentElement.clientWidth,
            ),
            localOverflow: figure
              ? Math.max(0, figure.scrollWidth - figure.clientWidth)
              : -1,
            state: Object.fromEntries(
              Array.from(state?.attributes ?? [])
                .filter(attribute => attribute.name.startsWith('data-'))
                .map(attribute => [attribute.name, attribute.value]),
            ),
            metrics: window.__learningSceneMetrics ?? null,
          }};
        }})()""",
    )


def _open_scene(browser: ChromeSession, spec: SceneSpec) -> None:
    before = _evaluate(
        browser,
        "window.__learningSceneMetrics?.animationFrameCount ?? 0",
    )
    if not isinstance(before, int):
        raise TypeError(f"Scene frame count must be integer: {before!r}")
    navigate_hash(
        browser,
        f"#/learn/decoder-only-fundamentals/{spec.chapter}",
        (
            "document.querySelector("
            f"'[data-figure-id=\"{spec.figure_id}\"]'"
            ") !== null"
        ),
        f"{spec.name} Chapter",
    )
    _evaluate(
        browser,
        f"""document.querySelector(
          '[data-figure-id="{spec.figure_id}"]',
        )?.scrollIntoView({{ block: 'start', inline: 'nearest' }})""",
    )
    wait_for(
        browser,
        (
            f"document.querySelector('[data-figure-id=\"{spec.figure_id}\"] "
            "[data-scene-status=\"ready\"]') !== null"
        ),
        f"{spec.name} Scene ready",
    )
    _settle_scene(browser, after_frame=before)


def _click_button(
    browser: ChromeSession,
    label: str,
    condition: str,
    description: str,
) -> None:
    encoded = json.dumps(label, ensure_ascii=False)
    _evaluate(
        browser,
        f"""Array.from(document.querySelectorAll('button'))
          .find(button => button.textContent?.includes({encoded}))
          ?.scrollIntoView({{ block: 'center', inline: 'nearest' }})""",
    )
    pointer_click(
        browser,
        (
            "Array.from(document.querySelectorAll('button'))"
            f".find(button => button.textContent?.includes({encoded}))"
        ),
        condition=condition,
        label=description,
    )


def _center_stage(browser: ChromeSession, spec: SceneSpec) -> None:
    _evaluate(
        browser,
        f"""document.querySelector(
          '[data-figure-id="{spec.figure_id}"] .scene-figure__plane',
        )?.scrollIntoView({{ block: 'center', inline: 'nearest' }})""",
    )


def _finish_part0(browser: ChromeSession, spec: SceneSpec) -> None:
    if spec.name == "nlp":
        _click_button(
            browser,
            "결과",
            condition=(
                "document.querySelector('[data-testid=\"nlp-scene-state\"]')"
                "?.getAttribute('data-scene-stage') === 'result'"
            ),
            description="NLP result stage",
        )
    elif spec.name == "token":
        _click_button(
            browser,
            "현재 byte",
            condition=(
                "document.querySelector("
                "'[data-testid=\"tokenization-unit-scene-state\"]'"
                ")?.getAttribute('data-mode') === 'byte'"
            ),
            description="Token byte mode",
        )
        _click_button(
            browser,
            "Token",
            condition=(
                "document.querySelector("
                "'[data-testid=\"tokenization-unit-scene-state\"]'"
                ")?.getAttribute('data-phase') === 'split'"
            ),
            description="Token split",
        )
    elif spec.name == "vocabulary":
        _click_button(
            browser,
            "cat",
            condition=(
                "document.querySelector("
                "'[data-testid=\"vocabulary-scene-state\"]'"
                ")?.getAttribute('data-token') === 'cat'"
            ),
            description="Vocabulary cat",
        )
        _click_button(
            browser,
            "Token ID",
            condition=(
                "document.querySelector("
                "'[data-testid=\"vocabulary-scene-state\"]'"
                ")?.getAttribute('data-phase') === 'id'"
            ),
            description="Vocabulary ID",
        )
    else:
        _click_button(
            browser,
            "Current Byte",
            condition=(
                "document.querySelector("
                "'[data-testid=\"tokenization-method-scene-state\"]'"
                ")?.getAttribute('data-method') === 'byte'"
            ),
            description="Tokenization byte",
        )
        _click_button(
            browser,
            "분할 보기",
            condition=(
                "document.querySelector("
                "'[data-testid=\"tokenization-method-scene-state\"]'"
                ")?.getAttribute('data-phase') === 'split'"
            ),
            description="Tokenization split",
        )
    _settle_scene(browser)


def _finish_part1(browser: ChromeSession, spec: SceneSpec) -> None:
    if spec.name == "language-model":
        _click_button(
            browser,
            "후보",
            condition=(
                "document.querySelector("
                "'[data-testid=\"language-model-scene-state\"]'"
                ")?.getAttribute('data-stage') === 'candidates'"
            ),
            description="Language Model candidates",
        )
    elif spec.name == "next-token":
        _click_button(
            browser,
            "Selection",
            condition=(
                "document.querySelector("
                "'[data-testid=\"next-token-scene-state\"]'"
                ")?.getAttribute('data-stage') === 'selection'"
            ),
            description="Next Token selection",
        )
    elif spec.name == "conditional":
        _click_button(
            browser,
            "w₃ 조건",
            condition=(
                "document.querySelector("
                "'[data-testid=\"conditional-scene-state\"]'"
                ")?.getAttribute('data-stage') === 'w3'"
            ),
            description="Conditional probability w3",
        )
    else:
        _click_button(
            browser,
            "Append",
            condition=(
                "document.querySelector("
                "'[data-testid=\"autoregressive-scene-state\"]'"
                ")?.getAttribute('data-stage') === 'append'"
            ),
            description="Autoregressive append",
        )
        _click_button(
            browser,
            "Repeat",
            condition=(
                "document.querySelector("
                "'[data-testid=\"autoregressive-scene-state\"]'"
                ")?.getAttribute('data-stage') === 'repeat'"
            ),
            description="Autoregressive repeat",
        )
    _settle_scene(browser)


def _finish_part2(browser: ChromeSession, spec: SceneSpec) -> None:
    if spec.name == "embedding":
        _click_button(
            browser,
            "Vector",
            condition=(
                "document.querySelector('[data-testid=\"token-scene-state\"]')"
                "?.getAttribute('data-phase') === 'vector'"
            ),
            description="Embedding vector extraction",
        )
    elif spec.name == "position":
        _click_button(
            browser,
            "position 3",
            condition=(
                "document.querySelector("
                "'[data-testid=\"position-scene-state\"]'"
                ")?.getAttribute('data-position') === '3'"
            ),
            description="Position three",
        )
        _click_button(
            browser,
            "더하기",
            condition=(
                "document.querySelector("
                "'[data-testid=\"position-scene-state\"]'"
                ")?.getAttribute('data-phase') === 'sum'"
            ),
            description="Position sum",
        )
    else:
        _click_button(
            browser,
            "X_N",
            condition=(
                "document.querySelector('[data-testid=\"hidden-scene-state\"]')"
                "?.getAttribute('data-stage') === 'xn'"
            ),
            description="Hidden XN",
        )
    _settle_scene(browser)


def _finish_gpt(browser: ChromeSession, _spec: SceneSpec) -> None:
    _click_button(
        browser,
        "Generation",
        condition=(
            "document.querySelector('[data-testid=\"gpt-scene-state\"]')"
            "?.getAttribute('data-stage') === 'generation'"
        ),
        description="GPT generation stage",
    )
    _settle_scene(browser)


def _finish_block(browser: ChromeSession, _spec: SceneSpec) -> None:
    _click_button(
        browser,
        "MLP half",
        condition=(
            "document.querySelector('[data-testid=\"block-scene-state\"]')"
            "?.getAttribute('data-stage') === 'mlp'"
        ),
        description="Transformer Block MLP half",
    )
    _settle_scene(browser)


def _capture_attention(
    browser: ChromeSession,
    screenshots: Path,
    evidence: JsonObject,
    shots: dict[str, str],
) -> None:
    spec = ATTENTION_SCENE
    set_viewport(browser, 1440, 900)
    _open_scene(browser, spec)
    overview = _probe(browser, spec)
    _assert_probe(overview, spec, "desktop")
    shots["attentionOverviewDesktop"] = capture(
        browser,
        screenshots / "attention-overview-1440x900.png",
    )
    states: JsonObject = {"overview": overview}
    for label, stage in (
        ("Q/K/V", "qkv"),
        ("Scores", "scores"),
        ("Mask", "mask"),
        ("Softmax", "softmax"),
        ("Value", "value"),
    ):
        _click_button(
            browser,
            label,
            condition=(
                "document.querySelector("
                "'[data-testid=\"attention-scene-state\"]'"
                f")?.getAttribute('data-stage') === {json.dumps(stage)}"
            ),
            description=f"Attention {stage}",
        )
        _settle_scene(browser)
        _center_stage(browser, spec)
        probe = _probe(browser, spec)
        _assert_probe(probe, spec, "desktop")
        states[stage] = probe
        shots[f"attention{stage.title()}Desktop"] = capture(
            browser,
            screenshots / f"attention-{stage}-1440x900.png",
        )

    _settle_scene(browser)
    idle = _verify_idle(browser)
    require(idle == 0, f"Attention idle RAF leaked: {idle}")
    set_viewport(browser, 390, 844)
    wait_for(
        browser,
        (
            "document.querySelector("
            "'[data-figure-id=\"self-attention\"] "
            "[data-scene-viewport=\"mobile\"]"
            "[data-scene-status=\"ready\"]'"
            ") !== null"
        ),
        "Attention mobile Scene ready",
    )
    _settle_scene(browser)
    _center_stage(browser, spec)
    mobile = _probe(browser, spec)
    _assert_probe(mobile, spec, "mobile")
    shots["attentionValueMobile"] = capture(
        browser,
        screenshots / "attention-value-390x844.png",
    )
    evidence["attention"] = {
        **states,
        "mobile": mobile,
        "idleFrameDelta": idle,
    }


def _verify_context_cycles(
    browser: ChromeSession,
    screenshots: Path,
    evidence: JsonObject,
    shots: dict[str, str],
) -> None:
    results: JsonObject = {}
    for spec in (PART0_SCENES[0], PART2_SCENES[0], ATTENTION_SCENE):
        set_viewport(browser, 390, 844)
        _open_scene(browser, spec)
        wait_for(
            browser,
            (
                f"document.querySelector('[data-figure-id=\"{spec.figure_id}\"] "
                "[data-scene-status=\"ready\"] canvas') !== null"
            ),
            f"{spec.name} context Canvas ready",
        )
        _settle_scene(browser)
        wait_for(
            browser,
            (
                f"document.querySelector('[data-figure-id=\"{spec.figure_id}\"] "
                "[data-scene-status=\"context-lost\"]') !== null"
            ),
            f"{spec.name} context loss",
            f"""(() => {{
              const canvas = document.querySelector(
                '[data-figure-id="{spec.figure_id}"] canvas',
              );
              const gl = canvas?.getContext('webgl2')
                ?? canvas?.getContext('webgl');
              const extension = gl?.getExtension('WEBGL_lose_context');
              if (!extension)
                throw new Error('WEBGL_lose_context unavailable');
              window.__visualRebootLoseContext = extension;
              extension.loseContext();
            }})();""",
        )
        lost = _probe(browser, spec)
        require(
            lost["status"] == "context-lost" and lost["canvasCount"] == 1,
            f"{spec.name} context fallback failed: {lost}",
        )
        _center_stage(browser, spec)
        shots[f"{spec.name}ContextFallback"] = capture(
            browser,
            screenshots / f"{spec.name}-context-fallback-390x844.png",
        )
        wait_for(
            browser,
            (
                f"document.querySelector('[data-figure-id=\"{spec.figure_id}\"] "
                "[data-scene-status=\"ready\"]') !== null"
            ),
            f"{spec.name} context restore",
            "window.__visualRebootLoseContext.restoreContext();",
        )
        restored = _probe(browser, spec)
        require(
            restored["status"] == "ready" and restored["canvasCount"] == 1,
            f"{spec.name} context restore failed: {restored}",
        )
        results[spec.name] = {"lost": lost, "restored": restored}
    evidence["contextCycles"] = results


def _assert_probe(probe: JsonObject, spec: SceneSpec, viewport: str) -> None:
    require(probe["status"] == "ready", f"{spec.name} not ready: {probe}")
    require(probe["viewport"] == viewport, f"{spec.name} viewport: {probe}")
    require(probe["canvasCount"] == 1, f"{spec.name} Canvas: {probe}")
    require(
        probe["documentOverflow"] == 0 and probe["localOverflow"] == 0,
        f"{spec.name} overflow: {probe}",
    )
    require(
        probe["controlsAfterStage"] is True,
        f"{spec.name} control order: {probe}",
    )
    require(
        isinstance(probe["controlMinHeight"], int | float)
        and probe["controlMinHeight"] >= 44,
        f"{spec.name} targets: {probe}",
    )
    require(
        isinstance(probe["labelCount"], int) and probe["labelCount"] >= 1,
        f"{spec.name} labels: {probe}",
    )


def _capture_specs(
    browser: ChromeSession,
    specs: tuple[SceneSpec, ...],
    finish: object,
    screenshots: Path,
    evidence: JsonObject,
    shots: dict[str, str],
    bucket: str,
) -> None:
    if not callable(finish):
        raise TypeError("Scene finish callback must be callable")
    evidence[bucket] = {}
    for spec in specs:
        set_viewport(browser, 1440, 900)
        _open_scene(browser, spec)
        initial = _probe(browser, spec)
        _assert_probe(initial, spec, "desktop")
        shots[f"{spec.name}InitialDesktop"] = capture(
            browser,
            screenshots / f"{spec.name}-initial-1440x900.png",
        )
        finish(browser, spec)
        final = _probe(browser, spec)
        _assert_probe(final, spec, "desktop")
        idle = _verify_idle(browser)
        require(idle == 0, f"{spec.name} idle RAF leaked: {idle}")
        _center_stage(browser, spec)
        shots[f"{spec.name}FinalDesktop"] = capture(
            browser,
            screenshots / f"{spec.name}-final-1440x900.png",
        )

        set_viewport(browser, 390, 844)
        wait_for(
            browser,
            (
                f"document.querySelector('[data-figure-id=\"{spec.figure_id}\"] "
                "[data-scene-viewport=\"mobile\"]"
                "[data-scene-status=\"ready\"]') !== null"
            ),
            f"{spec.name} mobile Scene ready",
        )
        _settle_scene(browser)
        _center_stage(browser, spec)
        mobile = _probe(browser, spec)
        _assert_probe(mobile, spec, "mobile")
        shots[f"{spec.name}FinalMobile"] = capture(
            browser,
            screenshots / f"{spec.name}-final-390x844.png",
        )
        evidence[bucket][spec.name] = {
            "initial": initial,
            "final": final,
            "mobile": mobile,
            "idleFrameDelta": idle,
        }


def run_contract(url: str, evidence_dir: Path) -> None:
    screenshots = evidence_dir / "screenshots"
    evidence: JsonObject = {}
    shots: dict[str, str] = {}
    with ChromeSession(enable_gpu=True) as browser:
        set_viewport(browser, 1440, 900)
        browser.navigate(url)
        browser.require_cdp().evaluate(browser.page_session, READY_PROBE, True)
        home_requests = request_urls(browser)
        require(
            not any(
                "Part0" in request
                or "NlpTransformationScene" in request
                or "TokenSegmentationScene" in request
                or "VocabularyAddressScene" in request
                or "TokenizationMethodsScene" in request
                or "LanguageModelScene" in request
                or "NextTokenScene" in request
                or "ConditionalProbabilityScene" in request
                or "AutoregressiveScene" in request
                or "GptArchitectureScene" in request
                or "TransformerBlockScene" in request
                or "SelfAttentionScene" in request
                or "react-three-fiber" in request
                for request in home_requests
            ),
            "Home eagerly loaded Learn Visual Reboot chunks",
        )

        _capture_specs(
            browser,
            PART0_SCENES,
            _finish_part0,
            screenshots,
            evidence,
            shots,
            "part0",
        )
        _capture_specs(
            browser,
            PART1_SCENES,
            _finish_part1,
            screenshots,
            evidence,
            shots,
            "part1",
        )
        _capture_specs(
            browser,
            PART2_SCENES,
            _finish_part2,
            screenshots,
            evidence,
            shots,
            "part2",
        )
        _capture_specs(
            browser,
            GPT_SCENES,
            _finish_gpt,
            screenshots,
            evidence,
            shots,
            "gpt",
        )
        _capture_specs(
            browser,
            BLOCK_SCENES,
            _finish_block,
            screenshots,
            evidence,
            shots,
            "block",
        )
        _capture_attention(browser, screenshots, evidence, shots)
        _verify_context_cycles(browser, screenshots, evidence, shots)

        evidence["requests"] = request_urls(browser)
        evidence["errors"] = browser_errors(browser)
        evidence["screenshots"] = shots

    evidence_dir.mkdir(parents=True, exist_ok=True)
    (evidence_dir / "evidence.json").write_text(
        json.dumps(evidence, ensure_ascii=False, indent=2) + "\n",
    )
    print(f"Learn Visual Reboot browser: PASS ({len(shots)} screenshots)")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--root", type=Path, required=True)
    parser.add_argument("--entry", default="index.html")
    parser.add_argument("--evidence", type=Path, required=True)
    args = parser.parse_args()
    server = ThreadingHTTPServer(
        ("127.0.0.1", 0),
        partial(QuietHandler, directory=str(args.root.resolve())),
    )
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    try:
        base = "/" if args.entry == "index.html" else "/transformer_viz/"
        run_contract(
            f"http://127.0.0.1:{server.server_port}{base}",
            args.evidence,
        )
    finally:
        server.shutdown()
        server.server_close()
        thread.join(timeout=10)
        args.evidence.mkdir(parents=True, exist_ok=True)
        (args.evidence / "cleanup.txt").write_text(
            "Chrome contexts closed; static server stopped; ephemeral ports released.\n",
        )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
