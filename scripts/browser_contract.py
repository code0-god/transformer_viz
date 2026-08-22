"""DOM, responsive, keyboard, and accessibility contracts for real Chrome."""

from __future__ import annotations

from typing import Any

from browser_cdp import Cdp

VIEWPORTS = (
    (1280, 800),
    (1279, 800),
    (768, 800),
    (767, 800),
    (1440, 900),
    (1024, 768),
    (720, 450),
    (390, 844),
    (320, 640),
)
CAPTURES = {
    (1440, 900): "desktop-1440x900.png",
    (1024, 768): "tablet-1024x768.png",
    (390, 844): "mobile-390x844.png",
}


def failures_for(size: tuple[int, int], state: dict[str, Any]) -> list[str]:
    width, height = size
    failures: list[str] = []

    def require(condition: bool, message: str) -> None:
        if not condition:
            failures.append(message)

    require(state["docW"] <= width, f"document width {state['docW']} exceeds {width}")
    require(state["controlsFit"], "generation controls are clipped")
    require(
        state["minTargets"] == 0, f"{state['minTargets']} targets are smaller than 44px"
    )
    require(state["visibleGroups"] == 1, "exactly one curriculum reel must be visible")
    require(state["activeVisible"], "active curriculum step is outside its reel")
    require(
        state["currentCue"] and state["speedCue"],
        "selected controls lack non-color cues",
    )
    require(state["panelRole"] == "tabpanel", "shared workspace is not a tabpanel")
    require(
        state["panelLabel"] in ("mode-guided", "mode-explore"),
        "tabpanel label is stale",
    )
    require(not state["stageOverlaps"], "Main Canvas direct children overlap")
    if width >= 1280:
        require(
            abs(state["shell"]["h"] - height) <= 1, "desktop shell is not one viewport"
        )
        require(state["docH"] <= height, "desktop document scrolls")
        require(state["columns"] == 3, "desktop workspace is not three columns")
        require(
            state["mapToggle"] == "none" and state["mapDisplay"] != "none",
            "map is hidden",
        )
        require(
            state["stage"]["h"] >= 300,
            f"Main Canvas is too short: {state['stage']['h']}",
        )
        require(
            state["stage"]["w"] > state["inspector"]["w"] * 1.7,
            "Main Canvas is not dominant",
        )
        require(
            state["timeline"]["h"] <= 52, "empty generation timeline is not compact"
        )
        require(
            state["groups"]["h"] <= 100, "desktop curriculum is not one compact row"
        )
        require(
            state["stageOverflowY"] == "auto",
            "Main Canvas has no intentional scroll owner",
        )
    elif width >= 768:
        require(state["columns"] == 2, "tablet workspace is not two columns")
        require(
            abs(state["stage"]["y"] - state["inspector"]["y"]) <= 2,
            "workspace columns misalign",
        )
        require(
            state["groups"]["y"] >= max(state["stage"]["b"], state["inspector"]["b"]),
            "rail overlaps workspace",
        )
        require(
            state["mapToggle"] != "none" and state["mapHidden"],
            "tablet map is not closed",
        )
        require(state["groups"]["h"] <= 100, "tablet curriculum is not one compact row")
    else:
        require(state["columns"] == 1, "mobile workspace is not one column")
        require(state["docH"] > height, "mobile document does not scroll")
        require(
            state["mapToggle"] != "none" and state["mapHidden"],
            "mobile map is not closed",
        )
        require(
            state["mapPosition"] in ("absolute", "fixed"), "mobile map is not a drawer"
        )
        require(
            state["transportPosition"] == "sticky", "mobile transport is not sticky"
        )
        require(
            state["transport"]["y"] >= height,
            "mobile transport occupies the initial viewport",
        )
        require(
            state["stage"]["b"] <= state["transport"]["y"] + 1,
            "transport precedes Main Canvas",
        )
        require(
            state["transport"]["b"] <= state["groups"]["y"] + 1,
            "groups precede transport",
        )
        require(
            state["domOrder"],
            "mobile DOM order differs from Stage/transport/map/Inspector/curriculum",
        )
        require(
            state["navigationCount"] == 1,
            "curriculum must own exactly one navigation landmark",
        )
    return failures


def dispatch_key(cdp: Cdp, session: str, key: str, code: str, virtual_key: int) -> None:
    params = {"key": key, "code": code, "windowsVirtualKeyCode": virtual_key}
    cdp.send("Input.dispatchKeyEvent", {"type": "keyDown", **params}, session)
    cdp.send("Input.dispatchKeyEvent", {"type": "keyUp", **params}, session)
