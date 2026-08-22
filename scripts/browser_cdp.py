"""Reentrant flattened-session Chrome DevTools client."""

from __future__ import annotations

import json
from collections.abc import Callable
from typing import Any
from urllib.parse import urlparse

from browser_websocket import WebSocket, WebSocketError, websocket_request_target

CdpError = WebSocketError


class Cdp:
    def __init__(self, websocket_url: str, timeout: float = 30.0) -> None:
        parsed = urlparse(websocket_url)
        if (
            parsed.scheme not in ("ws", "wss")
            or parsed.hostname is None
            or parsed.port is None
        ):
            raise CdpError(f"invalid DevTools WebSocket URL: {websocket_url}")
        if parsed.scheme == "wss":
            raise CdpError("the local Chrome endpoint must use ws")
        self.websocket = WebSocket(
            parsed.hostname,
            parsed.port,
            websocket_request_target(parsed),
            parsed.netloc,
            timeout,
        )
        self.events: list[dict[str, Any]] = []
        self.responses: dict[int, dict[str, Any]] = {}
        self.next_id = 0
        self.on_event: Callable[[dict[str, Any]], None] | None = None

    def close(self) -> None:
        self.websocket.close()

    def send(
        self,
        method: str,
        params: dict[str, Any] | None = None,
        session_id: str | None = None,
    ) -> dict[str, Any]:
        self.next_id += 1
        command_id = self.next_id
        command: dict[str, Any] = {
            "id": command_id,
            "method": method,
            "params": params or {},
        }
        if session_id is not None:
            command["sessionId"] = session_id
        payload = json.dumps(command, separators=(",", ":")).encode()
        self.websocket.send_frame(0x1, payload)
        while command_id not in self.responses:
            self._route_message(self.websocket.recv_message())
        response = self.responses.pop(command_id)
        if "error" in response:
            raise CdpError(f"CDP {method}: {response['error']}")
        result = response.get("result", {})
        if not isinstance(result, dict):
            raise CdpError(f"CDP {method} returned a non-object result")
        return result

    def _route_message(self, message: dict[str, Any]) -> None:
        message_id = message.get("id")
        if isinstance(message_id, int):
            self.responses[message_id] = message
            return
        self.events.append(message)
        if self.on_event is not None:
            self.on_event(message)

    def evaluate(
        self, session_id: str, expression: str, await_promise: bool = False
    ) -> Any:
        result = self.send(
            "Runtime.evaluate",
            {
                "expression": expression,
                "returnByValue": True,
                "awaitPromise": await_promise,
            },
            session_id,
        )
        if "exceptionDetails" in result:
            raise CdpError(f"Runtime.evaluate: {result['exceptionDetails']}")
        return result.get("result", {}).get("value")
