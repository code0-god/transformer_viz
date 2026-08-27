#!/usr/bin/env python3
"""Exercise the React production bundle against the real Rust Worker."""

from __future__ import annotations

import argparse
import threading
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Protocol
from urllib.parse import urlsplit

from browser_session import ChromeSession
from browser_urls import lab_url


class ReactIntegrationError(RuntimeError):
    """React production surface violates its integration contract."""


class LogValue(Protocol):
    """Value accepted by the standard HTTP request logger."""

    def __str__(self) -> str:
        """Render value for percent-style request logging."""
        ...


class QuietHandler(SimpleHTTPRequestHandler):
    """Serve a production bundle without request log noise."""

    def log_message(self, format: str, *args: LogValue) -> None:
        return


READY = r"""(() => new Promise((resolve, reject) => {
  const finish = () => {
    const status = document.querySelector('#status');
    const value = status?.dataset.status;
    const root = document.querySelector('[data-testid="architecture-root"]');
    if (value === 'ready' && root) {
      observer.disconnect();
      clearTimeout(timeout);
      requestAnimationFrame(() => requestAnimationFrame(() => {
        const stableStatus = document.querySelector('#status')?.dataset.status;
        const stableRoot = document.querySelector('[data-testid="architecture-root"]');
        stableStatus === 'ready' && stableRoot
          ? resolve(stableStatus)
          : reject(new Error('react-ready state did not remain mounted'));
      }));
    } else if (value === 'error') {
      observer.disconnect();
      clearTimeout(timeout);
      reject(new Error(status?.textContent));
    }
  };
  const observer = new MutationObserver(finish);
  observer.observe(document.body, { attributes: true, childList: true, subtree: true });
  const timeout = setTimeout(() => {
    observer.disconnect();
    reject(new Error('react-worker-ready timeout'));
  }, 30000);
  finish();
}))()"""

GENERATE = r"""(() => new Promise((resolve, reject) => {
  const prompt = document.querySelector('#generation-prompt');
  const button = [...document.querySelectorAll('button')]
    .find((item) => item.textContent?.trim() === 'Generate');
  const status = document.querySelector('#status');
  if (!(prompt instanceof HTMLTextAreaElement) || !(button instanceof HTMLButtonElement)) {
    reject(new Error('generation controls missing'));
    return;
  }
  const setter = Object.getOwnPropertyDescriptor(
    HTMLTextAreaElement.prototype,
    'value',
  )?.set;
  setter?.call(prompt, 'the cat sat on the');
  prompt.dispatchEvent(new InputEvent('input', { bubbles: true }));
  const finish = () => {
    const value = status?.dataset.status;
    if (value === 'complete' || value === 'error') {
      observer.disconnect();
      clearTimeout(timeout);
      value === 'complete'
        ? resolve({
            text: document.querySelectorAll('.continuation-panel output')[1]?.textContent ?? '',
            steps: document.querySelectorAll('.generation-steps button').length,
          })
        : reject(new Error(status?.textContent));
    }
  };
  const observer = new MutationObserver(finish);
  if (status) observer.observe(status, { attributes: true, childList: true, subtree: true });
  const timeout = setTimeout(() => {
    observer.disconnect();
    reject(new Error('react-generation timeout'));
  }, 60000);
  button.click();
}))()"""

NAVIGATE = r"""(async () => {
  const waitForSelector = (selector) => new Promise((resolve, reject) => {
    const current = document.querySelector(selector);
    if (current) {
      resolve(current);
      return;
    }
    const observer = new MutationObserver(() => {
      const node = document.querySelector(selector);
      if (!node) return;
      observer.disconnect();
      clearTimeout(timeout);
      resolve(node);
    });
    observer.observe(document.body, { childList: true, subtree: true });
    const timeout = setTimeout(() => {
      observer.disconnect();
      reject(new Error(`selector timeout: ${selector}`));
    }, 10000);
  });
  const clickNode = (id) => {
    const node = document.querySelector(`[data-node-id="${id}"]`);
    if (!(node instanceof Element)) return false;
    node.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    return true;
  };
  const root = document.querySelector('[data-testid="architecture-root"]');
  const openedBlock = clickNode('transformer-block');
  const block = await waitForSelector('[data-testid="architecture-detail"]');
  const openedAttention = clickNode('self-attention');
  const attention = await waitForSelector('[data-testid="attention-detail"]');
  return {
    root: Boolean(root),
    block: Boolean(block),
    attention: Boolean(attention),
    openedBlock,
    openedAttention,
    katex: document.querySelectorAll('.katex').length,
    mathml: document.querySelectorAll('.katex-mathml math').length,
    documentOverflow: document.documentElement.scrollWidth - innerWidth,
  };
})()"""


def verify(root: Path, entry: str) -> None:
    handler = partial(QuietHandler, directory=str(root))
    server = ThreadingHTTPServer(("127.0.0.1", 0), handler)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    try:
        with ChromeSession() as browser:
            cdp = browser.require_cdp()
            cdp.send("Runtime.enable", {}, browser.page_session)
            cdp.send("Page.enable", {}, browser.page_session)
            cdp.send(
                "Page.setLifecycleEventsEnabled",
                {"enabled": True},
                browser.page_session,
            )
            origin = f"http://127.0.0.1:{server.server_port}"
            navigation = cdp.send(
                "Page.navigate",
                {"url": lab_url(origin, "/" if entry == "index.html" else "/transformer_viz/")},
                browser.page_session,
            )
            loader_id = navigation.get("loaderId")
            if not isinstance(loader_id, str):
                raise ReactIntegrationError(f"navigation missing loaderId: {navigation}")
            cdp.wait_for_event(
                "Page.lifecycleEvent",
                browser.page_session,
                lambda event: event.get("params", {}).get("loaderId") == loader_id
                and event.get("params", {}).get("name") == "load",
            )
            cdp.evaluate(browser.page_session, READY, True)
            generation = cdp.evaluate(browser.page_session, GENERATE, True)
            state = cdp.evaluate(browser.page_session, NAVIGATE, True)
            cdp.evaluate(browser.page_session, "document.fonts.ready", True)
            font_ready = cdp.evaluate(
                browser.page_session,
                "document.fonts.check('16px KaTeX_Main')",
            )
            runtime_errors = [
                event
                for event in cdp.events
                if event.get("method") == "Runtime.exceptionThrown"
                or (
                    event.get("method") == "Runtime.consoleAPICalled"
                    and event.get("params", {}).get("type") in {"assert", "error"}
                )
            ]
            responses = [
                event.get("params", {}).get("response", {})
                for event in cdp.events
                if event.get("method") == "Network.responseReceived"
            ]
            production_assets = [
                response
                for response in responses
                if urlsplit(response.get("url", "")).path.endswith(
                    (".js", ".css", ".wasm", ".woff2", ".safetensors")
                )
            ]
            suffixes = {
                Path(urlsplit(response["url"]).path).suffix
                for response in production_assets
                if response.get("url", "").startswith(origin)
                and int(response.get("status", 0)) == 200
            }
            if (
                generation["steps"] < 1
                or not state["root"]
                or not state["block"]
                or not state["attention"]
                or not state["openedBlock"]
                or not state["openedAttention"]
                or state["katex"] == 0
                or state["mathml"] == 0
                or state["documentOverflow"] > 0
                or not font_ready
                or not {".js", ".css", ".wasm", ".woff2", ".safetensors"}
                <= suffixes
                or runtime_errors
            ):
                raise ReactIntegrationError(
                    f"React integration failed: generation={generation!r}, "
                    f"state={state}, font_ready={font_ready}, "
                    f"suffixes={sorted(suffixes)}, runtime_errors={runtime_errors}"
                )
    finally:
        server.shutdown()
        server.server_close()
        thread.join(timeout=10)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--root", type=Path, required=True)
    parser.add_argument("--entry", default="index.html")
    args = parser.parse_args()
    verify(args.root.resolve(), args.entry)
    print("React Worker generation and Architecture navigation: PASS")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
