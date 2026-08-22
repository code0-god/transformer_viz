"""Session-aware Chrome Runtime and Network telemetry."""

from __future__ import annotations

import json
from dataclasses import dataclass, field
from typing import Any
from urllib.parse import SplitResult, urlsplit


@dataclass(frozen=True)
class RequestRecord:
    url: str
    session_id: str


@dataclass
class BrowserTelemetry:
    errors: list[str] = field(default_factory=list)
    requests: list[RequestRecord] = field(default_factory=list)
    active_requests: dict[str, RequestRecord] = field(default_factory=dict)
    cursor: int = 0

    @staticmethod
    def request_key(event: dict[str, Any], request_id: str) -> str:
        return f"{event.get('sessionId', 'browser')}:{request_id}"

    def consume(self, events: list[dict[str, Any]]) -> None:
        for event in events[self.cursor :]:
            self._consume_event(event)
        self.cursor = len(events)

    def _consume_event(self, event: dict[str, Any]) -> None:
        method = event.get("method")
        params = event.get("params", {})
        session_id = event.get("sessionId", "browser")
        if method == "Network.requestWillBeSent":
            key = self.request_key(event, params["requestId"])
            redirect = params.get("redirectResponse")
            if isinstance(redirect, dict):
                prior_url = redirect.get("url")
                current = self.active_requests.get(key)
                if isinstance(prior_url, str) and (
                    current is None or current.url != prior_url
                ):
                    self.requests.append(RequestRecord(prior_url, session_id))
                self._record_http_error(redirect)
            record = RequestRecord(params["request"]["url"], session_id)
            self.requests.append(record)
            self.active_requests[key] = record
        elif method == "Network.responseReceived":
            self._record_http_error(params["response"])
        elif method == "Network.loadingFailed":
            key = self.request_key(event, params["requestId"])
            record = self.active_requests.get(key)
            url = record.url if record else key
            self.errors.append(f"loading failed: {url}: {params.get('errorText')}")
        elif method == "Runtime.consoleAPICalled" and params.get("type") == "error":
            self.errors.append(f"console error: {json.dumps(params.get('args', []))}")
        elif method == "Runtime.exceptionThrown":
            details = json.dumps(params.get("exceptionDetails", {}))
            self.errors.append(f"runtime exception: {details}")

    def _record_http_error(self, response: dict[str, Any]) -> None:
        status = int(response["status"])
        if status < 200 or status >= 400:
            self.errors.append(f"HTTP {status}: {response['url']}")

    def scoped_urls(self) -> list[SplitResult]:
        return [
            urlsplit(record.url)
            for record in self.requests
            if record.url.startswith(("http://", "https://"))
        ]

    def worker_urls(self, worker_sessions: set[str]) -> list[str]:
        return [
            record.url
            for record in self.requests
            if record.session_id in worker_sessions
        ]

    def outside_scope(self, expected_url: str) -> list[str]:
        expected = urlsplit(expected_url)
        base_path = (
            expected.path if expected.path.endswith("/") else f"{expected.path}/"
        )
        return [
            url.geturl()
            for url in self.scoped_urls()
            if (url.scheme, url.netloc) != (expected.scheme, expected.netloc)
            or not url.path.startswith(base_path)
        ]
