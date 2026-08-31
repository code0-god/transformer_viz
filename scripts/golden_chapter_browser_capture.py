"""Identity, control, copy, and representation contracts for the Golden deck."""

from __future__ import annotations

from typing import Final, Literal, TypeAlias

from browser_hybrid_contract import number, require
from browser_hybrid_helpers import JsonObject, evaluate_dict, pointer_click
from browser_session import ChromeSession
import golden_chapter_browser_probes as golden

ArrowKey: TypeAlias = Literal["ArrowLeft", "ArrowRight"]
_KEY_VIRTUAL: Final = {
    "ArrowLeft": 37,
    "ArrowRight": 39,
}

_DESCRIPTION = (
    "문장이 여러 숫자로 이루어진 표현으로 바뀌고, 그 숫자들이 계산 과정에서 다른 값으로 "
    "변한 뒤 사람이 이해할 수 있는 결과로 연결되는 개념을 보여줍니다."
)
_SUMMARIES = (
    "사람이 문장을 읽고 뜻과 분위기를 이해하며, 재미있었다는 표현에서 긍정적인 "
    "느낌을 알아차리는 모습을 보여줍니다.",
    "문장이 아래쪽 화살표를 따라 실제 모델 값이 아닌 한 줄의 설명용 숫자 표현으로 "
    "이어집니다.",
    "같은 여섯 숫자 칸에서 계산 전 값이 아래쪽 화살표를 따라 계산 후 값으로 바뀌는 "
    "모습을 보여줍니다.",
    "계산된 숫자 표현이 문장 분류로 읽혀 개념적인 긍정 결과가 되고, 질문 답변과 "
    "번역과 글 생성은 다른 자연어 처리 문제로 구분됩니다.",
    "처음 문장에 개념적인 경계가 순서대로 나타나며 다음 Token Chapter로 이어집니다.",
)


def mark_identity(browser: ChromeSession) -> None:
    result = evaluate_dict(browser, """(() => {
      const deck = document.querySelector('[data-narrative-mode="deck"]');
      const visual = document.querySelector('[data-testid="nlp-golden-visual"]');
      const sentence = document.querySelector('[data-testid="nlp-golden-sentence"]');
      const strip = document.querySelector('[data-testid="nlp-golden-numeric-strip"]');
      if (!deck || !visual || !sentence || !strip)
        throw new Error('Golden persistent object missing');
      window.__goldenIdentity = { deck, visual, sentence, strip };
      return { deck: true, visual: true, sentence: true, strip: true };
    })()""")
    require(all(value is True for value in result.values()), f"Golden identity mark: {result}")


def assert_identity(browser: ChromeSession, stage: str) -> None:
    result = evaluate_dict(browser, """(() => {
      const saved = window.__goldenIdentity;
      return {
        deck: saved?.deck === document.querySelector('[data-narrative-mode="deck"]'),
        visual: saved?.visual === document.querySelector('[data-testid="nlp-golden-visual"]'),
        sentence: saved?.sentence === document.querySelector('[data-testid="nlp-golden-sentence"]'),
        strip: saved?.strip === document.querySelector('[data-testid="nlp-golden-numeric-strip"]'),
      };
    })()""")
    require(all(value is True for value in result.values()), f"Golden identity at {stage}: {result}")


def assert_copy(browser: ChromeSession, index: int, stage: str) -> JsonObject:
    result = evaluate_dict(browser, """(() => {
      const article = document.querySelector(
        '[data-curriculum-chapter-id="decoder.chapter.0.1"]'
      );
      const visual = document.querySelector('[data-testid="nlp-golden-visual"]');
      const described = visual?.getAttribute('aria-describedby') ?? '';
      const description = described === '' ? null : document.getElementById(described);
      const dots = [...document.querySelectorAll(
        '[data-narrative-mode="deck"] .visual-narrative__progress button'
      )];
      const fallback = [...document.querySelectorAll('[data-nlp-fallback-stage]')];
      const visibleText = [...(article?.querySelectorAll('*') ?? [])]
        .filter(element => {
          if (element.children.length > 0 || element.getAttribute('aria-hidden') === 'true') return false;
          const style = getComputedStyle(element);
          const rect = element.getBoundingClientRect();
          return style.display !== 'none' && style.visibility !== 'hidden'
            && rect.width > 1 && rect.height > 1;
        }).map(element => element.textContent ?? '').join(' ');
      return {
        description: description?.textContent?.trim() ?? '',
        fallbackCount: fallback.length,
        fallbackCurrent: fallback.filter(item => item.getAttribute('aria-current') === 'step').length,
        dotCount: dots.length,
        dotCurrent: dots.filter(item => item.getAttribute('aria-current') === 'step').length,
        dotLabels: dots.map(item => item.getAttribute('aria-label') ?? '').join('|'),
        forbidden: /matrix|tensor|row|column|embedding|\\[T,C\\]/i.test(visibleText),
        caveats: (article?.textContent ?? '').includes('설명을 위한 예시 · 실제 모델 값 아님')
          && (article?.textContent ?? '').includes('개념 예시')
          && (article?.textContent ?? '').includes('실제 경계는 토크나이저에 따라 달라집니다.'),
        handoffCount: document.querySelectorAll('[data-next-chapter="decoder.chapter.0.2"]').length,
      };
    })()""")
    require(result["description"] == f"{_DESCRIPTION} {_SUMMARIES[index]}", f"Golden description: {result}")
    require(result["fallbackCount"] == 5 and result["fallbackCurrent"] == 1, f"Golden summaries: {result}")
    require(result["dotCount"] == 5 and result["dotCurrent"] == 1, f"Golden progress: {result}")
    labels = "|".join(f"{position + 1}단계: {label}" for position, (_, label) in enumerate(golden.STATES))
    require(result["dotLabels"] == labels, f"Golden semantic progress: {result}")
    require(result["forbidden"] is False and result["caveats"] is True, f"Golden copy boundary: {result}")
    require(result["handoffCount"] == (1 if stage == "token-preview" else 0), f"Golden handoff scope: {result}")
    return result


def assert_numeric_representation(browser: ChromeSession) -> JsonObject:
    golden.select_state(browser, 1, "numeric")
    numeric = evaluate_dict(browser, """(() => {
      const strips = [...document.querySelectorAll('[data-nlp-representation="sequence"]')];
      const strip = strips[0]; const slots = [...(strip?.querySelectorAll(':scope > [data-nlp-value]') ?? [])];
      const boxes = slots.map(slot => slot.getBoundingClientRect());
      window.__goldenSlots = slots;
      window.__goldenPhases = slots.flatMap(slot => [...slot.children]);
      const rect = strip?.getBoundingClientRect();
      return {
        sequenceCount: strips.length, slotCount: slots.length,
        forbiddenAttributes: document.querySelectorAll('[data-nlp-cell], [data-nlp-cell-group], [data-nlp-rows], [data-nlp-columns]').length,
        oneLine: boxes.every(box => Math.abs(box.top - (boxes[0]?.top ?? 0)) <= 1),
        mixed: (strip?.textContent ?? '').includes('-') && (strip?.textContent ?? '').includes('…'),
        left: rect?.left ?? -1, top: rect?.top ?? -1,
        width: rect?.width ?? -1, height: rect?.height ?? -1,
      };
    })()""")
    require(numeric["sequenceCount"] == 1 and numeric["slotCount"] == 6, f"Golden sequence: {numeric}")
    require(numeric["forbiddenAttributes"] == 0 and numeric["oneLine"] is True, f"Golden sequence shape: {numeric}")
    require(numeric["mixed"] is True, f"Golden illustrative values: {numeric}")
    golden.select_state(browser, 2, "transform")
    transformed = evaluate_dict(browser, """(() => {
      const strip = document.querySelector('[data-testid="nlp-golden-numeric-strip"]');
      const slots = [...(strip?.querySelectorAll(':scope > [data-nlp-value]') ?? [])];
      const phases = slots.flatMap(slot => [...slot.children]);
      const rect = strip?.getBoundingClientRect();
      return {
        slotsSame: slots.every((slot, index) => slot === window.__goldenSlots[index]),
        phasesSame: phases.every((phase, index) => phase === window.__goldenPhases[index]),
        left: rect?.left ?? -1, top: rect?.top ?? -1,
        width: rect?.width ?? -1, height: rect?.height ?? -1,
      };
    })()""")
    require(transformed["slotsSame"] is True and transformed["phasesSame"] is True, f"Golden slot identity: {transformed}")
    for key in ("left", "top", "width", "height"):
        require(abs(number(numeric[key], key) - number(transformed[key], key)) <= 1, f"Golden strip bounds: {numeric}, {transformed}")
    return {"numeric": numeric, "transform": transformed}


def _key(browser: ChromeSession, key: ArrowKey) -> None:
    for event_type in ("keyDown", "keyUp"):
        browser.require_cdp().send("Input.dispatchKeyEvent", {
            "type": event_type, "key": key, "code": key,
            "windowsVirtualKeyCode": _KEY_VIRTUAL[key],
        }, browser.page_session)


def controls_contract(browser: ChromeSession) -> JsonObject:
    initial = evaluate_dict(browser, """(() => ({
      stage: document.querySelector('[data-narrative-mode="deck"]')?.dataset.narrativeStage ?? '',
      previousDisabled: document.querySelector('[data-deck-action="previous"]')?.disabled ?? false,
      hash: location.hash, historyLength: history.length,
    }))()""")
    require(initial["stage"] == "language" and initial["previousDisabled"] is True, f"Golden initial bound: {initial}")
    pointer_click(browser, "document.querySelector('[data-deck-action=\"next\"]')", condition="document.querySelector('[data-narrative-mode=deck]')?.dataset.narrativeStage === 'numeric'", label="Golden real Next")
    pointer_click(browser, "document.querySelector('[data-deck-action=\"previous\"]')", condition="document.querySelector('[data-narrative-mode=deck]')?.dataset.narrativeStage === 'language'", label="Golden real Previous")
    golden.select_state(browser, 1, "numeric")
    browser.require_cdp().evaluate(browser.page_session, "document.querySelector('[data-deck-action=\"next\"]')?.focus()", True)
    _key(browser, "ArrowRight")
    golden.finish_motion(browser)
    require(evaluate_dict(browser, "({stage:document.querySelector('[data-narrative-mode=deck]').dataset.narrativeStage})")["stage"] == "transform", "Golden ArrowRight")
    _key(browser, "ArrowLeft")
    golden.finish_motion(browser)
    require(evaluate_dict(browser, "({stage:document.querySelector('[data-narrative-mode=deck]').dataset.narrativeStage})")["stage"] == "numeric", "Golden ArrowLeft")
    editable = evaluate_dict(browser, """(() => {
      const deck = document.querySelector('[data-narrative-mode="deck"]');
      const input = document.createElement('input'); deck.append(input); input.focus();
      return {ready: document.activeElement === input};
    })()""")
    require(editable["ready"] is True, f"Golden editable setup: {editable}")
    _key(browser, "ArrowRight")
    unchanged = evaluate_dict(browser, """(() => { const stage = document.querySelector('[data-narrative-mode="deck"]').dataset.narrativeStage; document.querySelector('[data-narrative-mode="deck"] > input')?.remove(); return {stage}; })()""")
    require(unchanged["stage"] == "numeric", f"Golden editable arrow: {unchanged}")
    wheel = evaluate_dict(browser, """(() => { const deck = document.querySelector('[data-narrative-mode="deck"]'); const event = new WheelEvent('wheel', {deltaY: 240, bubbles: true, cancelable: true}); return {accepted: deck.dispatchEvent(event), canceled: event.defaultPrevented, stage: deck.dataset.narrativeStage}; })()""")
    require(wheel == {"accepted": True, "canceled": False, "stage": "numeric"}, f"Golden wheel: {wheel}")
    golden.select_state(browser, 4, "token-preview")
    bounds = evaluate_dict(browser, """(() => { const next = document.querySelector('[data-deck-action="next"]'); next.click(); return {stage: document.querySelector('[data-narrative-mode="deck"]').dataset.narrativeStage, nextDisabled: next.disabled, hash: location.hash, historyLength: history.length}; })()""")
    require(bounds["stage"] == "token-preview" and bounds["nextDisabled"] is True, f"Golden final bound: {bounds}")
    require(bounds["hash"] == initial["hash"] and bounds["historyLength"] == initial["historyLength"], f"Golden history mutation: {initial}, {bounds}")
    return {"initial": initial, "wheel": wheel, "bounds": bounds}
