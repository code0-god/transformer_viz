"""Private gzip static server for browser performance acceptance runs."""

from __future__ import annotations

import functools
import gzip
import http.server
import threading
from contextlib import AbstractContextManager
from pathlib import Path
from types import TracebackType
from typing import Protocol, Self


class LogValue(Protocol):
    def __str__(self) -> str: ...


class CompressedStaticServer(AbstractContextManager["CompressedStaticServer"]):
    """Own an ephemeral loopback server with deployment-prefix routing."""

    def __init__(self, root: Path, prefix: str) -> None:
        self.root = root.resolve()
        self.prefix = prefix.rstrip("/")
        owner = self

        class Handler(http.server.SimpleHTTPRequestHandler):
            def translate_path(self, path: str) -> str:
                route = path.split("?", 1)[0].split("#", 1)[0]
                if owner.prefix and route.startswith(f"{owner.prefix}/"):
                    route = route[len(owner.prefix) :]
                return super().translate_path(route)

            def end_headers(self) -> None:
                if self.path.split("?", 1)[0].endswith(".html") or self.path.endswith(
                    "/"
                ):
                    self.send_header("Cache-Control", "no-cache")
                else:
                    self.send_header(
                        "Cache-Control", "public, max-age=31536000, immutable"
                    )
                super().end_headers()

            def send_head(self):
                path = Path(self.translate_path(self.path))
                if path.is_dir():
                    path /= "index.html"
                if not path.is_file() or self.command == "HEAD":
                    return super().send_head()
                accepted = self.headers.get("Accept-Encoding", "")
                if "gzip" not in accepted or path.suffix in {
                    ".png",
                    ".jpg",
                    ".safetensors",
                }:
                    return super().send_head()
                raw = path.read_bytes()
                body = gzip.compress(raw, compresslevel=9, mtime=0)
                self.send_response(200)
                self.send_header("Content-Type", self.guess_type(str(path)))
                self.send_header("Content-Encoding", "gzip")
                self.send_header("Content-Length", str(len(body)))
                self.send_header("Vary", "Accept-Encoding")
                self.end_headers()
                try:
                    self.wfile.write(body)
                except BrokenPipeError:
                    return None
                return None

            def log_message(self, format: str, *args: LogValue) -> None:  # noqa: A002
                """Keep acceptance output machine-readable."""
                return

        handler = functools.partial(Handler, directory=str(self.root))
        self.httpd = http.server.ThreadingHTTPServer(("127.0.0.1", 0), handler)
        self.thread = threading.Thread(target=self.httpd.serve_forever, daemon=True)

    @property
    def url(self) -> str:
        suffix = f"{self.prefix}/" if self.prefix else "/"
        return f"http://127.0.0.1:{self.httpd.server_port}{suffix}"

    def __enter__(self) -> Self:
        self.thread.start()
        return self

    def __exit__(
        self,
        error_type: type[BaseException] | None,
        error: BaseException | None,
        traceback: TracebackType | None,
    ) -> None:
        self.httpd.shutdown()
        self.httpd.server_close()
        self.thread.join()
