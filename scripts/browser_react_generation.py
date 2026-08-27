#!/usr/bin/env python3
"""Verify React generation bytes, Stop, and replay against the real Worker."""

from __future__ import annotations

import argparse
import threading
from functools import partial
from http.server import ThreadingHTTPServer
from pathlib import Path

from browser_react_integration import QuietHandler, ReactIntegrationError
from browser_session import ChromeSession
from browser_urls import lab_url

INSTRUMENT_WORKER = r"""(() => {
  const OriginalWorker = window.Worker;
  window.__reactWorkerMessages = [];
  window.__reactWorkerRequests = [];
  window.Worker = class extends OriginalWorker {
    constructor(...args) {
      super(...args);
      this.addEventListener('message', event => {
        window.__reactWorkerMessages.push(event.data);
        dispatchEvent(new CustomEvent('__react-worker-response', {
          detail: event.data,
        }));
      });
    }
    postMessage(message, options) {
      window.__reactWorkerRequests.push(message);
      dispatchEvent(new CustomEvent('__react-worker-request', {
        detail: message,
      }));
      return super.postMessage(message, options);
    }
  };
})()"""

READY = r"""new Promise((resolve, reject) => {
  const finish = () => {
    const status = document.querySelector('#status');
    if (status?.dataset.status === 'ready') {
      observer.disconnect();
      clearTimeout(timeout);
      requestAnimationFrame(() => requestAnimationFrame(resolve));
    } else if (status?.dataset.status === 'error') {
      observer.disconnect();
      clearTimeout(timeout);
      reject(status.textContent);
    }
  };
  const observer = new MutationObserver(finish);
  observer.observe(document.body, {subtree: true, childList: true, attributes: true});
  const timeout = setTimeout(() => {
    observer.disconnect();
    reject('Worker Ready timeout');
  }, 30000);
  finish();
})"""

BAD_INPUT = r"""new Promise((resolve, reject) => {
  const prompt = document.querySelector('#generation-prompt');
  const button = document.querySelector('[data-testid="generate"]');
  const setter = Object.getOwnPropertyDescriptor(
    HTMLTextAreaElement.prototype, 'value',
  )?.set;
  const finish = () => {
    const status = document.querySelector('#status');
    if (status?.dataset.status !== 'error') return;
    observer.disconnect();
    clearTimeout(timeout);
    resolve({
      detail: document.querySelector('.lifecycle-detail')?.textContent ?? '',
      disabled: button?.disabled,
    });
  };
  const observer = new MutationObserver(finish);
  observer.observe(document.body, {subtree: true, childList: true, attributes: true});
  const timeout = setTimeout(() => {
    observer.disconnect();
    reject('empty prompt error timeout');
  }, 10000);
  setter?.call(prompt, '');
  prompt.dispatchEvent(new InputEvent('input', {bubbles: true}));
  button?.click();
})"""

STOP_GENERATION = r"""new Promise((resolve, reject) => {
  const prompt = document.querySelector('#generation-prompt');
  const setter = Object.getOwnPropertyDescriptor(
    HTMLTextAreaElement.prototype, 'value',
  )?.set;
  let stopped = false;
  const cleanup = () => {
    clearTimeout(timeout);
    removeEventListener('__react-worker-response', receive);
  };
  const receive = event => {
    const response = event.detail;
    if (response?.type === 'token_generated' && !stopped) {
      stopped = true;
      [...document.querySelectorAll('button')]
        .find(button => button.textContent?.trim() === 'Stop')?.click();
    }
    if (response?.type === 'error') {
      cleanup();
      reject(response.message);
    }
    if (response?.type !== 'generation_finished') return;
    cleanup();
    requestAnimationFrame(() => requestAnimationFrame(() => {
      const messages = window.__reactWorkerMessages.filter(
        message => message?.request_id === response.request_id,
      );
      const pieces = messages
        .filter(message => message.type === 'token_generated')
        .flatMap(message => message.step.generated_token.piece);
      resolve({
        reason: response.reason,
        requestId: response.request_id,
        decoded: new TextDecoder().decode(Uint8Array.from(pieces)),
        rendered: document.querySelectorAll('.continuation-panel output')[1]
          ?.textContent ?? '',
        steps: document.querySelectorAll('.generation-steps button').length,
      });
    }));
  };
  addEventListener('__react-worker-response', receive);
  const timeout = setTimeout(() => {
    cleanup();
    reject('Stop generation timeout');
  }, 60000);
  setter?.call(prompt, 'the cat');
  prompt.dispatchEvent(new InputEvent('input', {bubbles: true}));
  document.querySelector('[data-testid="generate"]')?.click();
})"""

REPLAY = r"""new Promise((resolve, reject) => {
  const tokenCount = window.__reactWorkerMessages.filter(
    message => message?.type === 'token_generated',
  ).length;
  let inspectRequest = null;
  const cleanup = () => {
    clearTimeout(timeout);
    removeEventListener('__react-worker-request', request);
    removeEventListener('__react-worker-response', response);
  };
  const request = event => {
    if (event.detail?.type === 'inspect_generation_step')
      inspectRequest = event.detail;
  };
  const response = event => {
    if (event.detail?.type === 'error') {
      cleanup();
      reject(event.detail.message);
    }
    if (event.detail?.type !== 'generation_step_trace') return;
    cleanup();
    requestAnimationFrame(() => requestAnimationFrame(() => resolve({
      request: inspectRequest,
      response: event.detail,
      details: Boolean(document.querySelector('.token-details')),
      tokenDelta: window.__reactWorkerMessages.filter(
        message => message?.type === 'token_generated',
      ).length - tokenCount,
    })));
  };
  addEventListener('__react-worker-request', request);
  addEventListener('__react-worker-response', response);
  const timeout = setTimeout(() => {
    cleanup();
    reject('generation replay timeout');
  }, 60000);
  document.querySelector('.generation-steps button')?.click();
})"""


def verify_entry(browser: ChromeSession, url: str) -> None:
    cdp = browser.require_cdp()
    cdp.send(
        "Page.addScriptToEvaluateOnNewDocument",
        {"source": INSTRUMENT_WORKER},
        browser.page_session,
    )
    browser.navigate(url)
    cdp.evaluate(browser.page_session, READY, True)
    bad_input = cdp.evaluate(browser.page_session, BAD_INPUT, True)
    if not bad_input["detail"] or bad_input["disabled"]:
        raise ReactIntegrationError(f"bad input recovery failed: {bad_input}")
    stopped = cdp.evaluate(browser.page_session, STOP_GENERATION, True)
    if (
        stopped["reason"] != "user_stopped"
        or stopped["steps"] < 1
        or stopped["decoded"] != stopped["rendered"]
    ):
        raise ReactIntegrationError(f"Stop/decoded bytes failed: {stopped}")
    replay = cdp.evaluate(browser.page_session, REPLAY, True)
    request = replay["request"]
    response = replay["response"]
    if (
        request is None
        or request["type"] != "inspect_generation_step"
        or response["request_id"] != request["request_id"]
        or response["generation_run_id"] != request["generation_run_id"]
        or response["step_index"] != request["step_index"]
        or not replay["details"]
        or replay["tokenDelta"] != 0
    ):
        raise ReactIntegrationError(f"generation replay failed: {replay}")


def verify(root: Path) -> None:
    server = ThreadingHTTPServer(
        ("127.0.0.1", 0),
        partial(QuietHandler, directory=str(root)),
    )
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    try:
        origin = f"http://127.0.0.1:{server.server_port}"
        for entry in ("/index.html", "/transformer_viz/index.html"):
            with ChromeSession() as browser:
                verify_entry(browser, lab_url(origin, "/" if entry == "/index.html" else "/transformer_viz/"))
            print(f"{entry} generation bytes, Stop, replay: PASS")
    finally:
        server.shutdown()
        server.server_close()
        thread.join(timeout=10)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--root", type=Path, required=True)
    args = parser.parse_args()
    verify(args.root.resolve())
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
