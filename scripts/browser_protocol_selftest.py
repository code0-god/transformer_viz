#!/usr/bin/env python3
"""Focused negative tests for WebSocket query, close, and framing validation."""

from __future__ import annotations

import socket
import struct
from collections.abc import Callable
from urllib.parse import urlparse

from browser_telemetry import BrowserTelemetry
from browser_websocket import (
    WebSocket,
    WebSocketError,
    validate_close_payload,
    websocket_request_target,
)


def framed_client(frame: bytes) -> WebSocket:
    reader, writer = socket.socketpair()
    writer.close()
    client = WebSocket.__new__(WebSocket)
    client.receive_buffer = bytearray(frame)
    client.sock = reader
    return client


def require_error(action: Callable[[], object], message: str) -> None:
    try:
        action()
    except WebSocketError:
        return
    raise AssertionError(message)


def require_frame_error(frame: bytes, message: str) -> None:
    client = framed_client(frame)
    try:
        require_error(client.recv_frame, message)
    finally:
        client.sock.close()


def main() -> int:
    parsed = urlparse("ws://127.0.0.1:9222/devtools/browser/id?token=a%2Fb&x=1")
    target = websocket_request_target(parsed)
    assert target == "/devtools/browser/id?token=a%2Fb&x=1"
    require_error(
        lambda: validate_close_payload(struct.pack("!H", 1005)),
        "prohibited close code 1005 was accepted",
    )
    require_error(
        lambda: validate_close_payload(struct.pack("!H", 1000) + b"\xff"),
        "invalid close reason UTF-8 was accepted",
    )
    require_frame_error(bytes((0x81, 0x80)), "masked server frame was accepted")
    require_frame_error(
        bytes((0x81, 126, 0, 125)),
        "non-minimal 16-bit frame length was accepted",
    )
    validate_close_payload(struct.pack("!H", 1000) + "정상".encode())
    telemetry = BrowserTelemetry()
    telemetry.consume(
        [
            request_event("http://127.0.0.1:8097/start"),
            request_event(
                "https://evil.example/hop",
                redirect="http://127.0.0.1:8097/start",
            ),
            request_event(
                "http://127.0.0.1:8097/final",
                redirect="https://evil.example/hop",
            ),
        ]
    )
    assert telemetry.outside_scope("http://127.0.0.1:8097/") == [
        "https://evil.example/hop"
    ]
    print("WebSocket and redirect telemetry self-test: PASS")
    return 0


def request_event(url: str, redirect: str | None = None) -> dict[str, object]:
    params: dict[str, object] = {
        "requestId": "redirect-chain",
        "request": {"url": url},
    }
    if redirect is not None:
        params["redirectResponse"] = {"url": redirect, "status": 302}
    return {
        "method": "Network.requestWillBeSent",
        "sessionId": "page",
        "params": params,
    }


if __name__ == "__main__":
    raise SystemExit(main())
