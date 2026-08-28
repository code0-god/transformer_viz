from __future__ import annotations

# noqa: SIZE_OK — one ordered browser scenario owns shared page state

from pathlib import Path

from browser_hybrid_capture import capture, request_urls
from browser_hybrid_contract import (
    diagram_probe,
    go_chapter,
    number,
    require,
    set_viewport,
)
from browser_hybrid_helpers import (
    JsonObject,
    evaluate_dict,
    navigate_hash,
    pointer_click,
    settle,
    settle_animations,
    wait_for,
)
from browser_session import ChromeSession


def _article_probe(browser: ChromeSession) -> JsonObject:
    return evaluate_dict(
        browser,
        """(() => {
          const workspace = document.querySelector(
            '[data-learning-layout="article"]',
          );
          const article = document.querySelector(
            '.learning-workspace__article',
          );
          const guide = document.querySelector('.learning-workspace__guide');
          const actions = Array.from(document.querySelectorAll(
            [
              '.learning-guide-visual-actions button',
              '.learning-guide-section-actions button',
            ].join(','),
          ));
          const rect = article?.getBoundingClientRect();
          const guideStyle = guide ? getComputedStyle(guide) : null;
          return {
            workspace: workspace !== null,
            article: article !== null,
            articleWidth: rect?.width ?? 0,
            viewportWidth: innerWidth,
            diagramMounted:
              document.querySelector('.diagram-viewport') !== null,
            canvasMounted: document.querySelector('canvas') !== null,
            actionCount: actions.length,
            actionLabels: actions.map(action => action.textContent?.trim()),
            topActionBar:
              document.querySelector('.learning-workspace__viewer-actions')
                !== null,
            prompt: document.querySelector('[aria-label="Prompt"]') !== null,
            generate: document.querySelector('[data-testid="generate"]') !== null,
            overflowX: document.documentElement.scrollWidth > innerWidth,
            guideOverflowY: guideStyle?.overflowY ?? null,
            tablist: document.querySelector('[role="tablist"]') !== null,
          };
        })()""",
    )


def _require_article(
    article: JsonObject,
    slug: str,
    *,
    action_count: int | None = None,
) -> None:
    require(
        article["workspace"] is True and article["article"] is True,
        f"{slug} article shell missing: {article}",
    )
    require(
        0 < number(article["articleWidth"], "article width") <= 900,
        f"{slug} article line length drift: {article}",
    )
    require(
        article["diagramMounted"] is False
        and article["canvasMounted"] is False
        and article["tablist"] is False
        and article["topActionBar"] is False,
        f"{slug} visual mounted in reading mode: {article}",
    )
    require(
        article["prompt"] is False
        and article["generate"] is False
        and article["overflowX"] is False,
        f"{slug} Learn/Lab separation failed: {article}",
    )
    require(
        article["guideOverflowY"] not in {"auto", "scroll"},
        f"{slug} nested guide scroll owner: {article}",
    )
    if action_count is not None:
        require(
            article["actionCount"] == action_count,
            f"{slug} visual trigger count: {article}",
        )


def _open_diagram(browser: ChromeSession) -> JsonObject:
    pointer_click(
        browser,
        "document.querySelector('[data-testid=\"open-diagram-viewer\"]')",
        condition="document.querySelector('#focused-viewer') !== null",
        label="focused Diagram viewer",
    )
    settle_animations(
        browser,
        "[data-viewer-backdrop]",
        "focused Diagram viewer animation",
    )
    probe = diagram_probe(browser)
    require(
        probe["mode"] == "fit"
        and probe["zoomPercent"] == "100%"
        and probe["fullyContained"] is True
        and probe["toolbarInsideSurface"] is True,
        f"Diagram viewer Fit failed: {probe}",
    )
    visual_rects = probe["visualRects"]
    toolbar_rect = probe["toolbarRect"]
    if not isinstance(toolbar_rect, dict):
        toolbar_rect = {}
    styles = probe["styles"]
    if not isinstance(styles, dict):
        styles = {}
    surface_rect = probe["surfaceRect"]
    if not isinstance(surface_rect, dict):
        surface_rect = {}
    require(
        number(probe["contentWidth"], "Diagram content width") > 0
        and number(probe["contentHeight"], "Diagram content height") > 0
        and isinstance(visual_rects, list)
        and len(visual_rects) == 1
        and number(visual_rects[0]["right"], "Diagram visual right")
        > number(visual_rects[0]["left"], "Diagram visual left")
        and number(visual_rects[0]["bottom"], "Diagram visual bottom")
        > number(visual_rects[0]["top"], "Diagram visual top"),
        f"Diagram viewer content is blank: {probe}",
    )
    require(
        number(toolbar_rect.get("right"), "Diagram toolbar right")
        > number(toolbar_rect.get("left"), "Diagram toolbar left")
        and number(toolbar_rect.get("bottom"), "Diagram toolbar bottom")
        > number(toolbar_rect.get("top"), "Diagram toolbar top"),
        f"Diagram toolbar is blank: {probe}",
    )
    require(
        number(surface_rect.get("right"), "Diagram surface right")
        > number(surface_rect.get("left"), "Diagram surface left")
        and number(surface_rect.get("bottom"), "Diagram surface bottom")
        - number(surface_rect.get("top"), "Diagram surface top")
        >= 400,
        f"Diagram surface collapsed: {probe}",
    )
    require(
        styles.get("viewerOpacity") == "1"
        and styles.get("bodyOpacity") == "1"
        and styles.get("paneOpacity") == "1"
        and styles.get("paneVisibility") == "visible",
        f"Diagram viewer opacity failed: {probe}",
    )
    require(
        number(probe["viewerWidthRatio"], "viewer width ratio") >= 0.8
        and number(probe["viewerHeightRatio"], "viewer height ratio") >= 0.78
        and probe["descriptionOutsideTransform"] is True
        and probe["overflowX"] is False,
        f"Diagram viewer sizing failed: {probe}",
    )
    return probe


def _close_viewer(browser: ChromeSession) -> None:
    pointer_click(
        browser,
        "document.querySelector('[aria-label=\"집중 보기 닫기\"]')",
        condition="document.querySelector('#focused-viewer') === null",
        label="focused viewer close",
    )


def _zoom_and_refit(browser: ChromeSession) -> JsonObject:
    pointer_click(
        browser,
        "document.querySelector('#focused-viewer [aria-label=\"확대\"]')",
        condition=(
            "document.querySelector('#focused-viewer "
            "[aria-label=\"현재 확대 비율\"]')?.textContent?.trim()"
            " !== '100%'"
        ),
        label="Diagram zoom",
    )
    zoomed = diagram_probe(browser)
    require(
        zoomed["mode"] == "zoomed" and zoomed["zoomPercent"] == "120%",
        f"Diagram zoom failed: {zoomed}",
    )
    wait_for(
        browser,
        (
            "document.querySelector('#focused-viewer "
            "[aria-label=\"현재 확대 비율\"]')?.textContent?.trim()"
            " === '100%'"
        ),
        "Diagram keyboard Fit",
        """(() => {
          const target = document.querySelector(
            '#focused-viewer [aria-label="확대"]',
          );
          target?.focus();
          target?.dispatchEvent(new KeyboardEvent('keydown', {
            key: 'f', bubbles: true,
          }));
        })();""",
    )
    return zoomed


def capture_learning_phase(
    browser: ChromeSession,
    screenshots: Path,
    evidence: JsonObject,
    shots: dict[str, str],
) -> None:
    set_viewport(browser, 1440, 900)
    navigate_hash(
        browser,
        "#/",
        "document.querySelector('.course-home') !== null",
        "Course Home",
    )
    settle(browser)
    home = evaluate_dict(
        browser,
        """(() => {
          const style = getComputedStyle(document.documentElement);
          const background = getComputedStyle(document.body).backgroundImage;
          return {
            canvasCount: document.querySelectorAll('canvas').length,
            overflowX: document.documentElement.scrollWidth > innerWidth,
            radialLayers: (background.match(/radial-gradient/g) ?? []).length,
            palette: {
              clay: style.getPropertyValue('--mesh-terracotta').trim(),
              amber: style.getPropertyValue('--mesh-amber').trim(),
              sage: style.getPropertyValue('--mesh-sage').trim(),
              slate: style.getPropertyValue('--mesh-sky').trim(),
            },
          };
        })()""",
    )
    require(
        home["canvasCount"] == 0
        and home["overflowX"] is False
        and home["radialLayers"] == 4,
        f"Course Home contract failed: {home}",
    )
    evidence["home"] = home
    shots["courseHome"] = capture(
        browser, screenshots / "course-home-1440x900.png"
    )
    require(
        not any("ScoreMatrixScene" in url for url in request_urls(browser)),
        "Three/R3F chunk loaded on Course Home",
    )

    article_specs = [
        ("0-2", "learn-token-0-2-1440x900.png", 1),
        ("1-1", "learn-language-model-1440x900.png", 1),
    ]
    for slug, filename, action_count in article_specs:
        go_chapter(browser, slug)
        article = _article_probe(browser)
        _require_article(article, slug, action_count=action_count)
        evidence[f"article-{slug}"] = article
        shots[f"article-{slug}"] = capture(browser, screenshots / filename)

    go_chapter(browser, "3-1")
    gpt_article = _article_probe(browser)
    _require_article(gpt_article, "3-1", action_count=2)
    shots["gptArticle"] = capture(
        browser, screenshots / "learn-gpt-article-1440x900.png"
    )
    evidence["gptViewerFit"] = _open_diagram(browser)
    shots["gptDiagramFit"] = capture(
        browser, screenshots / "viewer-gpt-fit-1440x900.png"
    )
    evidence["gptViewerZoom"] = _zoom_and_refit(browser)
    pointer_click(
        browser,
        "document.querySelector('#focused-viewer [aria-label=\"확대\"]')",
        condition=(
            "document.querySelector('#focused-viewer "
            "[aria-label=\"현재 확대 비율\"]')?.textContent?.trim()"
            " !== '100%'"
        ),
        label="Diagram screenshot zoom",
    )
    shots["gptDiagramZoom"] = capture(
        browser, screenshots / "viewer-gpt-zoom-1440x900.png"
    )
    _close_viewer(browser)

    go_chapter(browser, "5-1")
    attention_article = _article_probe(browser)
    _require_article(attention_article, "5-1", action_count=2)
    shots["attentionArticle"] = capture(
        browser, screenshots / "learn-self-attention-1440x900.png"
    )
    attention_viewer = _open_diagram(browser)
    require(
        evaluate_dict(
            browser,
            """(() => ({
              attention: document.querySelector(
                '#focused-viewer [data-testid="attention-detail"]',
              ) !== null,
              dialogCount: document.querySelectorAll(
                '[role="dialog"]',
              ).length,
            }))()""",
        )
        == {"attention": True, "dialogCount": 1},
        "Self-Attention viewer did not mount one live architecture",
    )
    evidence["attentionViewer"] = attention_viewer
    shots["attentionDiagram"] = capture(
        browser, screenshots / "viewer-self-attention-1440x900.png"
    )
    _close_viewer(browser)

    responsive: JsonObject = {}
    for width, height in ((1366, 768), (1024, 768)):
        set_viewport(browser, width, height)
        go_chapter(browser, "1-1")
        article = _article_probe(browser)
        _require_article(article, f"1-1@{width}")
        viewer = _open_diagram(browser)
        responsive[str(width)] = {"article": article, "viewer": viewer}
        _close_viewer(browser)

    set_viewport(browser, 390, 844)
    go_chapter(browser, "0-2")
    mobile_article = _article_probe(browser)
    _require_article(mobile_article, "0-2@390", action_count=1)
    shots["mobileArticle"] = capture(
        browser, screenshots / "mobile-learn-article-390x844.png"
    )
    mobile_viewer = _open_diagram(browser)
    require(
        number(mobile_viewer["viewerWidthRatio"], "mobile viewer width") >= 0.95
        and number(mobile_viewer["viewerHeightRatio"], "mobile viewer height")
        >= 0.95,
        f"Mobile viewer is not near full-screen: {mobile_viewer}",
    )
    shots["mobileDiagram"] = capture(
        browser, screenshots / "mobile-diagram-viewer-390x844.png"
    )
    _close_viewer(browser)
    responsive["390"] = {
        "article": mobile_article,
        "viewer": mobile_viewer,
    }
    evidence["responsive"] = responsive
    require(
        not any("ScoreMatrixScene" in url for url in request_urls(browser)),
        "Three/R3F chunk loaded before visualization viewer",
    )
