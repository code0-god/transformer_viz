#!/usr/bin/env python3
# /// script
# requires-python = ">=3.12"
# dependencies = []
# ///
"""Real-Chrome regressions for generation request transport failures."""

from __future__ import annotations

import argparse
import json
import threading
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Any

from browser_probes import READY_PROBE
from browser_session import ChromeSession

MAX_SAFE_SEED = "9007199254740991"
U64_MAX = "18446744073709551615"

WAIT_HELPER = r"""
const wait = (test, action, label) => new Promise((resolve, reject) => {
  const observer = new MutationObserver(check);
  const timeout = setTimeout(() => finish(new Error(`${label} timeout`)), 30000);
  function finish(error) {
    clearTimeout(timeout);
    observer.disconnect();
    error ? reject(error) : requestAnimationFrame(() => requestAnimationFrame(resolve));
  }
  function check() {
    try {
      if (test()) finish();
    } catch (error) {
      finish(error);
    }
  }
  observer.observe(document.documentElement, {
    subtree: true,
    childList: true,
    attributes: true,
    characterData: true,
  });
  action();
  check();
});
const set = (selector, value, event = 'input') => {
  const element = document.querySelector(selector);
  element.value = value;
  element.dispatchEvent(new Event(event, {bubbles: true}));
};
"""

LARGE_SEED_PROBE = (
    r"""(async () => {
"""
    + WAIT_HELPER
    + rf"""
set('#prompt', 'cat');
set('#max-new-tokens', '1');
set('#seed', '{U64_MAX}');
const generate = document.querySelector('[data-testid="generate"]');
await wait(
  () => ['complete', 'error'].includes(document.querySelector('#status')?.dataset.status),
  () => generate.click(),
  'large seed terminal state',
);
return {{
  seed: document.querySelector('#seed').value,
  status: document.querySelector('#status').dataset.status,
  disabled: generate.disabled,
  busy: generate.getAttribute('aria-busy'),
  error: document.querySelector('[data-testid="generation-error"]')?.textContent ?? '',
  reason: document.querySelector('[data-testid="generation-usage"]')?.dataset.stopReason ?? '',
  generated: document.querySelectorAll('.generated-token').length,
}};
}})()"""
)

POST_FAILURE_PROBE = (
    r"""(async () => {
"""
    + WAIT_HELPER
    + r"""
set('#prompt', 'cat');
set('#max-new-tokens', '1');
set('#seed', '42');
const generate = document.querySelector('[data-testid="generate"]');
const originalPostMessage = Worker.prototype.postMessage;
Worker.prototype.postMessage = function () {
  throw new Error('POST_SENTINEL');
};
try {
  await wait(
    () => document.querySelector('#status')?.dataset.status === 'error',
    () => generate.click(),
    'forced post failure',
  );
  return {
    status: document.querySelector('#status').dataset.status,
    disabled: generate.disabled,
    busy: generate.getAttribute('aria-busy'),
    error: document.querySelector('[data-testid="generation-error"]')?.textContent ?? '',
  };
} finally {
  Worker.prototype.postMessage = originalPostMessage;
}
})()"""
)


class QuietHandler(SimpleHTTPRequestHandler):
    def end_headers(self) -> None:
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def log_message(self, format: str, *args: object) -> None:
        return


def browser_probe(origin: str, source: str) -> dict[str, Any]:
    with ChromeSession() as browser:
        browser.navigate(origin)
        browser.require_cdp().evaluate(browser.page_session, READY_PROBE, True)
        result = browser.require_cdp().evaluate(browser.page_session, source, True)
    if not isinstance(result, dict):
        raise AssertionError(f"transport probe returned non-object: {result!r}")
    return result


def assert_large_seed(result: dict[str, Any]) -> None:
    expected = {
        "seed": MAX_SAFE_SEED,
        "status": "complete",
        "disabled": False,
        "busy": "false",
        "reason": "max_new_tokens",
        "generated": 1,
    }
    observed = {key: result.get(key) for key in expected}
    if observed != expected or result.get("error"):
        raise AssertionError(
            f"large seed must clamp and complete without wedging: {result}"
        )


def assert_post_failure(result: dict[str, Any]) -> None:
    if (
        result.get("status") != "error"
        or result.get("disabled") is not False
        or result.get("busy") != "false"
        or "POST_SENTINEL" not in str(result.get("error"))
    ):
        raise AssertionError(
            f"local post failure must release pending generation: {result}"
        )


def run(root: Path, selected: str) -> None:
    handler = partial(QuietHandler, directory=str(root))
    server = ThreadingHTTPServer(("127.0.0.1", 0), handler)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    origin = f"http://127.0.0.1:{server.server_port}/"
    results: dict[str, dict[str, Any]] = {}
    try:
        if selected in ("all", "large-seed"):
            results["largeSeed"] = browser_probe(origin, LARGE_SEED_PROBE)
            assert_large_seed(results["largeSeed"])
        if selected in ("all", "post-failure"):
            results["postFailure"] = browser_probe(origin, POST_FAILURE_PROBE)
            assert_post_failure(results["postFailure"])
    finally:
        server.shutdown()
        server.server_close()
        thread.join(timeout=10)
    print(json.dumps(results, indent=2, sort_keys=True))
    print("Generation transport regressions: PASS")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--root", type=Path, required=True)
    parser.add_argument(
        "--case",
        choices=("all", "large-seed", "post-failure"),
        default="all",
    )
    args = parser.parse_args()
    run(args.root.resolve(), args.case)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
