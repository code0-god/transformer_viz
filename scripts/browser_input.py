"""Small Chrome input helpers shared by architecture contracts."""

from __future__ import annotations

from browser_cdp import Cdp


def dispatch_key(
    cdp: Cdp,
    session: str,
    key: str,
    code: str,
    virtual_key: int,
) -> None:
    """Dispatch one complete keyboard press through Chrome DevTools."""
    params = {"key": key, "code": code, "windowsVirtualKeyCode": virtual_key}
    cdp.send("Input.dispatchKeyEvent", {"type": "keyDown", **params}, session)
    cdp.send("Input.dispatchKeyEvent", {"type": "keyUp", **params}, session)
