"""Chrome process ownership and flattened-target setup for the verifier."""

from __future__ import annotations

import re
import selectors
import shutil
import subprocess
import tempfile
import time
from pathlib import Path
from types import TracebackType
from typing import Any, Self

from browser_cdp import Cdp, CdpError

CHROME = Path("/Applications/Google Chrome.app/Contents/MacOS/Google Chrome")
_ENDPOINT = re.compile(r"DevTools listening on (ws://\S+)")


class ChromeSession:
    """Own one Chrome process, profile, CDP socket, page, and attached Workers."""

    def __init__(self, timeout: float = 30.0) -> None:
        if not CHROME.exists():
            raise CdpError(f"Chrome not found at {CHROME}")
        self.timeout = timeout
        self.profile = Path(tempfile.mkdtemp(prefix="transformer-viz-phase9-chrome-"))
        self.process: subprocess.Popen[str] | None = None
        self.cdp: Cdp | None = None
        self.page_session = ""
        self.target_id = ""
        self.enabled_sessions: set[str] = set()
        self.configuring_sessions: set[str] = set()
        self.session_targets: dict[str, dict[str, Any]] = {}
        self.target_sessions: dict[str, str] = {}

    def __enter__(self) -> Self:
        opened = False
        try:
            self.process = subprocess.Popen(
                [
                    str(CHROME),
                    "--headless=new",
                    "--disable-gpu",
                    "--no-first-run",
                    "--no-default-browser-check",
                    "--remote-debugging-port=0",
                    f"--user-data-dir={self.profile}",
                    "about:blank",
                ],
                stdout=subprocess.DEVNULL,
                stderr=subprocess.PIPE,
                text=True,
                bufsize=1,
            )
            endpoint = self._read_endpoint()
            self.cdp = Cdp(endpoint, self.timeout)
            self.cdp.on_event = self._handle_event
            self._create_page()
            opened = True
            return self
        finally:
            if not opened:
                self.close()

    def __exit__(
        self,
        error_type: type[BaseException] | None,
        error: BaseException | None,
        traceback: TracebackType | None,
    ) -> None:
        self.close()

    def _read_endpoint(self) -> str:
        assert self.process is not None and self.process.stderr is not None
        selector = selectors.DefaultSelector()
        selector.register(self.process.stderr, selectors.EVENT_READ)
        deadline = time.monotonic() + self.timeout
        diagnostics: list[str] = []
        try:
            while True:
                if self.process.poll() is not None:
                    raise CdpError(
                        f"Chrome exited before publishing DevTools endpoint: {''.join(diagnostics)[-1000:]}"
                    )
                remaining = deadline - time.monotonic()
                if remaining <= 0:
                    raise CdpError(
                        f"Chrome DevTools endpoint timeout: {''.join(diagnostics)[-1000:]}"
                    )
                if not selector.select(remaining):
                    continue
                line = self.process.stderr.readline()
                if not line:
                    raise CdpError("EOF before Chrome published its DevTools endpoint")
                diagnostics.append(line)
                match = _ENDPOINT.search(line)
                if match:
                    return match.group(1)
        finally:
            selector.close()

    def _create_page(self) -> None:
        cdp = self.require_cdp()
        cdp.send(
            "Target.setAutoAttach",
            {"autoAttach": True, "waitForDebuggerOnStart": True, "flatten": True},
        )
        self.target_id = cdp.send("Target.createTarget", {"url": "about:blank"})[
            "targetId"
        ]
        self.page_session = self.target_sessions.get(self.target_id, "")
        if not self.page_session:
            result = cdp.send(
                "Target.attachToTarget", {"targetId": self.target_id, "flatten": True}
            )
            self.page_session = result["sessionId"]
        if self.page_session not in self.enabled_sessions:
            raise CdpError("created page target was not configured before resume")

    def _handle_event(self, event: dict[str, Any]) -> None:
        method = event.get("method")
        params = event.get("params", {})
        if method == "Target.attachedToTarget":
            session_id = params["sessionId"]
            info = params.get("targetInfo", {})
            self.session_targets[session_id] = info
            self.target_sessions[info.get("targetId", "")] = session_id
            self._configure_session(session_id, info.get("type", ""))
        elif method == "Target.detachedFromTarget":
            self._detach_session(params.get("sessionId", ""))

    def _detach_session(self, session_id: str) -> None:
        info = self.session_targets.pop(session_id, {})
        self.target_sessions.pop(info.get("targetId", ""), None)
        self.enabled_sessions.discard(session_id)
        self.configuring_sessions.discard(session_id)

    def _configure_session(self, session_id: str, target_type: str) -> None:
        if (
            session_id in self.enabled_sessions
            or session_id in self.configuring_sessions
        ):
            return
        self.configuring_sessions.add(session_id)
        cdp = self.require_cdp()
        try:
            cdp.send(
                "Target.setAutoAttach",
                {"autoAttach": True, "waitForDebuggerOnStart": True, "flatten": True},
                session_id,
            )
            cdp.send("Runtime.enable", session_id=session_id)
            cdp.send("Network.enable", session_id=session_id)
            if target_type == "page":
                cdp.send("Page.enable", session_id=session_id)
                cdp.send("Accessibility.enable", session_id=session_id)
            self.enabled_sessions.add(session_id)
            cdp.send("Runtime.runIfWaitingForDebugger", session_id=session_id)
        finally:
            self.configuring_sessions.discard(session_id)

    def navigate(self, url: str) -> None:
        cdp = self.require_cdp()
        cdp.send("Page.navigate", {"url": url}, self.page_session)
        cdp.send("Browser.getVersion")

    def session_barrier(self) -> None:
        """Drain each live page/Worker session through a local Runtime roundtrip."""
        cdp = self.require_cdp()
        for session_id, info in list(self.session_targets.items()):
            if info.get("type") not in ("page", "worker"):
                continue
            try:
                cdp.send("Runtime.evaluate", {"expression": "0"}, session_id)
            except CdpError as error:
                detached = (
                    "session" in str(error).lower()
                    and "not found" in str(error).lower()
                )
                if detached:
                    self._detach_session(session_id)
                elif session_id in self.session_targets:
                    raise
        cdp.send("Browser.getVersion")

    def app_worker_sessions(self) -> list[str]:
        return [
            session_id
            for session_id, info in self.session_targets.items()
            if info.get("type") == "worker"
        ]

    def require_cdp(self) -> Cdp:
        if self.cdp is None:
            raise CdpError("Chrome CDP session is not open")
        return self.cdp

    def close(self) -> None:
        try:
            self._close_cdp()
        finally:
            try:
                self._close_process()
            finally:
                shutil.rmtree(self.profile, ignore_errors=False)

    def _close_cdp(self) -> None:
        if self.cdp is None:
            return
        try:
            if self.target_id:
                self.cdp.send("Target.closeTarget", {"targetId": self.target_id})
        except (CdpError, OSError):
            pass
        finally:
            self.cdp.close()
            self.cdp = None

    def _close_process(self) -> None:
        if self.process is None:
            return
        process = self.process
        self.process = None
        if process.poll() is None:
            process.terminate()
        try:
            process.wait(timeout=10)
        except subprocess.TimeoutExpired:
            process.kill()
            process.wait(timeout=10)
        if process.stderr is not None:
            process.stderr.close()
