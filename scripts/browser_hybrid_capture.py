"""Screenshot and network evidence for hybrid browser QA."""

from __future__ import annotations

import base64
import hashlib
from pathlib import Path

from browser_session import ChromeSession


def _screenshot_content(browser: ChromeSession) -> bytes:
    payload = browser.require_cdp().send(
        "Page.captureScreenshot",
        {
            "format": "png",
            "captureBeyondViewport": False,
            "fromSurface": True,
        },
        browser.page_session,
    )
    return base64.b64decode(str(payload["data"]))


def capture(browser: ChromeSession, path: Path) -> str:
    content = _screenshot_content(browser)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(content)
    return hashlib.sha256(content).hexdigest()


def screenshot_hash(browser: ChromeSession) -> str:
    return hashlib.sha256(_screenshot_content(browser)).hexdigest()


def request_urls(browser: ChromeSession) -> list[str]:
    urls: list[str] = []
    for event in browser.require_cdp().events:
        if event.get("method") != "Network.requestWillBeSent":
            continue
        params = event.get("params", {})
        request = params.get("request", {})
        url = request.get("url")
        if isinstance(url, str):
            urls.append(url)
    return urls
