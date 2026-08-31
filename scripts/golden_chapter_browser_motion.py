"""Interaction, transition, reduced-motion, and handoff evidence."""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

from browser_hybrid_capture import capture
from browser_hybrid_contract import number, require, set_viewport
from browser_hybrid_helpers import JsonObject, evaluate_dict, pointer_click, wait_for
from browser_session import ChromeSession
import golden_chapter_browser_capture as golden_capture
import golden_chapter_browser_probes as golden

@dataclass(frozen=True, slots=True)
class TransitionSpec:
    prefix: str
    target_index: int
    target_stage: str
    fraction: float = 0.5


def _arm_midpoint(
    browser: ChromeSession,
    stage: str,
    fraction: float,
) -> None:
    browser.require_cdp().evaluate(browser.page_session, f"""(() => {{
      const deck = document.querySelector('{golden.DECK_SELECTOR}');
      const saved = window.__goldenIdentity;
      window.__goldenMotion = new Promise((resolve, reject) => {{
        const timeout = setTimeout(() => reject(new Error('Golden motion timeout')), 30000);
        const observer = new MutationObserver(() => {{
          if (deck?.dataset.narrativeStage !== {stage!r}) return;
          observer.disconnect();
          requestAnimationFrame(() => {{
            const animations = deck.getAnimations({{subtree: true}});
            for (const animation of animations) {{
              const timing = animation.effect?.getComputedTiming();
              animation.pause();
              animation.currentTime =
                Number(timing?.endTime ?? 0) * {fraction};
            }}
            requestAnimationFrame(() => {{
              deck.getBoundingClientRect();
              clearTimeout(timeout);
              resolve({{
                count: animations.length,
                identity: saved?.deck === deck
                  && saved?.visual === document.querySelector('[data-testid="nlp-golden-visual"]')
                  && saved?.sentence === document.querySelector('[data-testid="nlp-golden-sentence"]')
                  && saved?.strip === document.querySelector('[data-testid="nlp-golden-numeric-strip"]'),
              }});
            }});
          }});
        }});
        observer.observe(deck, {{attributes: true, attributeFilter: ['data-narrative-stage']}});
      }});
    }})()""", True)


def _capture_transition(
    browser: ChromeSession,
    evidence: Path,
    spec: TransitionSpec,
) -> tuple[JsonObject, dict[str, str]]:
    prefix = spec.prefix
    shots = {f"{prefix}-rest": capture(browser, evidence / f"{prefix}-rest.png")}
    if prefix == "transition-02-numeric-transform":
        shots["02-to-03-before"] = capture(
            browser,
            evidence / "02-to-03-before.png",
        )
    _arm_midpoint(browser, spec.target_stage, spec.fraction)
    browser.require_cdp().evaluate(
        browser.page_session,
        f"""(() => {{
          const button = document.querySelectorAll(
            '{golden.DECK_SELECTOR} .visual-narrative__progress button'
          )[{spec.target_index}];
          if (!(button instanceof HTMLButtonElement))
            throw new Error('Golden transition control missing');
          button.click();
        }})()""",
        True,
    )
    result = evaluate_dict(browser, "window.__goldenMotion")
    require(number(result["count"], "Golden animation count") > 0, f"Golden motion animations: {result}")
    require(result["identity"] is True, f"Golden motion identity: {result}")
    shots[f"{prefix}-mid"] = capture(browser, evidence / f"{prefix}-mid.png")
    if prefix == "transition-02-numeric-transform":
        shots["02-to-03-mid"] = capture(
            browser,
            evidence / "02-to-03-mid.png",
        )
    if prefix == "transition-03-transform-result":
        shots["04-result-transition"] = capture(
            browser,
            evidence / "04-result-transition.png",
        )
    if prefix == "transition-03-result-token":
        shots["05-boundary-step-1"] = capture(
            browser,
            evidence / "05-boundary-step-1.png",
        )
    golden.finish_motion(browser)
    golden_capture.assert_identity(browser, spec.target_stage)
    shots[f"{prefix}-settled"] = capture(browser, evidence / f"{prefix}-settled.png")
    if prefix == "transition-02-numeric-transform":
        shots["02-to-03-after"] = capture(
            browser,
            evidence / "02-to-03-after.png",
        )
    if prefix == "transition-03-result-token":
        shots["05-boundary-final"] = capture(
            browser,
            evidence / "05-boundary-final.png",
        )
    return result, shots


def capture_transitions(
    browser: ChromeSession,
    url: str,
    evidence: Path,
) -> tuple[list[JsonObject], dict[str, str]]:
    set_viewport(browser, 1440, 900)
    golden.open_chapter(browser, url)
    golden.finish_motion(browser)
    golden_capture.mark_identity(browser)
    results: list[JsonObject] = []
    shots: dict[str, str] = {}
    for spec in (
        TransitionSpec("transition-01-language-numeric", 1, "numeric"),
        TransitionSpec("transition-02-numeric-transform", 2, "transform"),
    ):
        result, captured = _capture_transition(browser, evidence, spec)
        results.append(result)
        shots.update(captured)
    result, captured = _capture_transition(
        browser,
        evidence,
        TransitionSpec("transition-03-transform-result", 3, "result"),
    )
    results.append(result)
    shots.update(captured)
    result, captured = _capture_transition(
        browser,
        evidence,
        TransitionSpec(
            "transition-03-result-token",
            4,
            "token-preview",
            0.18,
        ),
    )
    results.append(result)
    shots.update(captured)
    return results, shots


def reduced_motion_contract(browser: ChromeSession, url: str) -> dict[str, JsonObject]:
    browser.require_cdp().send(
        "Emulation.setEmulatedMedia",
        {"features": [{"name": "prefers-reduced-motion", "value": "reduce"}]},
        browser.page_session,
    )
    golden.open_chapter(browser, url)
    results: dict[str, JsonObject] = {}
    for index, (stage, _label) in enumerate(golden.STATES):
        golden.select_state(browser, index, stage)
        result = evaluate_dict(browser, f"""(() => {{
          const deck = document.querySelector('{golden.DECK_SELECTOR}');
          const relevant = [...deck.querySelectorAll([
            '.visual-narrative__beat',
            '[data-testid="nlp-golden-visual"]',
            '[data-testid="nlp-golden-sentence"]',
            '[data-testid="nlp-golden-numeric"]',
            '[data-testid="nlp-golden-numeric-strip"]',
            '.nlp-golden__result', '.nlp-golden__token-note',
            '.nlp-golden__handoff',
          ].join(','))];
          const values = relevant.flatMap(element => {{
            const style = getComputedStyle(element);
            const parse = text => text.split(',').map(value => {{
              const item = value.trim();
              return Number.parseFloat(item) * (item.endsWith('ms') ? 1 : 1000);
            }});
            return [...parse(style.transitionDuration), ...parse(style.animationDuration)];
          }});
          const animations = deck.getAnimations({{subtree: true}});
          return {{
            stage: deck.dataset.narrativeStage,
            maxDurationMs: Math.max(0, ...values),
            running: animations.filter(animation => animation.playState === 'running').length,
            animationCount: animations.length,
            activeBeatCount: deck.querySelectorAll('[data-narrative-active="true"]').length,
            activeSummaryCount: document.querySelectorAll('[data-nlp-fallback-stage][aria-current="step"]').length,
          }};
        }})()""")
        require(result["stage"] == stage, f"Golden reduced stage: {result}")
        require(number(result["maxDurationMs"], "Golden reduced duration") <= 1, f"Golden reduced duration: {result}")
        require(result["running"] == 0 and result["activeBeatCount"] == 1 and result["activeSummaryCount"] == 1, f"Golden reduced completion: {result}")
        results[stage] = result
    browser.require_cdp().send(
        "Emulation.setEmulatedMedia", {"features": []}, browser.page_session,
    )
    return results


def click_token_handoff(browser: ChromeSession) -> JsonObject:
    pointer_click(
        browser,
        "document.querySelector('[data-next-chapter=\"decoder.chapter.0.2\"]')",
        condition="document.querySelector('[data-curriculum-chapter-id=\"decoder.chapter.0.2\"]') !== null",
        label="Golden Chapter 0.2 handoff",
    )
    result = evaluate_dict(browser, """(() => ({
      hash: location.hash,
      chapter: document.querySelector('[data-curriculum-chapter-id="decoder.chapter.0.2"]') !== null,
      focusedHeading: document.activeElement?.id === 'curriculum-chapter-title',
    }))()""")
    require(result["hash"] == "#/learn/decoder-only-fundamentals/0-2", f"Golden handoff hash: {result}")
    require(result["chapter"] is True and result["focusedHeading"] is True, f"Golden handoff focus: {result}")
    browser.require_cdp().evaluate(
        browser.page_session,
        "history.back()",
        True,
    )
    wait_for(
        browser,
        f"document.querySelector('{golden.DECK_SELECTOR}')"
        "?.dataset.narrativeSlideIndex === '1'",
        "Golden browser Back initial slide",
    )
    back = evaluate_dict(browser, """(() => ({
      hash: location.hash,
      stage: document.querySelector('[data-narrative-mode="deck"]')
        ?.dataset.narrativeStage ?? '',
    }))()""")
    require(
        back["hash"] == "#/learn/decoder-only-fundamentals/0-1"
        and back["stage"] == "language",
        f"Golden browser Back: {back}",
    )
    browser.require_cdp().evaluate(
        browser.page_session,
        "history.forward()",
        True,
    )
    wait_for(
        browser,
        "document.querySelector("
        "'[data-curriculum-chapter-id=\"decoder.chapter.0.2\"]'"
        ") !== null",
        "Golden browser Forward",
    )
    forward = evaluate_dict(browser, "({hash: location.hash})")
    return {
        **result,
        "backHash": back["hash"],
        "backStage": back["stage"],
        "forwardHash": forward["hash"],
    }
