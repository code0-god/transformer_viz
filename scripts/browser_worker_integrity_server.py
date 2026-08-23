# /// script
# requires-python = ">=3.12"
# dependencies = []
# ///
# ─── How to run ───
# Imported by scripts/browser_worker_integrity.py.
"""HTTP response variants for Worker integrity probes."""

from __future__ import annotations

import gzip
from dataclasses import dataclass
from enum import StrEnum
from http.server import SimpleHTTPRequestHandler
from pathlib import Path
from socketserver import BaseServer
from typing import ClassVar, Protocol, assert_never, runtime_checkable


class IntegrityMode(StrEnum):
    """Worker integrity server response variants."""

    NORMAL = "normal"
    SAME_ORIGIN = "same_origin"
    CROSS_ORIGIN = "cross_origin"
    EXTERNAL_CHAIN = "external_chain"
    CHUNKED = "chunked"
    MISSING_LENGTH = "missing_length"
    FALSE_LENGTH = "false_length"
    OVERSIZED = "oversized"


@dataclass(frozen=True, slots=True)
class IntegrityError(RuntimeError):
    """Report a failed Worker integrity invariant."""

    detail: str

    def __str__(self) -> str:
        return self.detail


class LogValue(Protocol):
    """Value accepted by the standard HTTP request logger."""

    def __str__(self) -> str:
        """Render the value for percent-style request logging."""
        ...


@runtime_checkable
class PortServer(Protocol):
    """Server interface exposed by TCP-based HTTP servers."""

    @property
    def server_port(self) -> int:
        """Return the bound TCP port."""
        ...


def bound_port(server: BaseServer) -> int:
    """Narrow a request handler's generic server to its TCP port contract."""
    if not isinstance(server, PortServer):
        raise IntegrityError("HTTP request server does not expose a bound TCP port")
    return server.server_port


class AssetHandler(SimpleHTTPRequestHandler):
    protocol_version = "HTTP/1.1"
    mode: ClassVar[IntegrityMode] = IntegrityMode.NORMAL
    base: ClassVar[str] = "/"
    cross_origin: ClassVar[str] = ""
    targets: ClassVar[dict[str, int]] = {"outside": 0}
    block_worker_loader: ClassVar[bool] = False
    worker_loader_path: ClassVar[str] = ""

    def do_GET(self) -> None:
        if self.block_worker_loader and self.path == self.worker_loader_path:
            self.send_response(404)
            self.send_header("Content-Length", "0")
            self.end_headers()
            return
        manifest = f"{self.base}models/edu/manifest.json"
        if self.path == manifest:
            match self.mode:
                case IntegrityMode.NORMAL:
                    pass
                case (
                    IntegrityMode.SAME_ORIGIN
                    | IntegrityMode.CROSS_ORIGIN
                    | IntegrityMode.EXTERNAL_CHAIN
                ):
                    self.redirect_manifest(manifest)
                    return
                case (
                    IntegrityMode.CHUNKED
                    | IntegrityMode.MISSING_LENGTH
                    | IntegrityMode.FALSE_LENGTH
                    | IntegrityMode.OVERSIZED
                ):
                    self.bounded_manifest(manifest)
                    return
                case unreachable:
                    assert_never(unreachable)
        if self.path == f"{self.base}outside/manifest.json":
            self.targets["outside"] += 1
        super().do_GET()

    def redirect_manifest(self, manifest: str) -> None:
        match self.mode:
            case IntegrityMode.SAME_ORIGIN:
                location = f"{self.base}outside/manifest.json"
            case IntegrityMode.CROSS_ORIGIN:
                location = f"{self.cross_origin}/forbidden"
            case IntegrityMode.EXTERNAL_CHAIN:
                canonical = f"http://127.0.0.1:{bound_port(self.server)}{manifest}"
                location = f"{self.cross_origin}/intermediate?return={canonical}"
            case (
                IntegrityMode.NORMAL
                | IntegrityMode.CHUNKED
                | IntegrityMode.MISSING_LENGTH
                | IntegrityMode.FALSE_LENGTH
                | IntegrityMode.OVERSIZED
            ):
                raise IntegrityError(f"invalid redirect mode: {self.mode}")
            case unreachable:
                assert_never(unreachable)
        self.send_response(302)
        self.send_header("Location", location)
        self.send_header("Content-Length", "0")
        self.end_headers()

    def bounded_manifest(self, manifest: str) -> None:
        canonical = (Path(self.directory) / manifest.lstrip("/")).read_bytes()
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        match self.mode:
            case IntegrityMode.CHUNKED:
                self.send_header("Transfer-Encoding", "chunked")
                self.end_headers()
                for chunk in (canonical[:100], canonical[100:]):
                    self.wfile.write(f"{len(chunk):x}\r\n".encode() + chunk + b"\r\n")
                self.wfile.write(b"0\r\n\r\n")
            case IntegrityMode.MISSING_LENGTH:
                self.send_header("Connection", "close")
                self.end_headers()
                self.wfile.write(canonical)
                self.close_connection = True
            case IntegrityMode.FALSE_LENGTH:
                self.send_header("Content-Length", str(len(canonical) + 10))
                self.send_header("Connection", "close")
                self.end_headers()
                self.wfile.write(canonical)
                self.close_connection = True
            case IntegrityMode.OVERSIZED:
                compressed = gzip.compress(b"x" * 17_000)
                self.send_header("Content-Encoding", "gzip")
                self.send_header("Content-Length", str(len(compressed)))
                self.end_headers()
                self.wfile.write(compressed)
            case (
                IntegrityMode.NORMAL
                | IntegrityMode.SAME_ORIGIN
                | IntegrityMode.CROSS_ORIGIN
                | IntegrityMode.EXTERNAL_CHAIN
            ):
                raise IntegrityError(f"invalid bounded-response mode: {self.mode}")
            case unreachable:
                assert_never(unreachable)

    def end_headers(self) -> None:
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def log_message(self, format: str, *args: LogValue) -> None:
        return


class ExternalHandler(SimpleHTTPRequestHandler):
    requests: ClassVar[int] = 0

    def do_GET(self) -> None:
        type(self).requests += 1
        if self.path.startswith("/intermediate?return="):
            self.send_response(302)
            self.send_header("Location", self.path.split("=", 1)[1])
            self.send_header("Content-Length", "0")
            self.end_headers()
            return
        self.send_response(200)
        self.send_header("Content-Length", "1")
        self.end_headers()
        self.wfile.write(b"x")

    def end_headers(self) -> None:
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def log_message(self, format: str, *args: LogValue) -> None:
        return
