"""Cross-state geometry contracts for the Chapter 0.1 deck."""

from __future__ import annotations

from browser_hybrid_contract import number, require, set_viewport
from browser_hybrid_helpers import JsonObject
from browser_session import ChromeSession
import golden_chapter_browser_capture as golden_capture
import golden_chapter_browser_layout as golden_layout
import golden_chapter_browser_probes as golden

_STABLE_KEYS = (
    "stageWidth", "stageHeight", "leftStart", "leftEnd",
    "rightStart", "rightEnd", "visualLeft", "visualTop",
    "visualWidth", "visualHeight", "visualCenterX", "visualCenterY",
    "controlLeft", "controlTop", "controlWidth", "controlHeight",
)


def assert_stable_geometry(records: list[JsonObject], viewport: tuple[int, int]) -> None:
    require(len(records) == 5, f"Golden state coverage at {viewport}: {records}")
    baseline = records[0]
    stable_keys = (
        _STABLE_KEYS
        if viewport[0] > 768
        else tuple(
            key
            for key in _STABLE_KEYS
            if key not in ("visualTop", "visualCenterY")
        )
    )
    for current in records:
        for key in stable_keys:
            require(
                abs(
                    number(current[key], f"Golden {key}")
                    - number(baseline[key], f"Golden baseline {key}"),
                ) <= 1,
                f"Golden {key} drift at {viewport}: {records}",
            )
        require(
            abs(
                number(current["leftStart"], "Golden LEFT_START")
                - number(current["contentStart"], "Golden CONTENT_START"),
            ) <= 1,
            f"Golden LEFT_START/CONTENT_START at {viewport}: {current}",
        )
        require(
            abs(
                number(current["rightEnd"], "Golden RIGHT_END")
                - number(current["wideEnd"], "Golden WIDE_END"),
            ) <= 1,
            f"Golden RIGHT_END/WIDE_END at {viewport}: {current}",
        )


def collect_viewport(
    browser: ChromeSession,
    url: str,
    viewport: tuple[int, int],
) -> list[JsonObject]:
    width, height = viewport
    set_viewport(browser, width, height)
    golden.open_chapter(browser, url)
    golden.finish_motion(browser)
    golden_capture.mark_identity(browser)
    records: list[JsonObject] = []
    for index, (stage, _label) in enumerate(golden.STATES):
        golden.select_state(browser, index, stage)
        golden.position_deck(browser)
        golden.finish_motion(browser)
        data = golden_layout.probe(browser)
        golden_layout.assert_probe(data, stage, index)
        golden_capture.assert_identity(browser, stage)
        golden_capture.assert_copy(browser, index, stage)
        records.append({"viewportWidth": width, "viewportHeight": height, **data})
    assert_stable_geometry(records, viewport)
    return records
