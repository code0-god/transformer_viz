"""Production-browser probes for Chapter 0.1 Golden Narrative."""

from __future__ import annotations

import json
from typing import Final, TypeAlias

from browser_hybrid_contract import require
from browser_hybrid_helpers import evaluate_dict, navigate_hash, settle, wait_for
from browser_probes import READY_PROBE
from browser_session import ChromeSession

ProbeValue: TypeAlias = int | float | str | bool
Probe: TypeAlias = dict[str, ProbeValue]

CHAPTER_HASH: Final = "#/learn/decoder-only-fundamentals/0-1"
CHAPTER_SELECTOR: Final = '[data-curriculum-chapter-id="decoder.chapter.0.1"]'
VISUAL_SELECTOR: Final = '[data-testid="nlp-golden-visual"]'
STATES: Final = (
    ("사람의 언어", "language", "01-language-state.png"),
    ("숫자 표현", "numeric", "02-numeric-state.png"),
    ("표현 변화", "transform", "03-transform-state.png"),
    ("활용 결과", "result", "04-result-state.png"),
    ("다음 질문", "token-preview", "05-token-preview.png"),
)
VIEWPORTS: Final = (
    (320, 568), (390, 844), (768, 1024),
    (1024, 768), (1366, 768), (1440, 900),
)

RAF_PROBE: Final = """
(() => {
  const nativeRequest = window.requestAnimationFrame.bind(window);
  const nativeCancel = window.cancelAnimationFrame.bind(window);
  const pending = new Set();
  window.requestAnimationFrame = callback => {
    let id = 0;
    id = nativeRequest(time => { pending.delete(id); callback(time); });
    pending.add(id);
    return id;
  };
  window.cancelAnimationFrame = id => { pending.delete(id); nativeCancel(id); };
  Object.defineProperty(window, '__goldenRafPending', {
    configurable: true, get: () => pending.size,
  });
})();
"""


class GoldenProbeTypeError(TypeError):
    """A browser probe returned a value outside its declared contract."""

    def __init__(self, key: str, value: ProbeValue) -> None:
        super().__init__(f"Golden probe {key} must be numeric: {value!r}")


def open_chapter(browser: ChromeSession, base_url: str) -> None:
    browser.navigate(base_url)
    browser.require_cdp().evaluate(browser.page_session, READY_PROBE, True)
    navigate_hash(
        browser,
        CHAPTER_HASH,
        f"document.querySelector('{CHAPTER_SELECTOR}') !== null",
        "Golden Chapter",
    )
    wait_for(
        browser,
        f"document.querySelector('{VISUAL_SELECTOR}') !== null",
        "Golden visual",
    )


def select_state(browser: ChromeSession, label: str, stage: str) -> None:
    browser.require_cdp().evaluate(
        browser.page_session,
        f"""(() => {{
          const button = Array.from(
            document.querySelectorAll('.visual-narrative__steps button'),
          ).find(item => item.textContent?.trim() === {json.dumps(label)});
          if (!(button instanceof HTMLButtonElement))
            throw new Error('Golden stage button missing');
          button.click();
          button.blur();
        }})()""",
        True,
    )
    wait_for(
        browser,
        f"document.querySelector('{VISUAL_SELECTOR}')"
        f"?.getAttribute('data-nlp-stage') === {json.dumps(stage)}",
        f"Golden {stage}",
    )
    settle(browser)


def keyboard_to_stage(browser: ChromeSession, label: str, stage: str) -> None:
    browser.require_cdp().evaluate(
        browser.page_session,
        f"""Array.from(
          document.querySelectorAll('.visual-narrative__steps button'),
        ).find(item => item.textContent?.trim() === {json.dumps(label)})
          ?.focus()""",
        True,
    )
    for event_type in ("keyDown", "keyUp"):
        browser.require_cdp().send(
            "Input.dispatchKeyEvent",
            {
                "type": event_type,
                "key": "Enter",
                "code": "Enter",
                "windowsVirtualKeyCode": 13,
            },
            browser.page_session,
        )
    wait_for(
        browser,
        f"document.querySelector('{VISUAL_SELECTOR}')"
        f"?.getAttribute('data-nlp-stage') === {json.dumps(stage)}",
        f"Golden keyboard {stage}",
    )


def wheel_to_stage(browser: ChromeSession, stage: str) -> None:
    offset = evaluate_dict(
        browser,
        f"""(() => {{
          const beat = document.querySelector(
            '[data-narrative-stage="{stage}"]',
          );
          const box = beat?.getBoundingClientRect();
          return {{
            delta: (box?.top ?? 0) + (box?.height ?? 0) / 2
              - innerHeight * 0.44,
          }};
        }})()""",
    )["delta"]
    if not isinstance(offset, int | float):
        raise GoldenProbeTypeError("wheelDelta", str(offset))
    for _ in range(4):
        browser.require_cdp().send(
            "Input.dispatchMouseEvent",
            {
                "type": "mouseWheel",
                "x": 120,
                "y": 420,
                "deltaX": 0,
                "deltaY": float(offset) / 4,
            },
            browser.page_session,
        )
        settle(browser)
    wait_for(
        browser,
        f"document.querySelector('{VISUAL_SELECTOR}')"
        f"?.getAttribute('data-nlp-stage') === {json.dumps(stage)}",
        f"Golden wheel {stage}",
    )


def probe(browser: ChromeSession) -> Probe:
    data = evaluate_dict(
        browser,
        f"""(() => {{
          const narrative = document.querySelector(
            '[data-narrative-layout="golden"]',
          );
          const visual = document.querySelector('{VISUAL_SELECTOR}');
          const figure = document.querySelector(
            '[data-figure-id="decoder.diagram.intro.nlp"]',
          );
          const caption = figure?.querySelector('figcaption');
          const controls = narrative?.querySelector('.visual-narrative__steps');
          const header = document.querySelector('.architecture-header');
          const rect = element => element?.getBoundingClientRect();
          const style = element => element instanceof Element
            ? getComputedStyle(element)
            : null;
          const visualRect = rect(visual);
          return {{
            activeBeatCount: narrative?.querySelectorAll(
              '[data-narrative-active="true"]',
            ).length ?? -1,
            beatCount: narrative?.querySelectorAll(
              '.visual-narrative__beat',
            ).length ?? -1,
            canvasCount: figure?.querySelectorAll('canvas').length ?? -1,
            captionHeight: rect(caption)?.height ?? -1,
            controlHeight: rect(controls)?.height ?? -1,
            documentOverflow: Math.max(
              0,
              document.documentElement.scrollWidth
                - document.documentElement.clientWidth,
            ),
            figureBackground: style(figure)?.backgroundColor ?? '',
            figureBorder: style(figure)?.borderTopWidth ?? '',
            figureRenderer: figure?.getAttribute('data-figure-renderer') ?? '',
            fallbackStageCount: figure?.querySelectorAll(
              '[data-nlp-fallback-stage]',
            ).length ?? -1,
            localOverflow: narrative instanceof HTMLElement
              ? Math.max(0, narrative.scrollWidth - narrative.clientWidth)
              : -1,
            narrativeBackground: style(narrative)?.backgroundColor ?? '',
            narrativeBorder: style(narrative)?.borderTopWidth ?? '',
            pendingRaf: window.__goldenRafPending ?? -1,
            rectCount: visual?.querySelectorAll('rect').length ?? -1,
            replayCount: Array.from(
              narrative?.querySelectorAll('button') ?? [],
            ).filter(button => button.textContent?.includes('처음부터')).length,
            sceneCount: figure?.querySelectorAll('.scene-figure').length ?? -1,
            stage: visual?.getAttribute('data-nlp-stage') ?? '',
            stageButtonCount: narrative?.querySelectorAll(
              '.visual-narrative__steps button',
            ).length ?? -1,
            stickyPosition: style(
              narrative?.querySelector('.visual-narrative__visual'),
            )?.position ?? '',
            visualHeight: visualRect?.height ?? -1,
            visualTop: visualRect?.top ?? -1,
            headerBottom: rect(header)?.bottom ?? -1,
          }};
        }})()""",
    )
    return {
        key: value
        for key, value in data.items()
        if isinstance(value, bool | int | float | str)
    }


def _number(data: Probe, key: str) -> float:
    value = data[key]
    if isinstance(value, bool) or not isinstance(value, int | float):
        raise GoldenProbeTypeError(key, value)
    return float(value)


def assert_probe(data: Probe, width: int) -> None:
    require(data["beatCount"] == 5, f"Golden beats at {width}: {data}")
    require(data["activeBeatCount"] == 1, f"Golden active beat: {data}")
    require(data["stageButtonCount"] == 5, f"Golden keyboard stages: {data}")
    require(data["fallbackStageCount"] == 5, f"Golden fallback: {data}")
    require(data["replayCount"] == 0, f"Golden replay chrome: {data}")
    require(data["canvasCount"] == 0, f"Golden Canvas: {data}")
    require(data["sceneCount"] == 0, f"Golden SceneFigure: {data}")
    require(data["rectCount"] == 0, f"Golden generic rectangles: {data}")
    require(data["figureRenderer"] == "static", f"Golden renderer: {data}")
    require(data["documentOverflow"] == 0, f"Golden document overflow: {data}")
    require(data["localOverflow"] == 0, f"Golden local overflow: {data}")
    require(data["figureBorder"] == "0px", f"Golden Figure border: {data}")
    require(data["narrativeBorder"] == "0px", f"Golden border: {data}")
    require(
        data["figureBackground"] in ("rgba(0, 0, 0, 0)", "transparent"),
        f"Golden Figure background: {data}",
    )
    require(
        data["narrativeBackground"] in ("rgba(0, 0, 0, 0)", "transparent"),
        f"Golden narrative background: {data}",
    )
    require(_number(data, "captionHeight") <= 1, f"Golden caption: {data}")
    require(_number(data, "controlHeight") <= 1, f"Golden controls: {data}")
    require(data["pendingRaf"] == 0, f"Golden idle RAF: {data}")
    require(
        232 <= _number(data, "visualHeight") <= 390,
        f"Golden height: {data}",
    )
    require(data["stickyPosition"] == "sticky", f"Golden continuity: {data}")
    require(
        _number(data, "visualTop") >= _number(data, "headerBottom"),
        f"Golden visual covers Header: {data}",
    )
