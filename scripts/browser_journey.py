"""Replay-backed dense desktop evidence journey."""

from __future__ import annotations

from typing import Any

from browser_cdp import Cdp

DENSE_REPLAY_PROBE = r"""new Promise((resolve, reject) => {
  const timeout = setTimeout(() => finish('dense replay timeout'), 30000);
  let replayStarted = false;
  let stageSelected = false;
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
        matrix: Boolean(document.querySelector('.attention-matrix'))
      });
    }));
  };
  function check() {
    const status = document.querySelector('#status');
    if (status?.dataset.status === 'error') {
      finish(`dense replay entered error: ${status.textContent}`);
      return;
    }
    const generated = document.querySelector('.generated-token');
    if (generated && !replayStarted) {
      replayStarted = true;
      generated.click();
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
  const input = document.querySelector('#max-new-tokens');
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
  setter.call(input, '1');
  input.dispatchEvent(new Event('input', {bubbles: true}));
  document.querySelector('[data-testid="generate"]').click();
  check();
})"""


def dense_replay(cdp: Cdp, session: str) -> dict[str, Any]:
    result = cdp.evaluate(session, DENSE_REPLAY_PROBE, True)
    if not isinstance(result, dict):
        raise TypeError("dense replay probe returned no geometry")
    return result
