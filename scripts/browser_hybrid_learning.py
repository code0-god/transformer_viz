"""Course Home and SVG learning-surface browser QA phase."""

from __future__ import annotations

from pathlib import Path

from browser_hybrid_capture import capture, request_urls
from browser_hybrid_contract import (
    button_with_text,
    diagram_probe,
    go_chapter,
    number,
    require,
)
from browser_hybrid_helpers import evaluate_dict, pointer_click
from browser_hybrid_input import drag_target, wheel_target
from browser_session import ChromeSession


def capture_learning_phase(
    browser: ChromeSession,
    screenshots: Path,
    evidence: dict[str, object],
    shots: dict[str, str],
) -> None:
    home = evaluate_dict(
        browser,
        """(() => {
          const header = document.querySelector('.architecture-header');
          return {
            canvasCount: document.querySelectorAll('canvas').length,
            headerHeight: header?.getBoundingClientRect().height ?? 0,
            overflowX: document.documentElement.scrollWidth > innerWidth,
          };
        })()""",
    )
    require(home["canvasCount"] == 0, f"Home rendered Canvas: {home}")
    require(
        number(home["headerHeight"], "header height") <= 48.5,
        f"Header too tall: {home}",
    )
    require(home["overflowX"] is False, f"Home overflow: {home}")
    shots["course-home"] = capture(
        browser,
        screenshots / "hybrid-course-home.png",
    )
    require(
        not any("ScoreMatrixScene" in url for url in request_urls(browser)),
        "Visualization chunk loaded on Home",
    )

    chapters: dict[str, object] = {}
    evidence["chapters"] = chapters
    for slug, shot in (
        ("0-1", None),
        ("0-2", "hybrid-learn-0-2.png"),
        ("1-2", "hybrid-learn-1-2.png"),
        ("3-1", "hybrid-gpt-fit.png"),
        ("4-1", None),
        ("5-1", "hybrid-self-attention.png"),
    ):
        go_chapter(browser, slug)
        probe = diagram_probe(browser)
        require(probe["fullyContained"] is True, f"{slug} clipped: {probe}")
        require(probe["overflowX"] is False, f"{slug} overflow: {probe}")
        if slug in {"3-1", "4-1", "5-1"}:
            require(
                0.47 <= number(probe["split"], "pane split") <= 0.49,
                f"{slug} split drift: {probe}",
            )
        chapters[slug] = probe
        if shot is not None:
            shots[slug] = capture(browser, screenshots / shot)
        if slug == "3-1":
            _exercise_diagram_viewport(browser, evidence, screenshots, shots)

    pointer_click(
        browser,
        "document.querySelector('[data-node-id=\"attention-softmax\"]')",
        condition=(
            "document.querySelector('[data-guide-section-id=\"softmax\"]')"
            "?.dataset.active === 'true'"
        ),
        label="Self-Attention explanation focus",
    )
    shots["self-attention-explanation"] = capture(
        browser,
        screenshots / "hybrid-self-attention-explanation.png",
    )


def _exercise_diagram_viewport(
    browser: ChromeSession,
    evidence: dict[str, object],
    screenshots: Path,
    shots: dict[str, str],
) -> None:
    pointer_click(
        browser,
        "document.querySelector("
        "'.diagram-viewport button[aria-label=\"확대\"]')",
        condition=(
            "document.querySelector('.diagram-viewport__surface')"
            "?.dataset.viewportMode === 'zoomed'"
        ),
        label="GPT zoom",
    )
    surface = "document.querySelector('.diagram-viewport__surface')"
    before_pan = diagram_probe(browser)
    drag_target(
        browser,
        target_expression=surface,
        button="left",
        delta_x=60,
        delta_y=35,
    )
    after_pan = diagram_probe(browser)
    require(
        (before_pan["panX"], before_pan["panY"])
        != (after_pan["panX"], after_pan["panY"]),
        "Diagram drag pan did not change transform",
    )
    before_wheel = number(after_pan["scale"], "Diagram scale")
    wheel_target(browser, target_expression=surface, delta_y=120)
    normal_wheel = diagram_probe(browser)
    require(
        number(normal_wheel["scale"], "normal wheel scale") == before_wheel,
        "Normal wheel changed Diagram scale",
    )
    wheel_target(
        browser,
        target_expression=surface,
        delta_y=-120,
        modifiers=2,
    )
    control_wheel = diagram_probe(browser)
    require(
        number(control_wheel["scale"], "Ctrl wheel scale") > before_wheel,
        "Ctrl+wheel did not zoom Diagram",
    )
    evidence["diagramInteractions"] = {
        "panChanged": True,
        "normalWheelPreservedScale": True,
        "controlWheelZoomed": True,
    }
    shots["gpt-zoom"] = capture(
        browser,
        screenshots / "hybrid-gpt-zoom.png",
    )
