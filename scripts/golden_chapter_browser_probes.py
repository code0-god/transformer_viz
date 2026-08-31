"""Production Chrome probes for the Chapter 0.1 five-slide deck."""

from __future__ import annotations

import json
from typing import Final

from browser_hybrid_contract import number, require
from browser_hybrid_helpers import JsonObject, evaluate_dict, navigate_hash, wait_for
from browser_probes import READY_PROBE
from browser_session import ChromeSession

CHAPTER_HASH: Final = "#/learn/decoder-only-fundamentals/0-1"
CHAPTER_SELECTOR: Final = '[data-curriculum-chapter-id="decoder.chapter.0.1"]'
DECK_SELECTOR: Final = '[data-narrative-mode="deck"]'
VISUAL_SELECTOR: Final = '[data-testid="nlp-golden-visual"]'
STATES: Final = (
    ("language", "사람이 읽는 언어"),
    ("numeric", "계산 가능한 표현"),
    ("transform", "모델 계산"),
    ("result", "결과"),
    ("token-preview", "다음 질문"),
)
VIEWPORTS: Final = (
    (1440, 900), (1366, 768), (1024, 768),
    (768, 1024), (390, 844), (320, 568),
)
RAF_PROBE: Final = """
(() => {
  const request = window.requestAnimationFrame.bind(window);
  const cancel = window.cancelAnimationFrame.bind(window);
  const pending = new Set();
  window.requestAnimationFrame = callback => {
    let id = 0;
    id = request(time => { pending.delete(id); callback(time); });
    pending.add(id); return id;
  };
  window.cancelAnimationFrame = id => { pending.delete(id); cancel(id); };
  Object.defineProperty(window, '__goldenRafPending', {
    configurable: true, get: () => pending.size,
  });
})();
"""


def open_chapter(browser: ChromeSession, base_url: str) -> None:
    browser.navigate(base_url)
    browser.require_cdp().evaluate(browser.page_session, READY_PROBE, True)
    navigate_hash(
        browser, CHAPTER_HASH,
        f"document.querySelector('{CHAPTER_SELECTOR}') !== null",
        "Golden Chapter 0.1",
    )
    wait_for(
        browser,
        f"document.querySelector('{DECK_SELECTOR}')?.dataset.narrativeSlideIndex === '1'",
        "Golden initial slide",
    )


def finish_motion(browser: ChromeSession) -> None:
    browser.require_cdp().evaluate(
        browser.page_session,
        f"""(() => {{
          const deck = document.querySelector('{DECK_SELECTOR}');
          if (!deck) throw new Error('Golden deck missing');
          for (const animation of deck.getAnimations({{subtree: true}}))
            animation.finish();
          return new Promise(resolve => requestAnimationFrame(
            () => requestAnimationFrame(resolve),
          ));
        }})()""",
        True,
    )


def select_state(browser: ChromeSession, index: int, stage: str) -> None:
    browser.require_cdp().evaluate(
        browser.page_session,
        f"""(() => {{
          const button = document.querySelectorAll(
            '{DECK_SELECTOR} .visual-narrative__progress button'
          )[{index}];
          if (!(button instanceof HTMLButtonElement))
            throw new Error('Golden progress button missing');
          button.click(); button.blur();
        }})()""",
        True,
    )
    wait_for(
        browser,
        f"document.querySelector('{DECK_SELECTOR}')?.dataset.narrativeStage === {json.dumps(stage)}",
        f"Golden slide {index + 1}: {stage}",
    )
    finish_motion(browser)


def probe(browser: ChromeSession) -> JsonObject:
    return evaluate_dict(browser, f"""(() => {{
      const deck = document.querySelector('{DECK_SELECTOR}');
      const stage = deck?.querySelector(':scope > .visual-narrative__stage');
      const beat = stage?.querySelector('.visual-narrative__beat');
      const visualWrap = stage?.querySelector(':scope > .visual-narrative__visual');
      const visual = document.querySelector('{VISUAL_SELECTOR}');
      const controls = deck?.querySelector(':scope > .visual-narrative__steps');
      const figure = deck?.querySelector('[data-figure-id]');
      const content = document.querySelector('.learning-guide-introduction > p');
      const guide = document.querySelector('.learning-guide');
      const rect = element => element?.getBoundingClientRect();
      const box = element => {{ const r = rect(element); return {{
        left: r?.left ?? -1, top: r?.top ?? -1, right: r?.right ?? -1,
        bottom: r?.bottom ?? -1, width: r?.width ?? -1, height: r?.height ?? -1,
      }}; }};
      const previous = deck?.querySelector('[data-deck-action="previous"]');
      const next = deck?.querySelector('[data-deck-action="next"]');
      const deckBox = box(deck), stageBox = box(stage), beatBox = box(beat);
      const wrapBox = box(visualWrap), visualBox = box(visual);
      const controlBox = box(controls), contentBox = box(content);
      const guideBox = box(guide);
      const style = element => element ? getComputedStyle(element) : null;
      const observer = window.__narrativeObserverMetrics;
      return {{
        width: innerWidth, height: innerHeight,
        stageName: deck?.getAttribute('data-narrative-stage') ?? '',
        visualStage: visual?.getAttribute('data-nlp-stage') ?? '',
        slideIndex: Number(deck?.getAttribute('data-narrative-slide-index')),
        deckCount: document.querySelectorAll('{DECK_SELECTOR}').length,
        beatCount: deck?.querySelectorAll('.visual-narrative__beat').length ?? -1,
        activeBeatCount: deck?.querySelectorAll('[data-narrative-active="true"]').length ?? -1,
        stageWidth: stageBox.width, stageHeight: stageBox.height,
        contentStart: contentBox.left, wideEnd: guideBox.right,
        leftStart: beatBox.left, leftEnd: beatBox.right,
        beatBottom: beatBox.bottom,
        rightStart: wrapBox.left, rightEnd: stageBox.right,
        visualLeft: visualBox.left, visualTop: visualBox.top,
        visualWidth: visualBox.width, visualHeight: visualBox.height,
        visualCenterX: visualBox.left + visualBox.width / 2,
        visualCenterY: visualBox.top + visualBox.height / 2,
        controlLeft: controlBox.left, controlTop: controlBox.top,
        controlWidth: controlBox.width, controlHeight: controlBox.height,
        previousWidth: box(previous).width, previousHeight: box(previous).height,
        nextWidth: box(next).width, nextHeight: box(next).height,
        documentOverflow: Math.max(
          0,
          document.documentElement.scrollWidth
            - document.documentElement.clientWidth,
        ),
        localOverflow: deck instanceof HTMLElement
          ? Math.max(0, deck.scrollWidth - deck.clientWidth) : -1,
        canvasCount: figure?.querySelectorAll('canvas').length ?? -1,
        r3fCount: figure?.querySelectorAll('[data-threeui-renderer="r3f"]').length ?? -1,
        replayCount: [...(deck?.querySelectorAll('button') ?? [])]
          .filter(button => button.textContent?.includes('처음부터')).length,
        figureBorder: style(figure)?.borderTopWidth ?? '',
        deckBorder: style(deck)?.borderTopWidth ?? '',
        visualPosition: style(visualWrap)?.position ?? '',
        stageMinHeight: style(stage)?.minBlockSize ?? '',
        pendingRaf: window.__goldenRafPending ?? -1,
        observerActive: observer?.active ?? -1,
        observerCreated: observer?.created ?? -1,
      }};
    }})()""")


def assert_probe(data: JsonObject, stage: str, index: int) -> None:
    require(data["stageName"] == stage and data["visualStage"] == stage, f"Golden stage root: {data}")
    require(data["slideIndex"] == index + 1, f"Golden slide index: {data}")
    require(data["deckCount"] == 1 and data["beatCount"] == 1, f"Golden mounted deck: {data}")
    require(data["activeBeatCount"] == 1, f"Golden active beat: {data}")
    for key in ("documentOverflow", "localOverflow", "canvasCount", "r3fCount", "replayCount"):
        require(data[key] == 0, f"Golden {key}: {data}")
    require(data["figureBorder"] == "0px" and data["deckBorder"] == "0px", f"Golden card border: {data}")
    require(data["pendingRaf"] == 0, f"Golden idle RAF: {data}")
    require(data["observerActive"] == 0 and data["observerCreated"] == 0, f"Golden scroll observer: {data}")
    for key in ("previousWidth", "previousHeight", "nextWidth", "nextHeight"):
        require(number(data[key], key) >= 44, f"Golden control target: {data}")
    width = number(data["width"], "viewport width")
    if width > 768:
        require(480 <= number(data["stageHeight"], "stage height") <= 600, f"Golden desktop height: {data}")
    else:
        require(data["stageMinHeight"] == "0px", f"Golden mobile fixed stage: {data}")
        require(number(data["beatBottom"], "copy bottom") <= number(data["visualTop"], "visual top"), f"Golden mobile order: {data}")
    require(data["visualPosition"] != "sticky", f"Golden sticky visual: {data}")
