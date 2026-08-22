#!/usr/bin/env python3
# /// script
# requires-python = ">=3.12"
# dependencies = []
# ///
# ─── How to run ───
# uv run scripts/browser_worker_integrity.py --root /tmp/root-and-subpath-dist
"""Real-Chrome compiled-Worker redirect and bounded-response integrity sentinels."""

from __future__ import annotations

import argparse
import json
import threading
from functools import partial
from http.server import ThreadingHTTPServer
from pathlib import Path

from browser_probes import READY_PROBE
from browser_session import ChromeSession
from browser_worker_integrity_server import (
    AssetHandler,
    ExternalHandler,
    IntegrityError,
    IntegrityMode,
)

STARTUP_READY_PROBE = r"""new Promise((resolve, reject) => {
  const timeout = setTimeout(() => finish('startup shell timeout'), 10000);
  const finish = error => {
    clearTimeout(timeout);
    removeEventListener('load', check);
    error ? reject(error) : requestAnimationFrame(() => requestAnimationFrame(resolve));
  };
  const check = () => {
    if (document.readyState === 'complete' &&
        document.querySelector('.startup-shell__surface h2') &&
        document.querySelector('.startup-shell__path ol')) finish();
  };
  addEventListener('load', check);
  check();
})"""

STARTUP_LAYOUT_PROBE = r"""(() => {
  const heading = document.querySelector('.startup-shell__surface h2');
  const textNode = heading?.firstChild;
  const text = textNode?.textContent?.trim() ?? '';
  const lastWord = text.split(/\s+/).at(-1) ?? '';
  const range = document.createRange();
  if (textNode && lastWord) {
    const start = textNode.textContent.lastIndexOf(lastWord);
    range.setStart(textNode, start);
    range.setEnd(textNode, start + lastWord.length);
  }
  const wordLines = new Set(
    [...range.getClientRects()].filter(rect => rect.width && rect.height)
      .map(rect => Math.round(rect.top))
  ).size;
  const items = [...document.querySelectorAll('.startup-shell__path li')]
    .map(element => element.getBoundingClientRect());
  return {
    startup: Boolean(document.querySelector('#startup-shell')),
    docWidth: document.documentElement.scrollWidth,
    viewportWidth: innerWidth,
    lastWordLines: wordLines,
    pathItems: items.length,
    pathVertical: items.every((item, index) =>
      index === 0 || item.top >= items[index - 1].bottom + 1),
  };
})()"""


def worker_probe(loader: str) -> str:
    return f"""new Promise((resolve, reject) => {{
      const worker = new Worker({json.dumps(loader)}, {{type: 'module'}});
      let initialized = false;
      const timeout = setTimeout(() => reject('Worker integrity timeout'), 15000);
      worker.onmessage = event => {{
        if (!initialized && event.data.type === 'initializing') {{
          initialized = true;
          worker.postMessage({{type: 'initialize', manifest_url: './models/edu/manifest.json'}});
        }} else if (event.data.type === 'error') {{
          clearTimeout(timeout);
          worker.terminate();
          resolve(event.data);
        }} else if (event.data.type === 'ready') {{
          clearTimeout(timeout);
          worker.terminate();
          reject(`unexpected Worker ready for integrity rejection: ${{JSON.stringify(event.data)}}`);
        }}
      }};
      worker.onerror = event => reject(event.message);
    }})"""


def verify_startup_layout(origin: str, base: str) -> None:
    with ChromeSession() as browser:
        cdp = browser.require_cdp()
        session = browser.page_session
        cdp.send(
            "Emulation.setDeviceMetricsOverride",
            {
                "width": 390,
                "height": 844,
                "deviceScaleFactor": 1,
                "mobile": False,
            },
            session,
        )
        cdp.send(
            "Network.setBlockedURLs",
            {"urls": ["*.js", "*.wasm"]},
            session,
        )
        browser.navigate(origin + base)
        cdp.evaluate(session, STARTUP_READY_PROBE, True)
        state = cdp.evaluate(session, STARTUP_LAYOUT_PROBE)
        if (
            not state.get("startup")
            or state.get("docWidth", 391) > state.get("viewportWidth", 390)
            or state.get("lastWordLines") != 1
            or state.get("pathItems") != 3
            or not state.get("pathVertical")
        ):
            raise IntegrityError(f"{base} mobile startup layout failed: {state}")
    print(f"{base} 390x844 startup layout: PASS")


def run(root: Path) -> None:
    external = ThreadingHTTPServer(("127.0.0.1", 0), ExternalHandler)
    main_handler = partial(AssetHandler, directory=str(root))
    main = ThreadingHTTPServer(("127.0.0.1", 0), main_handler)
    AssetHandler.cross_origin = f"http://127.0.0.1:{external.server_port}"
    threads = [
        threading.Thread(target=server.serve_forever, daemon=True)
        for server in (main, external)
    ]
    for thread in threads:
        thread.start()
    origin = f"http://127.0.0.1:{main.server_port}"
    try:
        for base in ("/", "/transformer_viz/"):
            verify_startup_layout(origin, base)
            with ChromeSession() as browser:
                cdp = browser.require_cdp()
                cdp.send(
                    "Network.setCacheDisabled",
                    {"cacheDisabled": True},
                    browser.page_session,
                )
                AssetHandler.mode = IntegrityMode.NORMAL
                AssetHandler.base = base
                browser.navigate(origin + base)
                cdp.evaluate(browser.page_session, READY_PROBE, True)
                print(f"{base} canonical initialization: PASS")
                redirect_modes = (
                    IntegrityMode.SAME_ORIGIN,
                    IntegrityMode.CROSS_ORIGIN,
                    IntegrityMode.EXTERNAL_CHAIN,
                )
                bounded_modes = (
                    IntegrityMode.CHUNKED,
                    IntegrityMode.MISSING_LENGTH,
                    IntegrityMode.FALSE_LENGTH,
                    IntegrityMode.OVERSIZED,
                )
                for mode in (*redirect_modes, *bounded_modes):
                    AssetHandler.mode = mode
                    AssetHandler.targets["outside"] = 0
                    ExternalHandler.requests = 0
                    result = cdp.evaluate(
                        browser.page_session,
                        worker_probe(f"{base}worker_loader.js"),
                        True,
                    )
                    if result.get("code") != "asset_unavailable":
                        raise IntegrityError(f"{base} {mode} was not typed: {result}")
                    expected_message = {
                        IntegrityMode.CHUNKED: "asset response has no Content-Length",
                        IntegrityMode.MISSING_LENGTH: "asset response has no Content-Length",
                        IntegrityMode.FALSE_LENGTH: "network error",
                        IntegrityMode.OVERSIZED: "asset stream exceeds fixed bounds",
                    }.get(mode)
                    if expected_message and expected_message not in result.get(
                        "message", ""
                    ):
                        raise IntegrityError(
                            f"{base} {mode} returned the wrong failure class: {result}"
                        )
                    if mode in redirect_modes and (
                        AssetHandler.targets["outside"] or ExternalHandler.requests
                    ):
                        raise IntegrityError(
                            f"{base} {mode} followed forbidden redirect: "
                            f"outside={AssetHandler.targets['outside']} "
                            f"external={ExternalHandler.requests}"
                        )
                    suffix = ", zero target requests" if mode in redirect_modes else ""
                    print(f"{base} {mode}: PASS typed rejection{suffix}")
    finally:
        for server in (main, external):
            server.shutdown()
            server.server_close()
        for thread in threads:
            thread.join(timeout=10)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--root", type=Path, required=True)
    args = parser.parse_args()
    run(args.root.resolve())
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
