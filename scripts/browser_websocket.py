"""Minimal strict RFC 6455 client transport for local Chrome DevTools."""

from __future__ import annotations

import base64
import hashlib
import json
import os
import socket
import struct
from typing import Any
from urllib.parse import ParseResult


class WebSocketError(RuntimeError):
    """A WebSocket transport or protocol failure."""


def websocket_request_target(parsed: ParseResult) -> str:
    path = parsed.path or "/"
    return f"{path}?{parsed.query}" if parsed.query else path


def validate_close_payload(payload: bytes) -> None:
    if not payload:
        return
    if len(payload) == 1:
        raise WebSocketError("invalid WebSocket close payload")
    code = struct.unpack("!H", payload[:2])[0]
    valid = 1000 <= code <= 1014 and code not in (1004, 1005, 1006)
    if not valid and not 3000 <= code <= 4999:
        raise WebSocketError(f"invalid WebSocket close status {code}")
    try:
        payload[2:].decode("utf-8")
    except UnicodeDecodeError as error:
        raise WebSocketError("invalid UTF-8 WebSocket close reason") from error


class WebSocket:
    def __init__(
        self, host: str, port: int, target: str, authority: str, timeout: float
    ) -> None:
        self.sock = socket.create_connection((host, port), timeout=timeout)
        self.sock.settimeout(timeout)
        self.closed = False
        self.fragment_opcode: int | None = None
        self.fragments = bytearray()
        self.receive_buffer = bytearray()
        handshaken = False
        try:
            self._handshake(target, authority)
            handshaken = True
        finally:
            if not handshaken:
                self.closed = True
                self.sock.close()

    def _handshake(self, target: str, authority: str) -> None:
        key = base64.b64encode(os.urandom(16)).decode("ascii")
        request = (
            f"GET {target} HTTP/1.1\r\nHost: {authority}\r\nUpgrade: websocket\r\n"
            f"Connection: Upgrade\r\nSec-WebSocket-Key: {key}\r\n"
            "Sec-WebSocket-Version: 13\r\n\r\n"
        )
        self.sock.sendall(request.encode("ascii"))
        response = bytearray()
        while b"\r\n\r\n" not in response:
            chunk = self.sock.recv(4096)
            if not chunk:
                raise WebSocketError("EOF during WebSocket handshake")
            response.extend(chunk)
            if len(response) > 65536:
                raise WebSocketError("oversized WebSocket handshake")
        head, remainder = bytes(response).split(b"\r\n\r\n", 1)
        self.receive_buffer.extend(remainder)
        lines = head.decode("latin-1").split("\r\n")
        if not lines[0].startswith("HTTP/1.1 101 "):
            raise WebSocketError(f"WebSocket upgrade failed: {lines[0]}")
        headers = self._headers(lines[1:])
        connection = {
            token.strip().lower() for token in headers.get("connection", "").split(",")
        }
        expected = base64.b64encode(
            hashlib.sha1(
                (key + "258EAFA5-E914-47DA-95CA-C5AB0DC85B11").encode()
            ).digest()
        ).decode("ascii")
        if (
            headers.get("upgrade", "").lower() != "websocket"
            or "upgrade" not in connection
        ):
            raise WebSocketError("invalid WebSocket upgrade headers")
        if headers.get("sec-websocket-accept") != expected:
            raise WebSocketError("invalid Sec-WebSocket-Accept")

    @staticmethod
    def _headers(lines: list[str]) -> dict[str, str]:
        headers: dict[str, str] = {}
        for line in lines:
            name, separator, value = line.partition(":")
            if not separator:
                raise WebSocketError(f"malformed WebSocket header: {line}")
            headers[name.lower()] = value.strip()
        return headers

    def close(self) -> None:
        if self.closed:
            return
        try:
            self.send_frame(0x8, struct.pack("!H", 1000))
        except (OSError, WebSocketError):
            pass
        finally:
            self.closed = True
            self.sock.close()

    def _recv_exact(self, length: int) -> bytes:
        data = bytearray()
        if self.receive_buffer:
            buffered = min(length, len(self.receive_buffer))
            data.extend(self.receive_buffer[:buffered])
            del self.receive_buffer[:buffered]
        while len(data) < length:
            chunk = self.sock.recv(length - len(data))
            if not chunk:
                raise WebSocketError("unexpected EOF in WebSocket frame")
            data.extend(chunk)
        return bytes(data)

    def send_frame(self, opcode: int, payload: bytes) -> None:
        if self.closed:
            raise WebSocketError("WebSocket is closed")
        length = len(payload)
        header = bytearray([0x80 | opcode])
        if length < 126:
            header.append(0x80 | length)
        elif length <= 0xFFFF:
            header.append(0x80 | 126)
            header.extend(struct.pack("!H", length))
        else:
            if length >= 1 << 63:
                raise WebSocketError("WebSocket payload exceeds RFC 6455 limit")
            header.append(0x80 | 127)
            header.extend(struct.pack("!Q", length))
        mask = os.urandom(4)
        encoded = bytes(value ^ mask[index % 4] for index, value in enumerate(payload))
        self.sock.sendall(bytes(header) + mask + encoded)

    def recv_frame(self) -> tuple[bool, int, bytes]:
        first, second = self._recv_exact(2)
        if first & 0x70:
            raise WebSocketError("WebSocket frame uses unsupported RSV bits")
        final = bool(first & 0x80)
        opcode = first & 0x0F
        if second & 0x80:
            raise WebSocketError("server WebSocket frames must not be masked")
        length = second & 0x7F
        if length == 126:
            length = struct.unpack("!H", self._recv_exact(2))[0]
            if length < 126:
                raise WebSocketError("non-minimal 16-bit WebSocket payload length")
        elif length == 127:
            encoded = self._recv_exact(8)
            if encoded[0] & 0x80:
                raise WebSocketError("invalid 64-bit WebSocket payload length")
            length = struct.unpack("!Q", encoded)[0]
            if length <= 0xFFFF:
                raise WebSocketError("non-minimal 64-bit WebSocket payload length")
        if opcode >= 0x8 and (not final or length > 125):
            raise WebSocketError("invalid WebSocket control frame")
        return final, opcode, self._recv_exact(length)

    def recv_message(self) -> dict[str, Any]:
        while True:
            final, opcode, payload = self.recv_frame()
            if opcode == 0x8:
                validate_close_payload(payload)
                if not self.closed:
                    self.send_frame(0x8, payload)
                self.closed = True
                raise WebSocketError("Chrome closed the DevTools connection")
            if opcode == 0x9:
                self.send_frame(0xA, payload)
                continue
            if opcode == 0xA:
                continue
            complete = self._data_frame(final, opcode, payload)
            if complete is None:
                continue
            try:
                value = json.loads(complete.decode("utf-8"))
            except (UnicodeDecodeError, json.JSONDecodeError) as error:
                raise WebSocketError(f"invalid DevTools JSON: {error}") from error
            if not isinstance(value, dict):
                raise WebSocketError("DevTools message is not an object")
            return value

    def _data_frame(self, final: bool, opcode: int, payload: bytes) -> bytes | None:
        if opcode == 0x0:
            if self.fragment_opcode is None:
                raise WebSocketError("unexpected WebSocket continuation frame")
            self.fragments.extend(payload)
            if not final:
                return None
            opcode, payload = self.fragment_opcode, bytes(self.fragments)
            self.fragment_opcode = None
            self.fragments.clear()
        elif opcode in (0x1, 0x2):
            if self.fragment_opcode is not None:
                raise WebSocketError("new WebSocket message during fragmentation")
            if not final:
                self.fragment_opcode = opcode
                self.fragments.extend(payload)
                return None
        else:
            raise WebSocketError(f"unsupported WebSocket opcode {opcode}")
        if opcode != 0x1:
            raise WebSocketError("DevTools sent a non-text WebSocket message")
        return payload
