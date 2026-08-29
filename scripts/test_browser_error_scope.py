"""Unit contract for page-owned browser error collection."""

from __future__ import annotations

import unittest
from typing import Any

from browser_learning_workspace_probes import browser_errors
from browser_session import ChromeSession


class FakeCdp:
    def __init__(self, events: list[dict[str, Any]]) -> None:
        self.events = events


class FakeBrowser:
    page_session = "app-page"

    def __init__(self, events: list[dict[str, Any]]) -> None:
        self.cdp = FakeCdp(events)

    def require_cdp(self) -> FakeCdp:
        return self.cdp

    def app_worker_sessions(self) -> list[str]:
        return ["app-worker"]


class FakeNavigateCdp:
    def __init__(self, *, cross_document: bool = True) -> None:
        self.calls: list[tuple[str, str | None]] = []
        self.cross_document = cross_document

    def send(
        self,
        method: str,
        params: dict[str, Any] | None = None,
        session_id: str | None = None,
    ) -> dict[str, Any]:
        del params
        self.calls.append((method, session_id))
        if method == "Page.navigate" and self.cross_document:
            return {"loaderId": "new-document"}
        return {}

    def wait_for_event(
        self,
        method: str,
        session_id: str | None = None,
    ) -> dict[str, Any]:
        self.calls.append((f"wait:{method}", session_id))
        return {}


class BrowserErrorScopeTests(unittest.TestCase):
    def test_ignores_unrelated_target_failures(self) -> None:
        events = [
            {
                "sessionId": "app-page",
                "method": "Network.requestWillBeSent",
                "params": {
                    "requestId": "app-request",
                    "request": {"url": "http://app.test/missing.js"},
                },
            },
            {
                "sessionId": "app-page",
                "method": "Network.loadingFailed",
                "params": {
                    "requestId": "app-request",
                    "errorText": "net::ERR_FAILED",
                },
            },
            {
                "sessionId": "extension-target",
                "method": "Network.requestWillBeSent",
                "params": {
                    "requestId": "extension-request",
                    "request": {
                        "url": "https://docs.google.com/offline/extension/report"
                    },
                },
            },
            {
                "sessionId": "extension-target",
                "method": "Network.loadingFailed",
                "params": {
                    "requestId": "extension-request",
                    "errorText": "net::ERR_ABORTED",
                },
            },
            {
                "sessionId": "app-worker",
                "method": "Runtime.exceptionThrown",
                "params": {"exceptionDetails": {"text": "worker failed"}},
            },
        ]

        errors = browser_errors(FakeBrowser(events))  # type: ignore[arg-type]

        self.assertEqual(len(errors["network"]), 1)
        self.assertIn("http://app.test/missing.js", errors["network"][0])
        self.assertEqual(len(errors["runtime"]), 1)
        self.assertNotIn("docs.google.com", str(errors))

    def test_navigation_waits_for_document_content(self) -> None:
        session = object.__new__(ChromeSession)
        cdp = FakeNavigateCdp()
        vars(session)["cdp"] = cdp
        session.page_session = "app-page"

        session.navigate("http://app.test/")

        self.assertEqual(
            cdp.calls,
            [
                ("Page.navigate", "app-page"),
                ("wait:Page.domContentEventFired", "app-page"),
                ("Browser.getVersion", None),
            ],
        )

    def test_same_document_navigation_skips_document_event(self) -> None:
        session = object.__new__(ChromeSession)
        cdp = FakeNavigateCdp(cross_document=False)
        vars(session)["cdp"] = cdp
        session.page_session = "app-page"

        session.navigate("http://app.test/#/chapter")

        self.assertEqual(
            cdp.calls,
            [
                ("Page.navigate", "app-page"),
                ("Browser.getVersion", None),
            ],
        )


if __name__ == "__main__":
    unittest.main()
