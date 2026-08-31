"""Production Chrome evidence for article-first Learn with inline Figures."""

from __future__ import annotations

# noqa: SIZE_OK — one ordered inline-Figure matrix owns live route state

import json
from pathlib import Path

from browser_hybrid_capture import capture, request_urls
from browser_hybrid_contract import require, set_viewport
from browser_hybrid_helpers import (
    JsonObject,
    JsonValue,
    evaluate_dict,
    navigate_hash,
    pointer_click,
    wait_for,
)
from browser_learning_workspace_probes import browser_errors
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
EXPECTED_PREFERRED_WIDTHS = {
    "decoder.diagram.intro.nlp": 960,
    "decoder.diagram.tokenization.token": 960,
    "decoder.diagram.tokenization.vocabulary": 920,
    "decoder.diagram.tokenization.methods": 980,
    "decoder.diagram.language-model.definition": 960,
    "decoder.diagram.language-model.next-token": 920,
    "decoder.diagram.language-model.conditional-probability": 900,
    "decoder.diagram.language-model.autoregressive": 960,
    "decoder.diagram.representation.embedding": 960,
    "decoder.diagram.representation.position": 960,
    "decoder.diagram.representation.hidden-state": 1000,
    "root": 1000,
}
ALL_LEARNING_FIGURES = (
    ("0-1", "decoder.diagram.intro.nlp", "full"),
    ("0-2", "decoder.diagram.tokenization.token", "wide"),
    ("0-3", "decoder.diagram.tokenization.vocabulary", "wide"),
    ("0-4", "decoder.diagram.tokenization.methods", "wide"),
    ("1-1", "decoder.diagram.language-model.definition", "wide"),
    ("1-2", "decoder.diagram.language-model.next-token", "wide"),
    ("1-3", "decoder.diagram.language-model.conditional-probability", "wide"),
    ("1-4", "decoder.diagram.language-model.autoregressive", "wide"),
    ("2-1", "decoder.diagram.representation.embedding", "wide"),
    ("2-2", "decoder.diagram.representation.position", "wide"),
    ("2-3", "decoder.diagram.representation.hidden-state", "wide"),
    ("3-1", "root", "full"),
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


def _number(data: JsonObject, key: str) -> float:
    value = data.get(key)
    if not isinstance(value, int | float):
        raise TypeError(f"{key} must be a number: {value!r}")
    return float(value)


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


def _course_home_geometry(browser: ChromeSession) -> JsonObject:
    return evaluate_dict(
        browser,
        """(() => {
          const app = document.querySelector('.architecture-app');
          const home = document.querySelector('.course-home');
          const intro = document.querySelector('.course-home__intro');
          const course = document.querySelector('.course-home__course');
          const appStyle = app ? getComputedStyle(app) : null;
          const rect = (element) => {
            const box = element?.getBoundingClientRect();
            return {
              left: box?.left ?? -1,
              right: box?.right ?? -1,
              width: box?.width ?? -1,
            };
          };
          return {
            innerWidth,
            clientWidth: document.documentElement.clientWidth,
            app: rect(app),
            home: rect(home),
            intro: rect(intro),
            course: rect(course),
            appPaddingStart: appStyle?.paddingInlineStart ?? '',
            appPaddingEnd: appStyle?.paddingInlineEnd ?? '',
          };
        })()""",
    )


def _verify_product_responsive(
    browser: ChromeSession,
    screenshots: Path,
    shots: dict[str, str],
) -> list[JsonObject]:
    evidence: list[JsonObject] = []
    for width, height in (
        (320, 568),
        (390, 844),
        (768, 1024),
        (1024, 768),
        (1366, 768),
        (1440, 900),
    ):
        set_viewport(browser, width, height)
        _go_learning_home(browser)
        home = evaluate_dict(
            browser,
            """(() => {
              const rect = (selector) =>
                document.querySelector(selector)?.getBoundingClientRect();
              const intersects = (left, right) =>
                !!left && !!right
                && left.left < right.right && left.right > right.left
                && left.top < right.bottom && left.bottom > right.top;
              const header = document.querySelector('.architecture-header');
              const brand = rect('.brand-lockup');
              const navigation = rect('.app-navigation');
              const status = rect('.lifecycle');
              const course = rect('.course-home__course');
              const home = rect('.course-home');
              const navigationHeights = Array.from(
                document.querySelectorAll('.app-navigation a'),
                (link) => link.getBoundingClientRect().height,
              );
              const actionHeights = Array.from(
                document.querySelectorAll(
                  '.course-home__actions :is(a, button)',
                ),
                (action) => action.getBoundingClientRect().height,
              );
              return {
                overflow:
                  document.documentElement.scrollWidth
                  - document.documentElement.clientWidth,
                headerOverflow: header
                  ? Math.max(0, header.scrollWidth - header.clientWidth)
                  : -1,
                brandNavigationOverlap: intersects(brand, navigation),
                brandStatusOverlap: intersects(brand, status),
                navigationStatusOverlap: intersects(navigation, status),
                navigationMinHeight: Math.min(...navigationHeights),
                actionMinHeight: Math.min(...actionHeights),
                courseTop: course?.top ?? -1,
                courseVisible: !!course && course.top < innerHeight,
                homeFits:
                  !!home && home.left >= 0 && home.right <= innerWidth + 1,
              };
            })()""",
        )
        require(home["overflow"] == 0, f"Home overflow at {width}: {home}")
        require(
            home["headerOverflow"] == 0,
            f"Header overflow at {width}: {home}",
        )
        require(
            home["brandNavigationOverlap"] is False
            and home["brandStatusOverlap"] is False
            and home["navigationStatusOverlap"] is False,
            f"Header regions overlap at {width}: {home}",
        )
        if width <= 768:
            require(
                _number(home, "navigationMinHeight") >= 44,
                f"Mobile navigation target too small at {width}: {home}",
            )
        require(
            _number(home, "actionMinHeight") >= 44,
            f"Home action target too small at {width}: {home}",
        )
        require(
            _boolean(home, "homeFits"),
            f"Home exceeds viewport at {width}: {home}",
        )
        if width <= 390:
            require(
                _boolean(home, "courseVisible"),
                f"Home course starts below first viewport at {width}: {home}",
            )
        if width == 320:
            shots["courseHomeNarrow"] = capture(
                browser,
                screenshots / "course-home-320x568.png",
            )

        _open_chapter(browser, "0-2")
        _wait_for_article(browser)
        _scroll_article_top(browser)
        learn = evaluate_dict(
            browser,
            """(() => {
              const guide = document.querySelector('.learning-guide');
              const heading = document.querySelector(
                '.curriculum-workspace__chapter-copy h1',
              );
              const toc = document.querySelector(
                'button[aria-label="목차 열기"]',
              );
              const guideRect = guide?.getBoundingClientRect();
              const headingRect = heading?.getBoundingClientRect();
              const guideStyle = guide ? getComputedStyle(guide) : null;
              return {
                overflow:
                  document.documentElement.scrollWidth
                  - document.documentElement.clientWidth,
                fontSize: Number.parseFloat(guideStyle?.fontSize ?? '0'),
                lineHeight: Number.parseFloat(guideStyle?.lineHeight ?? '0'),
                guideFits:
                  !!guideRect && guideRect.left >= 0
                  && guideRect.right <= innerWidth + 1,
                headingFits:
                  !!headingRect && headingRect.left >= 0
                  && headingRect.right <= innerWidth + 1,
                tocHeight: toc?.getBoundingClientRect().height ?? 0,
              };
            })()""",
        )
        require(learn["overflow"] == 0, f"Learn overflow at {width}: {learn}")
        require(
            _number(learn, "fontSize") >= 17
            and _number(learn, "lineHeight") >= 27,
            f"Learn reading type regressed at {width}: {learn}",
        )
        require(
            _boolean(learn, "guideFits") and _boolean(learn, "headingFits"),
            f"Learn content exceeds viewport at {width}: {learn}",
        )
        require(
            _number(learn, "tocHeight") >= 44,
            f"Learn ToC target too small at {width}: {learn}",
        )
        if width == 320:
            shots["learnNarrow"] = capture(
                browser,
                screenshots / "learn-token-320x568.png",
            )
        evidence.append(
            {
                "width": width,
                "height": height,
                "home": home,
                "learn": learn,
            },
        )
    return evidence


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


def _scroll_to_bottom(browser: ChromeSession, minimum: int = 1) -> int:
    scroll = evaluate_dict(
        browser,
        """
        (() => {
          const root = document.documentElement;
          const previousBehavior = root.style.scrollBehavior;
          root.style.scrollBehavior = 'auto';
          window.scrollTo({
            top: root.scrollHeight,
            left: 0,
            behavior: 'auto',
          });
          const result = {
            maxScroll: Math.max(0, root.scrollHeight - innerHeight),
            scrollY: Math.round(scrollY),
          };
          root.style.scrollBehavior = previousBehavior;
          return result;
        })()
        """,
    )
    scroll_y = _integer(scroll, "scrollY")
    require(
        abs(scroll_y - _number(scroll, "maxScroll")) <= 1,
        f"Chapter bottom scroll missed target: {scroll}",
    )
    require(
        scroll_y >= minimum,
        f"Chapter is not tall enough for scroll test: {scroll_y} < {minimum}",
    )
    return scroll_y


def _wait_for_chapter_top(browser: ChromeSession, chapter_id: str) -> JsonObject:
    wait_for(
        browser,
        (
            "Boolean(document.querySelector("
            + json.dumps(
                f'[data-curriculum-chapter-id="{chapter_id}"]',
            )
            + ")) && scrollY === 0"
        ),
        f"{chapter_id} at top",
    )
    probe = evaluate_dict(
        browser,
        """(() => ({
          scrollY: Math.round(scrollY),
          activeId: document.activeElement?.id ?? '',
          activeSection:
            document.activeElement?.getAttribute('data-guide-section-id') ?? '',
        }))()""",
    )
    require(_integer(probe, "scrollY") == 0, f"Chapter not at top: {probe}")
    return probe


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
          const header = document.querySelector('.architecture-header');
          const headerBottom = header?.getBoundingClientRect().bottom ?? 0;
          const figureTop = figure.getBoundingClientRect().top;
          const maxScroll = Math.max(
            0,
            document.documentElement.scrollHeight - innerHeight,
          );
          const target = Math.min(
            maxScroll,
            Math.max(0, scrollY + figureTop - headerBottom - 16),
          );
          window.scrollTo({{
            top: target,
            left: 0,
            behavior: 'auto',
          }});
          return true;
        }})()
        """,
    )
    wait_for(
        browser,
        f"""
        (() => {{
          const figure = document.querySelector({json.dumps(selector)});
          const header = document.querySelector('.architecture-header');
          if (!(figure instanceof HTMLElement)) return false;
          const top = figure.getBoundingClientRect().top;
          const boundary = (header?.getBoundingClientRect().bottom ?? 0) + 16;
          const maxScroll = Math.max(
            0,
            document.documentElement.scrollHeight - innerHeight,
          );
          return Math.abs(top - boundary) <= 1
            || (Math.abs(scrollY - maxScroll) <= 1 && top >= boundary - 1);
        }})()
        """,
        f"Inline Figure stable start: {figure_id}",
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
              const graphic = figure?.querySelector('.learning-figure__graphic');
              const graphicRect = graphic?.getBoundingClientRect();
              const localOverflowSources = content
                ? Array.from(content.querySelectorAll('*'))
                    .map((element) => {{
                      const box = element.getBoundingClientRect();
                      const style = getComputedStyle(element);
                      return {{
                        tag: element.tagName,
                        className:
                          typeof element.className === 'string'
                            ? element.className
                            : element.getAttribute('class') ?? '',
                        boxSizing: style.boxSizing,
                        overflowWrap: style.overflowWrap,
                        paddingInline:
                          `${{style.paddingInlineStart}} ${{style.paddingInlineEnd}}`,
                        whiteSpace: style.whiteSpace,
                        width: box.width,
                        right: box.right,
                        scrollWidth:
                          element instanceof HTMLElement
                            ? element.scrollWidth
                            : 0,
                        clientWidth:
                          element instanceof HTMLElement
                            ? element.clientWidth
                            : 0,
                      }};
                    }})
                    .filter((item) =>
                      item.right > (graphicRect?.right ?? 0) + 0.5
                      || item.scrollWidth > item.clientWidth + 0.5
                    )
                    .slice(0, 12)
                : [];
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
              const sceneCanvas = figure?.querySelector(
                '.scene-figure canvas',
              );
              const sceneStatus = figure?.querySelector('.scene-figure')
                ?.getAttribute('data-scene-status') ?? '';
              const articleText = article?.textContent ?? '';
              const forbiddenTerms = [
                '구현 노트',
                'rust',
                'exporter',
                'fixture',
                'provenance',
                'current runtime',
                ...(figure?.getAttribute('data-figure-id')
                  === 'decoder.diagram.language-model.autoregressive'
                    ? []
                    : ['kv cache']),
                'replay cache',
                'runtime 사실',
                '교육용 runtime',
              ];
              return {{
                figureId: figure?.getAttribute('data-figure-id') ?? '',
                renderer:
                  figure?.getAttribute('data-figure-renderer') ?? '',
                sceneStatus,
                size: figure?.getAttribute('data-figure-size') ?? '',
                preferredWidth: Number(
                  figure?.getAttribute('data-figure-preferred-width') ?? 0,
                ),
                caption: caption?.textContent?.trim() ?? '',
                triggerCount:
                  article?.querySelectorAll('[aria-haspopup="dialog"]').length ?? -1,
                dialogOpen: Boolean(document.querySelector('[role="dialog"]')),
                imageCount: figure?.querySelectorAll('[role="img"]').length ?? 0,
                visibleImageCount: visibleImages.length,
                visibleFallbackCount: visibleFallbacks.length,
                mobileFlowVisible: visible(mobileFlow),
                visualMode:
                  visible(sceneCanvas) && sceneStatus === 'ready'
                    ? 'scene'
                    : visibleImages.length > 0
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
                localClientWidth: content?.clientWidth ?? -1,
                localScrollWidth: content?.scrollWidth ?? -1,
                localOverflowSources,
                articleContains: !!article && !!figure && article.contains(figure),
                insideArticle:
                  !!rect && !!articleRect
                  && rect.left >= articleRect.left - 1
                  && rect.right <= articleRect.right + 1,
                visible: visible(figure),
                width: rect?.width ?? 0,
                height: rect?.height ?? 0,
                graphicWidth: graphicRect?.width ?? 0,
                graphicLeft: graphicRect?.left ?? 0,
                graphicRight: graphicRect?.right ?? 0,
                left: rect?.left ?? 0,
                right: rect?.right ?? 0,
                tokenRows: Array.from(
                  figure?.querySelectorAll('[data-token-row]') ?? [],
                  (node) => node.getAttribute('data-token-row'),
                ),
                implementationTermHits: forbiddenTerms.filter((term) =>
                  articleText.toLocaleLowerCase().includes(term),
                ),
              }};
            }})()
            """,
    )


def _probe_step_controls(
    browser: ChromeSession,
    figure_id: str,
) -> JsonObject:
    selector = _figure_selector(figure_id)
    return evaluate_dict(
        browser,
        f"""
        (() => {{
          const figure = document.querySelector({json.dumps(selector)});
          const buttons = Array.from(
            figure?.querySelectorAll('.scene-step-rail li > button') ?? [],
          );
          const metrics = buttons.map((button) => {{
            const rect = button.getBoundingClientRect();
            const labelNode = Array.from(button.childNodes).find(
              (node) =>
                node.nodeType === Node.TEXT_NODE
                && (node.textContent?.trim() ?? '') !== '',
            );
            const range = document.createRange();
            if (labelNode !== undefined) range.selectNodeContents(labelNode);
            const lineTops = labelNode === undefined
              ? []
              : Array.from(range.getClientRects(), (line) =>
                  Math.round(line.top * 2) / 2
                );
            return {{
              height: rect.height,
              label: labelNode?.textContent?.trim() ?? '',
              lines: new Set(lineTops).size,
              width: rect.width,
            }};
          }});
          let overlapCount = 0;
          for (let left = 0; left < buttons.length; left += 1) {{
            const a = buttons[left].getBoundingClientRect();
            for (let right = left + 1; right < buttons.length; right += 1) {{
              const b = buttons[right].getBoundingClientRect();
              if (
                Math.min(a.right, b.right) - Math.max(a.left, b.left) > 0.5
                && Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 0.5
              ) {{
                overlapCount += 1;
              }}
            }}
          }}
          return {{
            buttons: metrics,
            count: metrics.length,
            maxLines: Math.max(0, ...metrics.map((item) => item.lines)),
            minHeight: Math.min(Infinity, ...metrics.map((item) => item.height)),
            minWidth: Math.min(Infinity, ...metrics.map((item) => item.width)),
            overlapCount,
            wrappedLabels: metrics
              .filter((item) => item.lines > 1)
              .map((item) => item.label),
          }};
        }})()
        """,
    )


def _assert_step_controls(
    browser: ChromeSession,
    figure_id: str,
    *,
    mobile: bool,
) -> JsonObject:
    probe = _probe_step_controls(browser, figure_id)
    require(_integer(probe, "count") > 0, f"Scene controls missing: {probe}")
    require(
        _number(probe, "minWidth") >= 44
        and _number(probe, "minHeight") >= 44,
        f"Scene control target below 44px: {probe}",
    )
    require(
        _integer(probe, "overlapCount") == 0,
        f"Scene controls overlap: {probe}",
    )
    if mobile:
        require(
            _integer(probe, "maxLines") <= 2,
            f"Mobile scene label exceeds two lines: {probe}",
        )
    else:
        require(
            probe.get("wrappedLabels") == [],
            f"Desktop scene label wrapped: {probe}",
        )
    return probe


def _assert_inline_figure(
    browser: ChromeSession,
    figure_id: str,
    expected_size: str,
) -> JsonObject:
    probe = _probe_figure(browser, figure_id)
    if (
        probe.get("renderer") == "scene"
        and probe.get("sceneStatus") in ("loading", "initializing")
    ):
        scene_selector = json.dumps(
            f"{_figure_selector(figure_id)} .scene-figure",
        )
        wait_for(
            browser,
            (
                "['ready', 'static', 'unavailable', 'error'].includes("
                f"document.querySelector({scene_selector})"
                "?.getAttribute('data-scene-status') ?? '')"
            ),
            f"Scene Figure settled: {figure_id}",
        )
        probe = _probe_figure(browser, figure_id)
    if (
        probe.get("renderer") == "scene"
        and probe.get("sceneStatus") == "ready"
    ):
        ready_canvas = json.dumps(
            f"{_figure_selector(figure_id)} "
            f"canvas[data-learning-scene-canvas={json.dumps(figure_id)}]",
        )
        wait_for(
            browser,
            f"Boolean(document.querySelector({ready_canvas}))",
            f"Scene Canvas ownership ready: {figure_id}",
        )
        probe = _probe_figure(browser, figure_id)
    require(_string(probe, "figureId") == figure_id, "Wrong Figure")
    require(
        _string(probe, "size") == expected_size,
        f"Wrong Figure size: {figure_id}",
    )
    require(_string(probe, "caption") != "", "Caption missing")
    require(
        probe.get("implementationTermHits") == [],
        f"Learn implementation detail exposed: {figure_id}: {probe}",
    )
    expected_preferred = EXPECTED_PREFERRED_WIDTHS[figure_id]
    require(
        _number(probe, "preferredWidth") == expected_preferred,
        f"Wrong Figure preferred width: {figure_id}: {probe}",
    )
    require(
        _number(probe, "graphicWidth") <= expected_preferred + 1,
        f"Figure stretched past preferred width: {figure_id}: {probe}",
    )
    require(
        _number(probe, "graphicWidth") <= _number(probe, "width") + 1,
        f"Figure exceeded available width: {figure_id}: {probe}",
    )
    require(
        _number(probe, "graphicLeft") >= -1
        and _number(probe, "graphicRight")
        <= _number(probe, "width") + _number(probe, "left") + 1,
        f"Figure graphic escaped wrapper: {figure_id}: {probe}",
    )
    require(_integer(probe, "triggerCount") == 0, "Learn overlay trigger found")
    require(_integer(probe, "viewerControlCount") == 0, "Learn viewer control found")
    require(not _boolean(probe, "dialogOpen"), "Learn dialog opened")
    require(_boolean(probe, "articleContains"), "Figure is outside article")
    require(_boolean(probe, "insideArticle"), "Figure exceeds article shell")
    require(_boolean(probe, "visible"), "Figure has no visible geometry")
    require(
        _string(probe, "visualMode") != "blank",
        f"Figure content is blank: {figure_id}: {probe}",
    )
    require(_integer(probe, "overflow") == 0, "Horizontal overflow")
    require(
        _integer(probe, "localOverflow") == 0,
        f"Local Figure overflow: {figure_id}: {probe}",
    )
    return probe


def _capture_part_zero(
    browser: ChromeSession,
    screenshots: Path,
    shots: dict[str, str],
) -> list[JsonObject]:
    evidence: list[JsonObject] = []
    expected_sizes = {
        "decoder.diagram.intro.nlp": "full",
        "decoder.diagram.tokenization.token": "wide",
        "decoder.diagram.tokenization.vocabulary": "wide",
        "decoder.diagram.tokenization.methods": "wide",
    }
    for slug, figure_id, filename in INLINE_FIGURES:
        _open_chapter(browser, slug)
        _wait_for_article(browser)
        _wait_for_figure(browser, figure_id)
        if slug == "0-1":
            _evaluate(
                browser,
                """document.querySelector(
                  '[data-narrative-layout="golden"] '
                  + '.visual-narrative__visual',
                )?.scrollIntoView({
                  block: 'center',
                  inline: 'nearest',
                })""",
            )
        else:
            _scroll_figure(browser, figure_id)
        evidence.append(
            _assert_inline_figure(browser, figure_id, expected_sizes[figure_id]),
        )
        shots[f"inline-{slug}"] = capture(browser, screenshots / filename)
        required_filename = {
            "0-3": "02-learn-vocabulary-1440.png",
            "0-4": "03-learn-tokenization-1440.png",
        }.get(slug)
        if required_filename is not None:
            shots[f"required-{slug}"] = capture(
                browser,
                screenshots / required_filename,
            )
    return evidence


def _capture_gpt(
    browser: ChromeSession,
    screenshots: Path,
    shots: dict[str, str],
) -> JsonObject:
    _open_chapter(browser, "3-1")
    _wait_for_article(browser)
    _wait_for_figure(browser, "root")
    _scroll_figure(browser, "root")
    probe = _assert_inline_figure(browser, "root", "full")
    require(_integer(probe, "buttonCount") == 6, "GPT scene controls changed")
    require(_string(probe, "visualMode") == "scene", "Desktop GPT scene hidden")
    require(
        not _boolean(probe, "mobileFlowVisible"),
        "Desktop GPT static fallback visible",
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
    _scroll_figure(browser, "decoder.diagram.tokenization.token")
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

    _open_chapter(browser, "3-1")
    _wait_for_article(browser)
    _wait_for_figure(browser, "root")
    _scroll_figure(browser, "root")
    responsive.append(_assert_inline_figure(browser, "root", "full"))
    shots["inline-gpt-1366"] = capture(
        browser,
        screenshots / "learn-gpt-inline-1366x768.png",
    )

    set_viewport(browser, 1024, 768)
    _open_chapter(browser, "3-1")
    _wait_for_article(browser)
    _wait_for_figure(browser, "root")
    _scroll_figure(browser, "root")
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
        if slug == "0-3":
            shots["required-vocabulary-mobile"] = capture(
                browser,
                screenshots / "08-learn-vocabulary-390.png",
            )

    _open_chapter(browser, "3-1")
    _wait_for_article(browser)
    _wait_for_figure(browser, "root")
    _scroll_figure(browser, "root")
    gpt = _assert_inline_figure(browser, "root", "full")
    mobile_scene = evaluate_dict(
            browser,
            """
            (() => {
              const figure = document.querySelector('[data-figure-id="root"]');
              const canvas = figure?.querySelector('.scene-figure canvas');
              const labels = Array.from(
                figure?.querySelectorAll('.scene-stage-label') ?? [],
              );
              const fallback = figure?.querySelector(
                '.decoder-learning-architecture',
              );
              const visible = (element) => {
                if (!(element instanceof Element)) return false;
                const rect = element.getBoundingClientRect();
                const style = getComputedStyle(element);
                return rect.width > 1 && rect.height > 1
                  && style.display !== 'none'
                  && style.visibility !== 'hidden';
              };
              return {
                canvasVisible: visible(canvas),
                fallbackVisible: visible(fallback),
                stages: labels.length,
                labels: labels.map((item) => item.textContent?.trim() ?? ''),
              };
            })()
            """,
    )
    require(_boolean(mobile_scene, "canvasVisible"), "Mobile GPT scene hidden")
    require(_integer(mobile_scene, "stages") == 8, "Mobile GPT stage count")
    require(
        mobile_scene.get("labels")
        == [
            "Input Context",
            "Token lookup",
            "Learned position lookup",
            "X₀ · element-wise add",
            "Block stack × 2",
            "Final Norm · Head · Logits",
            "Selected Token",
            "Updated Context",
        ],
        f"Mobile GPT stage order: {mobile_scene}",
    )
    require(
        not _boolean(mobile_scene, "fallbackVisible"),
        "Static GPT fallback remained visible on mobile",
    )
    controls_390 = _assert_step_controls(browser, "root", mobile=True)
    responsive.append(
        {
            **gpt,
            "controlLayout": controls_390,
            "mobileStages": mobile_scene["stages"],
        },
    )
    shots["inline-gpt-mobile"] = capture(
        browser,
        screenshots / "learn-gpt-inline-mobile-390x844.png",
    )
    _evaluate(
        browser,
        """
        document.querySelector('[data-figure-id="root"] .scene-step-rail')
          ?.scrollIntoView({ block: 'center' })
        """,
    )
    shots["gpt-controls-mobile-390"] = capture(
        browser,
        screenshots / "learn-gpt-controls-mobile-390x844.png",
    )

    set_viewport(browser, 320, 568)
    _open_chapter(browser, "3-1")
    _wait_for_article(browser)
    _wait_for_figure(browser, "root")
    _scroll_figure(browser, "root")
    gpt_320 = _assert_inline_figure(browser, "root", "full")
    responsive.append(
        {
            **gpt_320,
            "controlLayout": _assert_step_controls(
                browser,
                "root",
                mobile=True,
            ),
        },
    )
    _evaluate(
        browser,
        """
        document.querySelector('[data-figure-id="root"] .scene-step-rail')
          ?.scrollIntoView({ block: 'center' })
        """,
    )
    shots["gpt-controls-mobile-320"] = capture(
        browser,
        screenshots / "learn-gpt-controls-mobile-320x568.png",
    )
    return responsive


def _verify_learn_matrix(browser: ChromeSession) -> list[JsonObject]:
    evidence: list[JsonObject] = []
    for width, height in (
        (1440, 900),
        (1366, 768),
        (1024, 768),
        (768, 1024),
        (390, 844),
        (320, 568),
    ):
        set_viewport(browser, width, height)
        for slug, figure_id, expected_size in ALL_LEARNING_FIGURES:
            _open_chapter(browser, slug)
            _wait_for_article(browser)
            _wait_for_figure(browser, figure_id)
            probe = _assert_inline_figure(
                browser,
                figure_id,
                expected_size,
            )
            controls = (
                _assert_step_controls(
                    browser,
                    figure_id,
                    mobile=width <= 390,
                )
                if figure_id == "root"
                else None
            )
            evidence.append(
                {
                    "width": width,
                    "height": height,
                    "figureId": figure_id,
                    "figureWidth": probe["width"],
                    "graphicWidth": probe["graphicWidth"],
                    "preferredWidth": probe["preferredWidth"],
                    "controls": controls,
                },
            )
    return evidence


def _capture_navigation(
    browser: ChromeSession,
    screenshots: Path,
    shots: dict[str, str],
) -> JsonObject:
    set_viewport(browser, 1440, 900)

    _open_chapter(browser, "0-2")
    _wait_for_figure(browser, "decoder.diagram.tokenization.token")
    _scroll_figure(browser, "decoder.diagram.tokenization.token")
    _assert_inline_figure(
        browser,
        "decoder.diagram.tokenization.token",
        "wide",
    )
    before_next = _scroll_to_bottom(browser, 1001)
    shots["navigation-0-2-bottom"] = capture(
        browser,
        screenshots / "navigation-0-2-bottom-before-next-1440x900.png",
    )
    pointer_click(
        browser,
        'document.querySelector(\'a[aria-label="다음: Vocabulary와 Token ID"]\')',
        condition=(
            "Boolean(document.querySelector("
            "'[data-curriculum-chapter-id=\"decoder.chapter.0.3\"]'"
            "))"
        ),
        label="Next Chapter 0.3",
    )
    after_next = _wait_for_chapter_top(browser, "decoder.chapter.0.3")
    _wait_for_figure(browser, "decoder.diagram.tokenization.vocabulary")
    _scroll_figure(browser, "decoder.diagram.tokenization.vocabulary")
    _assert_inline_figure(
        browser,
        "decoder.diagram.tokenization.vocabulary",
        "wide",
    )
    require(
        _string(after_next, "activeId") == "curriculum-chapter-title",
        f"Next Chapter H1 not focused: {after_next}",
    )
    shots["navigation-0-3-after-next"] = capture(
        browser,
        screenshots / "navigation-0-3-after-next-1440x900.png",
    )

    before_previous = _scroll_to_bottom(browser)
    pointer_click(
        browser,
        'document.querySelector(\'a[aria-label="이전: Token이란?"]\')',
        condition=(
            "Boolean(document.querySelector("
            "'[data-curriculum-chapter-id=\"decoder.chapter.0.2\"]'"
            "))"
        ),
        label="Previous Chapter 0.2",
    )
    after_previous = _wait_for_chapter_top(browser, "decoder.chapter.0.2")

    _open_chapter(browser, "0-4")
    _wait_for_figure(browser, "decoder.diagram.tokenization.methods")
    _scroll_figure(browser, "decoder.diagram.tokenization.methods")
    _assert_inline_figure(
        browser,
        "decoder.diagram.tokenization.methods",
        "wide",
    )
    before_toc = _scroll_to_bottom(browser)
    pointer_click(
        browser,
        'document.querySelector(\'button[aria-label="목차 열기"]\')',
        condition="Boolean(document.querySelector('#curriculum-toc'))",
        label="Open Chapter ToC",
    )
    pointer_click(
        browser,
        (
            "document.querySelector("
            "'#curriculum-toc a[aria-label=\"다음 Token 예측\"]'"
            ")"
        ),
        condition=(
            "Boolean(document.querySelector("
            "'[data-curriculum-chapter-id=\"decoder.chapter.1.2\"]'"
            "))"
        ),
        label="ToC Chapter 1.2",
    )
    after_toc = _wait_for_chapter_top(browser, "decoder.chapter.1.2")

    _open_chapter(browser, "3-1")
    _wait_for_figure(browser, "root")
    _scroll_figure(browser, "root")
    _assert_inline_figure(browser, "root", "full")
    before_figure_link = _scroll_to_bottom(browser)
    figure_link_hit = evaluate_dict(
        browser,
        """
        (() => {
          const link = document.querySelector(
            'a[aria-label="Transformer Block 설명으로 이동"]',
          );
          if (!(link instanceof HTMLAnchorElement)) {
            return { hit: false, href: '', target: '' };
          }
          link.scrollIntoView({ block: 'center', inline: 'nearest' });
          const rect = link.getBoundingClientRect();
          const target = document.elementFromPoint(
            rect.left + rect.width / 2,
            rect.top + rect.height / 2,
          );
          return {
            hit: target === link || link.contains(target),
            href: link.getAttribute('href') ?? '',
            target:
              target instanceof Element
                ? `${target.tagName}.${target.className}`
                : '',
          };
        })()
        """,
    )
    require(
        _boolean(figure_link_hit, "hit"),
        f"GPT Figure link is obscured: {figure_link_hit}",
    )
    pointer_click(
        browser,
        (
            "document.querySelector("
            "'a[aria-label=\"Transformer Block 설명으로 이동\"]'"
            ")"
        ),
        condition=(
            "Boolean(document.querySelector("
            "'[data-curriculum-chapter-id=\"decoder.chapter.4.1\"]'"
            "))"
        ),
        label="GPT Figure Chapter link",
    )
    after_figure_link = _wait_for_chapter_top(
        browser,
        "decoder.chapter.4.1",
    )
    require(
        _string(after_figure_link, "activeSection") == "block-overview",
        f"Block Chapter focus target missing: {after_figure_link}",
    )

    _open_chapter(browser, "0-2")
    _wait_for_figure(browser, "decoder.diagram.tokenization.token")
    _scroll_figure(browser, "decoder.diagram.tokenization.token")
    _assert_inline_figure(
        browser,
        "decoder.diagram.tokenization.token",
        "wide",
    )
    before_back = _scroll_to_bottom(browser, 1001)
    pointer_click(
        browser,
        'document.querySelector(\'a[aria-label="다음: Vocabulary와 Token ID"]\')',
        condition=(
            "Boolean(document.querySelector("
            "'[data-curriculum-chapter-id=\"decoder.chapter.0.3\"]'"
            "))"
        ),
        label="Next before Back",
    )
    _wait_for_chapter_top(browser, "decoder.chapter.0.3")
    _evaluate(browser, "history.back()")
    after_back = _wait_for_chapter_top(browser, "decoder.chapter.0.2")
    _evaluate(browser, "history.forward()")
    after_forward = _wait_for_chapter_top(browser, "decoder.chapter.0.3")

    _open_chapter(browser, "0-2")
    _evaluate(browser, "window.scrollTo({ top: 600, left: 0, behavior: 'auto' })")
    wait_for(browser, "scrollY === 600", "Same Chapter baseline scroll")
    _evaluate(
        browser,
        """
        (() => {
          window.__chapterScrollToCalls = [];
          window.__chapterOriginalScrollTo = window.scrollTo;
          window.scrollTo = (...args) => {
            window.__chapterScrollToCalls.push(args);
            return window.__chapterOriginalScrollTo(...args);
          };
        })()
        """,
    )
    clicked_same_chapter = _evaluate(
        browser,
        """
        (() => {
          const button = document.querySelector(
            'button[aria-label="목차 열기"]',
          );
          if (!(button instanceof HTMLButtonElement)) return false;
          button.dispatchEvent(new MouseEvent('click', { bubbles: true }));
          return true;
        })()
        """,
    )
    require(
        clicked_same_chapter is True,
        "Same Chapter ToC control missing",
    )
    wait_for(
        browser,
        "Boolean(document.querySelector('#curriculum-toc'))",
        "Same Chapter ToC state",
    )
    same_chapter = evaluate_dict(
        browser,
        """(() => {
          const result = {
            scrollY: Math.round(scrollY),
            scrollToCalls: window.__chapterScrollToCalls?.length ?? -1,
          };
          window.scrollTo = window.__chapterOriginalScrollTo;
          delete window.__chapterOriginalScrollTo;
          delete window.__chapterScrollToCalls;
          return result;
        })()""",
    )
    require(
        _integer(same_chapter, "scrollY") > 0
        and _integer(same_chapter, "scrollToCalls") == 0,
        f"Same Chapter state reset scroll: {same_chapter}",
    )

    direct_url = _evaluate(
        browser,
        (
            "location.origin + location.pathname "
            "+ '#/learn/decoder-only-fundamentals/0-3'"
        ),
    )
    if not isinstance(direct_url, str):
        raise TypeError(f"Direct Chapter URL must be a string: {direct_url!r}")
    browser.navigate(direct_url)
    after_direct = _wait_for_chapter_top(browser, "decoder.chapter.0.3")

    return {
        "next": {"before": before_next, "after": after_next},
        "previous": {"before": before_previous, "after": after_previous},
        "toc": {"before": before_toc, "after": after_toc},
        "figureChapterLink": {
            "before": before_figure_link,
            "hit": figure_link_hit,
            "after": after_figure_link,
        },
        "back": {"before": before_back, "after": after_back},
        "forward": after_forward,
        "sameChapter": same_chapter,
        "direct": after_direct,
    }


def capture_learning_phase(
    browser: ChromeSession,
    screenshots: Path,
    evidence: JsonObject,
    shots: dict[str, str],
) -> None:
    set_viewport(browser, 1440, 900)
    _go_learning_home(browser)
    course_home_desktop = _course_home_geometry(browser)
    shots["courseHomeDesktop"] = capture(
        browser,
        screenshots / "course-home-1440x900.png",
    )
    shots["requiredHomeDesktop"] = capture(
        browser,
        screenshots / "01-home-1440.png",
    )

    product_responsive = _verify_product_responsive(
        browser,
        screenshots,
        shots,
    )
    require(
        not browser_errors(browser)["runtime"],
        "Runtime error during product responsive checks",
    )
    part_zero = _capture_part_zero(browser, screenshots, shots)
    require(
        not browser_errors(browser)["runtime"],
        "Runtime error during Part 0 capture",
    )
    gpt = _capture_gpt(browser, screenshots, shots)
    require(
        not browser_errors(browser)["runtime"],
        "Runtime error during GPT capture",
    )
    responsive = _capture_responsive(browser, screenshots, shots)
    require(
        not browser_errors(browser)["runtime"],
        "Runtime error during Learn responsive capture",
    )
    viewport_matrix = _verify_learn_matrix(browser)
    require(
        not browser_errors(browser)["runtime"],
        "Runtime error during Learn viewport matrix",
    )
    navigation = _capture_navigation(browser, screenshots, shots)
    observed_triggers = max(
        _integer(probe, "triggerCount")
        for probe in [*part_zero, gpt, *responsive]
    )

    set_viewport(browser, 390, 844)
    _go_learning_home(browser)
    course_home_mobile = _course_home_geometry(browser)
    shots["courseHomeMobile"] = capture(
        browser,
        screenshots / "course-home-390x844.png",
    )
    shots["requiredHomeMobile"] = capture(
        browser,
        screenshots / "07-home-390.png",
    )
    learn_requests = request_urls(browser)
    webgl_requests = [
        url for url in learn_requests if "ScoreMatrixScene" in url
    ]
    canvas_count = _integer(
        evaluate_dict(
            browser,
            "({ canvasCount: document.querySelectorAll('canvas').length })",
        ),
        "canvasCount",
    )
    require(webgl_requests == [], f"Learn loaded WebGL chunk: {webgl_requests}")
    require(canvas_count == 0, f"Learn mounted canvas: {canvas_count}")
    evidence["learning"] = {
        "product": "article-inline-figure",
        "courseHome": {
            "desktop": course_home_desktop,
            "mobile": course_home_mobile,
        },
        "productResponsive": product_responsive,
        "partZero": part_zero,
        "gpt": gpt,
        "responsive": responsive,
        "viewportMatrix": viewport_matrix,
        "navigation": navigation,
        "learnOverlayTriggers": observed_triggers,
        "webglRequests": webgl_requests,
        "canvasCount": canvas_count,
    }
