"""Replay-backed dense desktop evidence journey."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from browser_cdp import Cdp


@dataclass(frozen=True, slots=True)
class JourneyProbeError(Exception):
    """Report an invalid result from a browser journey probe."""

    probe: str

    def __str__(self) -> str:
        return f"{self.probe} probe returned an invalid result"


DENSE_REPLAY_PROBE = r"""new Promise((resolve, reject) => {
  const timeout = setTimeout(() => finish('dense replay timeout'), 30000);
  let replayStarted = false;
  let stageSelected = false;
  const defaultPrompt = document.querySelector('#generation-prompt').value;
  const observer = new MutationObserver(check);
  const finish = error => {
    clearTimeout(timeout);
    observer.disconnect();
    if (error) reject(error);
    else requestAnimationFrame(() => requestAnimationFrame(() => {
      const stage = document.querySelector('.stage-canvas');
      const visual = document.querySelector('.stage-visual');
      resolve({
        clientHeight: stage.clientHeight,
        scrollHeight: stage.scrollHeight,
        visualOverflow: getComputedStyle(visual).overflow,
        visualBottom: visual.getBoundingClientRect().top - stage.getBoundingClientRect().top
          + stage.scrollTop + visual.scrollHeight,
        stageScrollHeight: stage.scrollHeight,
        matrix: Boolean(document.querySelector('.attention-matrix')),
        defaultPrompt,
        generatedCount: document.querySelectorAll('.generated-token').length,
        decoded: document.querySelector('[data-testid="decoded-continuation"]').textContent
      });
    }));
  };
  function check() {
    const status = document.querySelector('#status');
    if (status?.dataset.status === 'error') {
      finish(`dense replay entered error: ${status.textContent}`);
      return;
    }
    const generated = [...document.querySelectorAll('.generated-token')];
    const finished = document.querySelector('[data-testid="generation-status"]')?.textContent.includes('완료');
    if (finished && generated.length >= 2 && !replayStarted) {
      replayStarted = true;
      generated.at(-1).click();
      return;
    }
    const replayReady = document.querySelector('.context-token[data-trace-ready="true"]');
    if (replayStarted && replayReady && !stageSelected) {
      stageSelected = true;
      document.querySelector('#curriculum-stage-6').click();
      return;
    }
    if (stageSelected && document.querySelector('.attention-matrix')) finish();
  }
  observer.observe(document.documentElement, {subtree: true, childList: true, attributes: true});
  document.querySelector('[data-testid="generate"]').click();
  check();
})"""


STREAM_REVEAL_PROBE = r"""new Promise((resolve, reject) => {
  const timeout = setTimeout(() => finish('stream reveal timeout'), 30000);
  const focusKey = () => document.activeElement.id || document.activeElement.dataset.testid || document.activeElement.tagName;
  const initial = {scrollX, docW: document.documentElement.scrollWidth, focus: focusKey()};
  const violations = [];
  const observer = new MutationObserver(check);
  const visibleIn = (item, reel) => {
    const a = item.getBoundingClientRect(), b = reel.getBoundingClientRect();
    return a.left >= b.left - 1 && a.right <= b.right + 1;
  };
  function finish(error) {
    clearTimeout(timeout);
    observer.disconnect();
    if (error) reject(error); else requestAnimationFrame(() => resolve({
      requested: Number(document.querySelector('#max-new-tokens').value),
      count: document.querySelectorAll('.generated-token').length,
      violations, initial, scrollX, docW: document.documentElement.scrollWidth,
      focus: focusKey()
    }));
  }
  function check() {
    const status = document.querySelector('#status');
    if (status?.dataset.status === 'error') return finish(`stream entered error: ${status.textContent}`);
    const generated = [...document.querySelectorAll('.generated-token')];
    if (generated.length) {
      const newest = generated.at(-1);
      const context = document.querySelector(`#context-token-${
        document.querySelectorAll('.context-token').length - 1}`);
      if (!visibleIn(newest, document.querySelector('#generated-token-reel'))) violations.push(`generated:${generated.length}`);
      if (!context || !visibleIn(context, document.querySelector('#token-reel'))) violations.push(`context:${generated.length}`);
      if (scrollX !== initial.scrollX || document.documentElement.scrollWidth !== initial.docW) violations.push(`document:${generated.length}`);
      if (focusKey() !== initial.focus) violations.push(`focus:${generated.length}`);
    }
    if (document.querySelector('[data-testid="generation-status"]')?.textContent.includes('완료')) finish();
  }
  observer.observe(document.documentElement, {subtree: true, childList: true, attributes: true, characterData: true});
  document.querySelector('#mode-guided').focus();
  initial.focus = focusKey();
  document.querySelector('[data-testid="generate"]').click();
  check();
})"""


def replay_detail_navigation(cdp: Cdp, session: str) -> dict[str, Any]:
    cdp.evaluate(
        session,
        "new Promise(resolve=>{document.querySelector('#tab-tensor').click();"
        "requestAnimationFrame(()=>requestAnimationFrame(resolve));})",
        True,
    )
    before = cdp.evaluate(session, "window.__phase9WorkerPosts")
    seen: list[str] = []
    failures: list[str] = []
    for stage in (3, 4, 5, 7, 8, 9, 10, 11):
        ids = cdp.evaluate(
            session,
            f"""new Promise(resolve => {{
              document.querySelector('#curriculum-stage-{stage}').click();
              requestAnimationFrame(() => requestAnimationFrame(() => resolve(
                [...document.querySelectorAll('.detail-operation-list button')]
                  .map(button => button.dataset.detailTensorId))));
            }})""",
            True,
        )
        for tensor_id in ids:
            selector = f'[data-detail-tensor-id="{tensor_id}"]'
            result = cdp.evaluate(
                session,
                f"""new Promise(resolve => {{
                  document.querySelector({selector!r}).click();
                  requestAnimationFrame(() => {{
                    const button = document.querySelector({selector!r});
                    button.focus();
                    requestAnimationFrame(() => {{
                      const current = document.querySelector({selector!r});
                      const rect = current.getBoundingClientRect();
                      resolve({{focused: document.activeElement === current,
                        visible: rect.top >= 0 && rect.bottom <= innerHeight,
                        posts: window.__phase9WorkerPosts}});
                    }});
                  }});
                }})""",
                True,
            )
            seen.append(tensor_id)
            if result != {"focused": True, "visible": True, "posts": before}:
                failures.append(f"{tensor_id}:{result}")
    renderers: list[str] = []
    for stage in range(14, 21):
        operation = cdp.evaluate(
            session,
            f"""new Promise(resolve => {{
              document.querySelector('#curriculum-stage-{stage}').click();
              requestAnimationFrame(() => requestAnimationFrame(() => resolve(
                document.querySelector('.stage-visual[data-operation]')?.dataset.operation
                || (document.querySelector('[data-testid="evidence-generated-token"]') ? 'generated-token' : '')
                || (document.querySelector('.prediction-visual') ? 'logits' : 'missing'))));
            }})""",
            True,
        )
        renderers.append(operation)
    return {
        "count": len(seen),
        "distinct": len(set(seen)),
        "posts": before,
        "renderers": renderers,
        "distinctRenderers": len(set(renderers)),
        "failures": failures,
    }


def stream_reveal(cdp: Cdp, session: str) -> dict[str, Any]:
    result = cdp.evaluate(session, STREAM_REVEAL_PROBE, True)
    if not isinstance(result, dict):
        raise JourneyProbeError(probe="stream reveal")
    return result


def dense_replay(cdp: Cdp, session: str) -> dict[str, Any]:
    result = cdp.evaluate(session, DENSE_REPLAY_PROBE, True)
    if not isinstance(result, dict):
        raise JourneyProbeError(probe="dense replay")
    return result
