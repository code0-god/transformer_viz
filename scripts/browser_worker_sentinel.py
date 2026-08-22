#!/usr/bin/env python3
"""Focused negative test proving dedicated-Worker failures fail the verifier."""

from __future__ import annotations

import subprocess
import sys
import threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import ClassVar

INDEX = b"""<!doctype html><meta charset=utf-8>
<span id=status data-status=loading>loading</span>
<script>
const worker = new Worker('./worker.js');
worker.onmessage = () => {
  const status = document.querySelector('#status');
  status.dataset.status = 'ready';
  status.textContent = 'ready';
};
</script>"""
WORKER = b"""console.error('WORKER_CONSOLE_SENTINEL');
fetch('./missing-worker-sentinel').then(response => postMessage(response.status));"""


class SentinelHandler(BaseHTTPRequestHandler):
    files: ClassVar[dict[str, tuple[int, str, bytes]]] = {
        "/": (200, "text/html", INDEX),
        "/worker.js": (200, "text/javascript", WORKER),
        "/missing-worker-sentinel": (404, "text/plain", b"WORKER_HTTP_SENTINEL"),
    }

    def do_GET(self) -> None:
        status, content_type, body = self.files.get(
            self.path, (404, "text/plain", b"not found")
        )
        self.send_response(status)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, format: str, *args: object) -> None:
        return


def main() -> int:
    server = ThreadingHTTPServer(("127.0.0.1", 0), SentinelHandler)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    url = f"http://127.0.0.1:{server.server_port}/"
    verifier = Path(__file__).with_name("browser_responsive.py")
    try:
        result = subprocess.run(
            [sys.executable, str(verifier), "--url", url, "--worker-sentinel"],
            capture_output=True,
            text=True,
            timeout=60,
            check=False,
        )
    finally:
        server.shutdown()
        server.server_close()
        thread.join(timeout=10)
    output = result.stdout + result.stderr
    print(output, end="")
    expected = (
        result.returncode == 1
        and "WORKER_CONSOLE_SENTINEL" in output
        and "HTTP 404" in output
        and "missing-worker-sentinel" in output
    )
    if not expected:
        print(
            f"sentinel self-test failed to prove both Worker failures; exit={result.returncode}"
        )
        return 1
    print("Dedicated Worker sentinel negative test: PASS")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
