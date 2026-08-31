"""Navigation and motion probes for the Chapter 0.1 five-slide deck."""

from __future__ import annotations

import json
from typing import Final

from browser_hybrid_helpers import navigate_hash, wait_for
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
    (1440, 900),
    (1366, 768),
    (1024, 768),
    (768, 1024),
    (390, 844),
    (320, 568),
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
        browser,
        CHAPTER_HASH,
        f"document.querySelector('{CHAPTER_SELECTOR}') !== null",
        "Golden Chapter 0.1",
    )
    wait_for(
        browser,
        f"document.querySelector('{DECK_SELECTOR}')"
        "?.dataset.narrativeSlideIndex === '1'",
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


def position_deck(browser: ChromeSession) -> None:
    browser.require_cdp().evaluate(
        browser.page_session,
        f"""(() => {{
          const deck = document.querySelector('{DECK_SELECTOR}');
          if (!(deck instanceof HTMLElement))
            throw new Error('Golden deck missing');
          const headerBottom = Math.max(
            0,
            ...[...document.querySelectorAll('header')]
              .filter(element => ['fixed', 'sticky'].includes(
                getComputedStyle(element).position
              ))
              .map(element => element.getBoundingClientRect().bottom),
          );
          const top = scrollY + deck.getBoundingClientRect().top;
          scrollTo({{top: Math.max(0, top - headerBottom - 4), left: 0}});
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
        f"document.querySelector('{DECK_SELECTOR}')"
        f"?.dataset.narrativeStage === {json.dumps(stage)}",
        f"Golden slide {index + 1}: {stage}",
    )
    finish_motion(browser)
