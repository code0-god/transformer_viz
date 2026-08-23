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
from browser_worker_startup import verify_startup_layout, verify_worker_loader_failure


def worker_probe(loader: str, base: str) -> str:
    return f"""new Promise((resolve, reject) => {{
      const worker = new Worker({json.dumps(loader)}, {{type: 'module'}});
      const manifest = new URL(
        {json.dumps(f"{base}models/edu/manifest.json")},
        location.origin,
      ).href;
      let initialized = false;
      const timeout = setTimeout(() => reject('Worker integrity timeout'), 15000);
      worker.onmessage = event => {{
        if (!initialized && event.data.type === 'initializing') {{
          initialized = true;
          worker.postMessage({{type: 'initialize', manifest_url: manifest}});
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
            deployment = root / base.strip("/") if base != "/" else root
            loaders = list((deployment / "assets").glob("worker-entry-*.js"))
            if len(loaders) != 1:
                raise IntegrityError(
                    f"{base} expected one Vite Worker entry, found {loaders}"
                )
            loader = f"{base}assets/{loaders[0].name}"
            AssetHandler.base = base
            AssetHandler.worker_loader_path = loader
            verify_startup_layout(origin, base)
            verify_worker_loader_failure(origin, base, loader)
            with ChromeSession() as browser:
                cdp = browser.require_cdp()
                cdp.send(
                    "Network.setCacheDisabled",
                    {"cacheDisabled": True},
                    browser.page_session,
                )
                AssetHandler.mode = IntegrityMode.NORMAL
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
                        worker_probe(loader, base),
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
