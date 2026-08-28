"""Production Chrome evidence for article-first Learn with inline Figures."""

from __future__ import annotations

# noqa: SIZE_OK — one ordered inline-Figure matrix owns live route state

import json
from pathlib import Path

from browser_hybrid_capture import capture
from browser_hybrid_contract import require, set_viewport
from browser_hybrid_helpers import (
    JsonObject,
    JsonValue,
    evaluate_dict,
    navigate_hash,
    wait_for,
)
from browser_session import ChromeSession

INLINE_FIGURES = (
    (
        "0-1",
        "decoder.diagram.intro.nlp",
        "learn-nlp-0-1-inline-1440x900.png",
    ),
    (
        "0-2",
        "decoder.diagram.tokenization.token",
        "learn-token-0-2-inline-1440x900.png",
    ),
    (
        "0-3",
        "decoder.diagram.tokenization.vocabulary",
        "learn-vocabulary-0-3-inline-1440x900.png",
    ),
    (
        "0-4",
        "decoder.diagram.tokenization.methods",
        "learn-methods-0-4-inline-1440x900.png",
    ),
)


def _figure_selector(figure_id: str) -> str:
    return f"[data-figure-id={json.dumps(figure_id)}]"


def _string(data: JsonObject, key: str) -> str:
    value = data.get(key)
    if not isinstance(value, str):
        raise TypeError(f"{key} must be a string: {value!r}")
    return value


def _integer(data: JsonObject, key: str) -> int:
    value = data.get(key)
    if not isinstance(value, int):
        raise TypeError(f"{key} must be an integer: {value!r}")
    return value


def _boolean(data: JsonObject, key: str) -> bool:
    value = data.get(key)
    if not isinstance(value, bool):
        raise TypeError(f"{key} must be a boolean: {value!r}")
    return value


def _evaluate(browser: ChromeSession, expression: str) -> JsonValue:
    return browser.require_cdp().evaluate(
        browser.page_session,
        expression,
        True,
    )


def _go_learning_home(browser: ChromeSession) -> None:
    navigate_hash(
        browser,
        "#/",
        "Boolean(document.querySelector('.course-home'))",
        "Course Home",
    )


def _open_chapter(browser: ChromeSession, slug: str) -> None:
    chapter_id = f"decoder.chapter.{slug.replace('-', '.')}"
    navigate_hash(
        browser,
        f"#/learn/decoder-only-fundamentals/{slug}",
        (
            "Boolean(document.querySelector("
            + json.dumps(
                f'[data-curriculum-chapter-id="{chapter_id}"]',
            )
            + "))"
        ),
        f"Chapter {slug}",
    )


def _wait_for_article(browser: ChromeSession) -> None:
    wait_for(
        browser,
        "Boolean(document.querySelector('article'))",
        "Learning article",
    )


def _scroll_article_top(browser: ChromeSession) -> None:
    _evaluate(
        browser,
        """
        (() => {
          if (document.activeElement instanceof HTMLElement)
            document.activeElement.blur();
          window.scrollTo(0, 0);
        })()
        """,
    )


def _wait_for_figure(browser: ChromeSession, figure_id: str) -> None:
    selector = _figure_selector(figure_id)
    wait_for(
        browser,
        f"Boolean(document.querySelector({json.dumps(selector)}))",
        f"Inline Figure missing: {figure_id}",
    )


def _scroll_figure(browser: ChromeSession, figure_id: str) -> None:
    selector = _figure_selector(figure_id)
    _evaluate(
        browser,
        f"""
        (() => {{
          const figure = document.querySelector({json.dumps(selector)});
          if (!(figure instanceof HTMLElement)) return false;
          if (document.activeElement instanceof HTMLElement)
            document.activeElement.blur();
          figure.scrollIntoView({{ block: 'center', behavior: 'auto' }});
          return true;
        }})()
        """,
    )


def _probe_figure(browser: ChromeSession, figure_id: str) -> JsonObject:
    selector = _figure_selector(figure_id)
    return evaluate_dict(
            browser,
            f"""
            (() => {{
              const figure = document.querySelector({json.dumps(selector)});
              const article = document.querySelector('article');
              const caption = figure?.querySelector(':scope > figcaption');
              const rect = figure?.getBoundingClientRect();
              const articleRect = article?.getBoundingClientRect();
              const content = figure?.querySelector('.learning-figure__content');
              const visible = (element) => {{
                if (!(element instanceof Element)) return false;
                const box = element.getBoundingClientRect();
                const style = getComputedStyle(element);
                return box.width > 1 && box.height > 1
                  && style.display !== 'none'
                  && style.visibility !== 'hidden';
              }};
              const visibleImages = Array.from(
                figure?.querySelectorAll('[role="img"]') ?? [],
              ).filter(visible);
              const visibleFallbacks = Array.from(
                figure?.querySelectorAll(
                  '.part0-diagram__fallback,'
                  + '.part1-diagram__fallback,'
                  + '.part2-diagram__fallback',
                ) ?? [],
              ).filter(visible);
              const mobileFlow = figure?.querySelector(
                '.decoder-learning-architecture__mobile',
              );
              return {{
                figureId: figure?.getAttribute('data-figure-id') ?? '',
                size: figure?.getAttribute('data-figure-size') ?? '',
                caption: caption?.textContent?.trim() ?? '',
                triggerCount:
                  article?.querySelectorAll('[aria-haspopup="dialog"]').length ?? -1,
                dialogOpen: Boolean(document.querySelector('[role="dialog"]')),
                imageCount: figure?.querySelectorAll('[role="img"]').length ?? 0,
                visibleImageCount: visibleImages.length,
                visibleFallbackCount: visibleFallbacks.length,
                mobileFlowVisible: visible(mobileFlow),
                visualMode:
                  visibleImages.length > 0
                    ? 'svg'
                    : visibleFallbacks.length > 0
                      ? 'fallback'
                      : visible(mobileFlow)
                        ? 'mobile-flow'
                        : 'blank',
                buttonCount: figure?.querySelectorAll('button').length ?? 0,
                viewerControlCount:
                  article?.querySelectorAll(
                    '[data-testid^="open-"][data-testid$="-viewer"],'
                    + '[aria-controls="focused-viewer"],'
                    + '.focused-viewer__close,'
                    + '.diagram-viewport__toolbar',
                  ).length ?? -1,
                overflow:
                  document.documentElement.scrollWidth
                  - document.documentElement.clientWidth,
                localOverflow: content
                  ? Math.max(0, content.scrollWidth - content.clientWidth)
                  : -1,
                articleContains: !!article && !!figure && article.contains(figure),
                insideArticle:
                  !!rect && !!articleRect
                  && rect.left >= articleRect.left - 1
                  && rect.right <= articleRect.right + 1,
                visible: visible(figure),
                width: rect?.width ?? 0,
                height: rect?.height ?? 0,
                left: rect?.left ?? 0,
                right: rect?.right ?? 0,
                tokenRows: Array.from(
                  figure?.querySelectorAll('[data-token-row]') ?? [],
                  (node) => node.getAttribute('data-token-row'),
                ),
              }};
            }})()
            """,
    )


def _assert_inline_figure(
    browser: ChromeSession,
    figure_id: str,
    expected_size: str,
) -> JsonObject:
    probe = _probe_figure(browser, figure_id)
    require(_string(probe, "figureId") == figure_id, "Wrong Figure")
    require(
        _string(probe, "size") == expected_size,
        f"Wrong Figure size: {figure_id}",
    )
    require(_string(probe, "caption") != "", "Caption missing")
    require(_integer(probe, "triggerCount") == 0, "Learn overlay trigger found")
    require(_integer(probe, "viewerControlCount") == 0, "Learn viewer control found")
    require(not _boolean(probe, "dialogOpen"), "Learn dialog opened")
    require(_boolean(probe, "articleContains"), "Figure is outside article")
    require(_boolean(probe, "insideArticle"), "Figure exceeds article shell")
    require(_boolean(probe, "visible"), "Figure has no visible geometry")
    require(_string(probe, "visualMode") != "blank", "Figure content is blank")
    require(_integer(probe, "overflow") == 0, "Horizontal overflow")
    require(_integer(probe, "localOverflow") == 0, "Local Figure overflow")
    return probe


def _capture_part_zero(
    browser: ChromeSession,
    screenshots: Path,
    shots: dict[str, str],
) -> list[JsonObject]:
    evidence: list[JsonObject] = []
    expected_sizes = {
        "decoder.diagram.intro.nlp": "prose",
        "decoder.diagram.tokenization.token": "wide",
        "decoder.diagram.tokenization.vocabulary": "wide",
        "decoder.diagram.tokenization.methods": "wide",
    }
    for slug, figure_id, filename in INLINE_FIGURES:
        _open_chapter(browser, slug)
        _wait_for_article(browser)
        _wait_for_figure(browser, figure_id)
        _scroll_article_top(browser)
        evidence.append(
            _assert_inline_figure(browser, figure_id, expected_sizes[figure_id]),
        )
        shots[f"inline-{slug}"] = capture(browser, screenshots / filename)
    return evidence


def _capture_gpt(
    browser: ChromeSession,
    screenshots: Path,
    shots: dict[str, str],
) -> JsonObject:
    _open_chapter(browser, "3-1")
    _wait_for_article(browser)
    _wait_for_figure(browser, "root")
    _scroll_article_top(browser)
    probe = _assert_inline_figure(browser, "root", "full")
    require(_integer(probe, "buttonCount") == 0, "GPT Learn Figure is interactive")
    require(_string(probe, "visualMode") == "svg", "Desktop GPT SVG hidden")
    require(
        not _boolean(probe, "mobileFlowVisible"),
        "Desktop GPT mobile flow visible",
    )
    shots["inline-gpt"] = capture(
        browser,
        screenshots / "learn-gpt-inline-1440x900.png",
    )
    link_probe = evaluate_dict(
        browser,
        """(() => {
          const link = document.querySelector(
            'a[aria-label="Transformer Block 설명으로 이동"]',
          );
          const rect = link?.getBoundingClientRect();
          return { width: rect?.width ?? 0, height: rect?.height ?? 0 };
        })()""",
    )
    require(
        _integer(link_probe, "height") >= 44,
        f"GPT Chapter link target too small: {link_probe}",
    )
    _evaluate(
        browser,
        """
        (() => {
          const link = document.querySelector(
            'a[aria-label="Transformer Block 설명으로 이동"]',
          );
          if (!(link instanceof HTMLAnchorElement)) return false;
          link.focus();
          return true;
        })()
        """,
    )
    cdp = browser.require_cdp()
    key = {
        "key": "Enter",
        "code": "Enter",
        "windowsVirtualKeyCode": 13,
    }
    cdp.send("Input.dispatchKeyEvent", {"type": "rawKeyDown", **key}, browser.page_session)
    cdp.send("Input.dispatchKeyEvent", {"type": "keyUp", **key}, browser.page_session)
    wait_for(
        browser,
        "Boolean(document.querySelector('[data-curriculum-chapter-id=\"decoder.chapter.4.1\"]'))",
        "GPT Figure Chapter link failed",
    )
    return {
        **probe,
        "chapterLink": True,
        "chapterLinkKeyboard": "Enter",
        "chapterLinkTarget": link_probe,
    }


def _capture_responsive(
    browser: ChromeSession,
    screenshots: Path,
    shots: dict[str, str],
) -> list[JsonObject]:
    responsive: list[JsonObject] = []
    set_viewport(browser, 1366, 768)
    _open_chapter(browser, "0-2")
    _wait_for_article(browser)
    _wait_for_figure(browser, "decoder.diagram.tokenization.token")
    _scroll_article_top(browser)
    responsive.append(
        _assert_inline_figure(
            browser,
            "decoder.diagram.tokenization.token",
            "wide",
        ),
    )
    shots["inline-token-1366"] = capture(
        browser,
        screenshots / "learn-token-0-2-inline-1366x768.png",
    )

    set_viewport(browser, 1024, 768)
    _open_chapter(browser, "3-1")
    _wait_for_article(browser)
    _wait_for_figure(browser, "root")
    _scroll_article_top(browser)
    responsive.append(_assert_inline_figure(browser, "root", "full"))
    shots["inline-gpt-1024"] = capture(
        browser,
        screenshots / "learn-gpt-inline-1024x768.png",
    )

    set_viewport(browser, 390, 844)
    _open_chapter(browser, "0-2")
    _wait_for_article(browser)
    _wait_for_figure(browser, "decoder.diagram.tokenization.token")
    _scroll_figure(browser, "decoder.diagram.tokenization.token")
    token = _assert_inline_figure(
        browser,
        "decoder.diagram.tokenization.token",
        "wide",
    )
    token_rows = token.get("tokenRows")
    require(
        token_rows == ["1", "1", "1", "2", "2"],
        "Mobile Token Figure did not reflow to two rows",
    )
    responsive.append(token)
    shots["inline-token-mobile"] = capture(
        browser,
        screenshots / "learn-token-inline-mobile-390x844.png",
    )

    for slug, figure_id, filename in (
        (
            "0-3",
            "decoder.diagram.tokenization.vocabulary",
            "learn-vocabulary-inline-mobile-390x844.png",
        ),
        (
            "0-4",
            "decoder.diagram.tokenization.methods",
            "learn-methods-inline-mobile-390x844.png",
        ),
    ):
        _open_chapter(browser, slug)
        _wait_for_article(browser)
        _wait_for_figure(browser, figure_id)
        _scroll_figure(browser, figure_id)
        responsive.append(_assert_inline_figure(browser, figure_id, "wide"))
        shots[f"inline-{slug}-mobile"] = capture(browser, screenshots / filename)

    _open_chapter(browser, "3-1")
    _wait_for_article(browser)
    _wait_for_figure(browser, "root")
    _scroll_figure(browser, "root")
    gpt = _assert_inline_figure(browser, "root", "full")
    mobile_flow = evaluate_dict(
            browser,
            """
            (() => {
              const flow = document.querySelector(
                '.decoder-learning-architecture__mobile',
              );
              const desktop = document.querySelector(
                '.architecture-root-screen[data-architecture-presentation="learn"]',
              );
              return {
                visible: flow instanceof HTMLElement
                  && getComputedStyle(flow).display !== 'none',
                stages: flow?.querySelectorAll('li').length ?? 0,
                labels: Array.from(
                  flow?.querySelectorAll('li') ?? [],
                  (item) => item.textContent?.trim() ?? '',
                ),
                desktopVisible: desktop instanceof HTMLElement
                  && getComputedStyle(desktop).display !== 'none',
              };
            })()
            """,
    )
    require(_boolean(mobile_flow, "visible"), "Mobile GPT flow hidden")
    require(_integer(mobile_flow, "stages") == 9, "Mobile GPT stage count")
    require(
        mobile_flow.get("labels")
        == [
            "Input Context",
            "Token + Position Embedding",
            "Transformer Block × N",
            "Final LayerNorm",
            "LM Head",
            "Logits",
            "Token Selection",
            "Generated Token",
            "Context Update ↺",
        ],
        f"Mobile GPT stage order: {mobile_flow}",
    )
    require(
        not _boolean(mobile_flow, "desktopVisible"),
        "Desktop GPT SVG remained visible on mobile",
    )
    responsive.append({**gpt, "mobileStages": mobile_flow["stages"]})
    shots["inline-gpt-mobile"] = capture(
        browser,
        screenshots / "learn-gpt-inline-mobile-390x844.png",
    )
    return responsive


def _verify_learn_matrix(browser: ChromeSession) -> list[JsonObject]:
    evidence: list[JsonObject] = []
    expected_sizes = {
        "decoder.diagram.intro.nlp": "prose",
        "decoder.diagram.tokenization.token": "wide",
        "decoder.diagram.tokenization.vocabulary": "wide",
        "decoder.diagram.tokenization.methods": "wide",
    }
    for width, height in ((1440, 900), (1366, 768), (1024, 768), (390, 844)):
        set_viewport(browser, width, height)
        for slug, figure_id, _filename in INLINE_FIGURES:
            _open_chapter(browser, slug)
            _wait_for_article(browser)
            _wait_for_figure(browser, figure_id)
            probe = _assert_inline_figure(
                browser,
                figure_id,
                expected_sizes[figure_id],
            )
            evidence.append(
                {
                    "width": width,
                    "height": height,
                    "figureId": figure_id,
                    "figureWidth": probe["width"],
                },
            )
        _open_chapter(browser, "3-1")
        _wait_for_article(browser)
        _wait_for_figure(browser, "root")
        probe = _assert_inline_figure(browser, "root", "full")
        evidence.append(
            {
                "width": width,
                "height": height,
                "figureId": "root",
                "figureWidth": probe["width"],
            },
        )
    return evidence


def capture_learning_phase(
    browser: ChromeSession,
    screenshots: Path,
    evidence: JsonObject,
    shots: dict[str, str],
) -> None:
    set_viewport(browser, 1440, 900)
    _go_learning_home(browser)
    shots["courseHomeDesktop"] = capture(
        browser,
        screenshots / "course-home-1440x900.png",
    )

    part_zero = _capture_part_zero(browser, screenshots, shots)
    gpt = _capture_gpt(browser, screenshots, shots)
    responsive = _capture_responsive(browser, screenshots, shots)
    viewport_matrix = _verify_learn_matrix(browser)
    observed_triggers = max(
        _integer(probe, "triggerCount")
        for probe in [*part_zero, gpt, *responsive]
    )

    set_viewport(browser, 390, 844)
    _go_learning_home(browser)
    shots["courseHomeMobile"] = capture(
        browser,
        screenshots / "course-home-390x844.png",
    )
    evidence["learning"] = {
        "product": "article-inline-figure",
        "partZero": part_zero,
        "gpt": gpt,
        "responsive": responsive,
        "viewportMatrix": viewport_matrix,
        "learnOverlayTriggers": observed_triggers,
    }
