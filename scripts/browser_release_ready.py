#!/usr/bin/env python3
"""Verify that one static release artifact reaches Ready through its real Worker."""

from __future__ import annotations

import argparse
import threading
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import unquote, urlsplit

from browser_probes import READY_PROBE
from browser_session import ChromeSession


class ReleaseReadinessError(RuntimeError):
    """The built static release violates a startup-readiness contract."""


class ReleaseHandler(SimpleHTTPRequestHandler):
    """Serve one dist directory at its configured public URL prefix."""

    base = "/"

    def translate_path(self, path: str) -> str:
        requested = unquote(urlsplit(path).path)
        if not requested.startswith(self.base):
            return str(Path(self.directory) / "__outside_public_url__")
        return str(Path(self.directory) / requested.removeprefix(self.base))

    def log_message(self, format: str, *args: object) -> None:
        return


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--root", type=Path, required=True)
    parser.add_argument("--base", required=True)
    args = parser.parse_args()
    if not args.base.startswith("/") or not args.base.endswith("/"):
        parser.error("--base must begin and end with '/'")
    return args


def main() -> int:
    args = parse_args()
    root = args.root.resolve()
    index = root / "index.html"
    if not index.is_file():
        raise FileNotFoundError(f"missing static entry point: {index}")
    source = index.read_text(encoding="utf-8")
    shell_position = source.find('id="startup-shell"')
    bootstrap_position = source.find("<script")
    if shell_position < 0 or bootstrap_position < 0 or shell_position >= bootstrap_position:
        raise ReleaseReadinessError(
            "static startup shell must precede the bootstrap script"
        )

    ReleaseHandler.base = args.base
    handler = partial(ReleaseHandler, directory=str(root))
    server = ThreadingHTTPServer(("127.0.0.1", 0), handler)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    try:
        origin = f"http://127.0.0.1:{server.server_port}"
        with ChromeSession() as browser:
            cdp = browser.require_cdp()
            browser.navigate(origin + args.base)
            cdp.evaluate(browser.page_session, READY_PROBE, True)
            state = cdp.evaluate(
                browser.page_session,
                """(() => ({
                    status: document.querySelector('#status')?.dataset.status,
                    csp: document.querySelector('meta[http-equiv="Content-Security-Policy"]')?.content,
                    referrer: document.querySelector('meta[name="referrer"]')?.content,
                    startupShell: Boolean(document.querySelector('#startup-shell')),
                }))()""",
                True,
            )
            if (
                state.get("status") != "ready"
                or not state.get("csp", "").startswith("default-src 'self'")
                or "'sha256-" not in state["csp"]
                or state.get("referrer") != "strict-origin-when-cross-origin"
                or state.get("startupShell")
                or not browser.app_worker_sessions()
            ):
                raise ReleaseReadinessError(
                    f"release did not initialize its Worker safely: {state}"
                )
        print(f"{args.base} real-Chrome Worker readiness: PASS")
    finally:
        server.shutdown()
        server.server_close()
        thread.join(timeout=10)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
