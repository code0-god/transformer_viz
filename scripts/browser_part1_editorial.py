"""Production-browser contract for Part 1 editorial content and Figures."""

from __future__ import annotations

import argparse
import json
from pathlib import Path

from browser_hybrid_capture import capture
from browser_hybrid_contract import number, require, set_viewport
from browser_hybrid_helpers import (
    JsonObject,
    evaluate_dict,
    navigate_hash,
    pointer_click,
    settle,
    wait_for,
)
from browser_hybrid_visualization import _close_viewer, _open_score_viewer
from browser_lab_viewer_structure import _go_lab, _prepare_runtime
from browser_learning_workspace_probes import INSTRUMENT_LEARNING_WORKSPACE
from browser_probes import READY_PROBE
from browser_session import ChromeSession

CHAPTERS = (
    (
        "1-1",
        "언어 모델이란?",
        "decoder.diagram.language-model.definition",
        0,
        "01-language-model-1440.png",
        "05-language-model-390.png",
    ),
    (
        "1-2",
        "다음 Token 예측",
        "decoder.diagram.language-model.next-token",
        1,
        "02-next-token-1440.png",
        "06-next-token-390.png",
    ),
    (
        "1-3",
        "조건부 확률",
        "decoder.diagram.language-model.conditional-probability",
        2,
        "03-conditional-probability-1440.png",
        "07-conditional-probability-390.png",
    ),
    (
        "1-4",
        "Autoregressive Generation",
        "decoder.diagram.language-model.autoregressive",
        0,
        "04-autoregressive-1440.png",
        "08-autoregressive-390.png",
    ),
)
VIEWPORTS = ((1440, 900), (1366, 768), (1024, 768), (390, 844))


def _go_chapter(browser: ChromeSession, slug: str) -> None:
    chapter_id = f"decoder.chapter.{slug.replace('-', '.')}"
    navigate_hash(
        browser,
        f"#/learn/decoder-only-fundamentals/{slug}",
        (
            "document.querySelector("
            + json.dumps(f'[data-curriculum-chapter-id="{chapter_id}"]')
            + ") !== null"
        ),
        f"Chapter {slug}",
    )
    wait_for(browser, "scrollY === 0", f"Chapter {slug} top")


def _chapter_probe(
    browser: ChromeSession,
    title: str,
    figure_id: str,
    formula_count: int,
    mobile: bool,
) -> JsonObject:
    wait_for(
        browser,
        (
            "document.querySelector("
            + json.dumps(f'[data-figure-id="{figure_id}"]')
            + ") !== null"
        ),
        f"Figure {figure_id}",
    )
    browser.require_cdp().evaluate(
        browser.page_session,
        """document.querySelector(%s)?.querySelector('svg')?.scrollIntoView({
          block: 'center',
          behavior: 'auto',
        })"""
        % json.dumps(f'[data-figure-id="{figure_id}"]'),
        True,
    )
    settle(browser)
    probe = evaluate_dict(
        browser,
        f"""(() => {{
          const article = document.querySelector(
            '[data-guide-page-id^="decoder.curriculum.guide.1."]',
          );
          const title = document.querySelector('#curriculum-chapter-title');
          const titleRect = title?.getBoundingClientRect();
          const figure = document.querySelector(
            {json.dumps(f'[data-figure-id="{figure_id}"]')},
          );
          const figureRect = figure?.getBoundingClientRect();
          const graphic = figure?.querySelector('.learning-figure__graphic');
          const graphicRect = graphic?.getBoundingClientRect();
          const svg = figure?.querySelector('svg[role="img"]');
          const viewBox = svg?.viewBox.baseVal;
          const clippedText = svg ? [...svg.querySelectorAll('text')].flatMap(
            (node) => {{
              const box = node.getBBox();
              const clipped =
                box.x < -1
                || box.y < -1
                || box.x + box.width > (viewBox?.width ?? 0) + 1
                || box.y + box.height > (viewBox?.height ?? 0) + 1;
              return clipped ? [node.textContent?.trim() ?? ''] : [];
            }},
          ) : ['missing SVG'];
          return {{
            title: title?.textContent?.trim() ?? '',
            titleLeft: titleRect?.left ?? -1,
            titleRight: titleRect?.right ?? -1,
            titleWidth: titleRect?.width ?? -1,
            clientWidth: document.documentElement.clientWidth,
            figureCount: article?.querySelectorAll(':scope figure').length ?? -1,
            svgCount: figure?.querySelectorAll('svg[role="img"]').length ?? -1,
            canvasCount: article?.querySelectorAll('canvas').length ?? -1,
            figureWidth: figureRect?.width ?? -1,
            graphicWidth: graphicRect?.width ?? -1,
            preferredWidth: Number(
              figure?.getAttribute('data-figure-preferred-width') ?? -1,
            ),
            layout: svg?.getAttribute('data-figure-layout') ?? '',
            question: svg?.getAttribute('data-figure-question') ?? '',
            viewBoxWidth: viewBox?.width ?? -1,
            clippedText,
            caption: figure?.querySelector(':scope > figcaption')
              ?.textContent?.trim() ?? '',
            formulaCount:
              article?.querySelectorAll('.learning-guide-formula').length ?? -1,
            mathmlCount:
              article?.querySelectorAll('.katex-mathml').length ?? -1,
            headingCount:
              document.querySelectorAll('#curriculum-chapter-title').length,
            sectionHeadingCount: article?.querySelectorAll('h2').length ?? -1,
            bodyText: article?.textContent ?? '',
            overflow:
              document.documentElement.scrollWidth
              - document.documentElement.clientWidth,
          }};
        }})()""",
    )
    require(
        probe["title"] == title
        and number(probe["titleLeft"], "Title left") >= 0
        and number(probe["titleRight"], "Title right")
        <= number(probe["clientWidth"], "Client width") + 1,
        f"Chapter title geometry failed: {probe}",
    )
    require(
        probe["figureCount"] == 1
        and probe["svgCount"] == 1
        and probe["canvasCount"] == 0
        and probe["headingCount"] == 1
        and number(probe["sectionHeadingCount"], "Section heading count") >= 2
        and probe["formulaCount"] == formula_count,
        f"Chapter semantic surface failed: {probe}",
    )
    require(
        probe["mathmlCount"] == formula_count,
        f"KaTeX MathML contract failed: {probe}",
    )
    require(
        number(probe["graphicWidth"], "Graphic width")
        <= number(probe["preferredWidth"], "Preferred width") + 1
        and number(probe["graphicWidth"], "Graphic width")
        <= number(probe["figureWidth"], "Figure width") + 1
        and probe["overflow"] == 0
        and probe["clippedText"] == []
        and str(probe["question"]).strip() != ""
        and str(probe["caption"]).endswith("."),
        f"Figure geometry failed: {probe}",
    )
    require(
        probe["layout"] == ("mobile" if mobile else "desktop")
        and (
            number(probe["viewBoxWidth"], "Mobile viewBox width") <= 400
            if mobile
            else number(probe["viewBoxWidth"], "Desktop viewBox width") > 400
        ),
        f"Figure did not recompose: {probe}",
    )
    return probe


def _position_figure_for_capture(
    browser: ChromeSession,
    figure_id: str,
) -> None:
    selector = json.dumps(f'[data-figure-id="{figure_id}"] svg')
    browser.require_cdp().evaluate(
        browser.page_session,
        f"""(() => {{
          const svg = document.querySelector({selector});
          if (!(svg instanceof SVGElement)) throw new Error('Figure SVG missing');
          const rect = svg.getBoundingClientRect();
          window.scrollTo({{
            top: scrollY + rect.top - 112,
            left: 0,
            behavior: 'auto',
          }});
        }})()""",
        True,
    )
    settle(browser)
    position = evaluate_dict(
        browser,
        f"""(() => {{
          const rect = document.querySelector({selector})?.getBoundingClientRect();
          return {{
            top: rect?.top ?? -1,
            bottom: rect?.bottom ?? -1,
            viewportHeight: innerHeight,
            scrollY,
          }};
        }})()""",
    )
    require(
        number(position["top"], "Figure screenshot top")
        < number(position["viewportHeight"], "Viewport height")
        and number(position["bottom"], "Figure screenshot bottom") > 0,
        f"Figure {figure_id} is outside screenshot viewport: {position}",
    )


def _content_invariants(evidence: JsonObject) -> None:
    chapters = evidence["chapters"]
    require(isinstance(chapters, list), "Chapter evidence missing")
    by_slug = {
        item["slug"]: item
        for item in chapters
        if isinstance(item, dict) and item.get("width") == 1440
    }
    definition = str(by_slug["1-1"]["probe"]["bodyText"])
    next_token = str(by_slug["1-2"]["probe"]["bodyText"])
    conditional = str(by_slug["1-3"]["probe"]["bodyText"])
    autoregressive = str(by_slug["1-4"]["probe"]["bodyText"])
    require(
        all(term not in definition for term in ("Softmax", "LM head", "[T,Vocab]")),
        "Chapter 1.1 leaks next-step internals",
    )
    require(
        all(
            term not in next_token
            for term in ("inspection", "retained-set", "transport", "fixture")
        ),
        "Chapter 1.2 leaks instrumentation language",
    )
    require(
        "‘|’" in conditional
        and "나눗셈" in conditional
        and "w_{<t}" in conditional,
        "Chapter 1.3 notation explanation missing",
    )
    require(
        "KV cache" in autoregressive
        and "현재 nanoGPT Edu" in autoregressive
        and "Replacement" not in autoregressive,
        "Chapter 1.4 current-model scope failed",
    )


def _scroll_reset_workflow(browser: ChromeSession, screenshots: Path) -> JsonObject:
    def _scroll_down() -> None:
        browser.require_cdp().evaluate(
            browser.page_session,
            "window.scrollTo({ top: document.body.scrollHeight, behavior: 'auto' })",
            True,
        )
        wait_for(browser, "scrollY > 0", "Chapter scrolled")

    navigate_hash(
        browser,
        "#/",
        "document.querySelector('.course-home') !== null",
        "Course Home",
    )
    home_link = evaluate_dict(
        browser,
        """(() => {
          const link = document.querySelector('.course-home__step-link');
          return {
            text: link?.textContent?.trim() ?? '',
            href: link?.getAttribute('href') ?? '',
          };
        })()""",
    )
    require(
        home_link
        == {
            "text": "언어 모델",
            "href": "#/learn/decoder-only-fundamentals/1-1",
        },
        f"Course Home Part 1 link failed: {home_link}",
    )
    browser.require_cdp().evaluate(
        browser.page_session,
        "document.querySelector('.course-home__step-link')?.click()",
        True,
    )
    wait_for(
        browser,
        "document.querySelector('[data-curriculum-chapter-id=\"decoder.chapter.1.1\"]') !== null",
        "Course Home to Part 1",
    )
    wait_for(browser, "scrollY === 0", "Course Home Part 1 top")
    _scroll_down()
    footer_count = browser.require_cdp().evaluate(
        browser.page_session,
        "document.querySelectorAll('.curriculum-chapter-footer').length",
        True,
    )
    require(
        footer_count == 0,
        f"Part 1 retained the removed footer bar: {footer_count}",
    )
    _go_chapter(browser, "1-2")
    wait_for(browser, "scrollY === 0", "Part 1 Next top")

    _scroll_down()
    _go_chapter(browser, "1-1")
    wait_for(browser, "scrollY === 0", "Part 1 Previous top")

    _scroll_down()
    browser.require_cdp().evaluate(
        browser.page_session,
        "document.querySelector('.curriculum-navigation__opener')?.click()",
        True,
    )
    wait_for(
        browser,
        "document.querySelector('#curriculum-toc') !== null",
        "Curriculum ToC",
    )
    browser.require_cdp().evaluate(
        browser.page_session,
        """[...document.querySelectorAll('#curriculum-toc a')].find(
          (link) => link.textContent?.trim() === '조건부 확률',
        )?.click()""",
        True,
    )
    wait_for(
        browser,
        "document.querySelector('[data-curriculum-chapter-id=\"decoder.chapter.1.3\"]') !== null",
        "Part 1 ToC",
    )
    wait_for(browser, "scrollY === 0", "Part 1 ToC top")

    _go_chapter(browser, "1-4")
    _scroll_down()
    _go_chapter(browser, "2-1")
    wait_for(browser, "scrollY === 0", "Part 2 top")
    capture(browser, screenshots / "09-part1-to-part2-navigation.png")
    final_navigation = evaluate_dict(
        browser,
        """({
          chapter: document.querySelector(
            '[data-curriculum-chapter-id]',
          )?.getAttribute('data-curriculum-chapter-id') ?? '',
          title: document.querySelector('#curriculum-chapter-title')
            ?.textContent?.trim() ?? '',
          scrollY,
        })""",
    )
    return {"homeLink": home_link, "part2": final_navigation}


def _lab_regression(browser: ChromeSession, screenshots: Path) -> JsonObject:
    set_viewport(browser, 1440, 900)
    _go_lab(browser)
    runtime = _prepare_runtime(browser)
    _open_score_viewer(browser)
    pointer_click(
        browser,
        """Array.from(
          document.querySelectorAll('#focused-viewer button'),
        ).find((button) => button.textContent?.includes('Score 불러오기'))""",
        condition=(
            "window.__learningWorkerResponses.some("
            "item => item?.type === 'attention_head_trace')"
        ),
        label="Part 1 Score Matrix trace response",
    )
    wait_for(
        browser,
        "document.querySelector('.score-matrix-canvas canvas')"
        "?.dataset.renderState === 'ready'",
        "Score Matrix ready",
    )
    settle(browser)
    renderer = evaluate_dict(
        browser,
        """({
          canvas: document.querySelector(
            '.score-matrix-canvas canvas',
          ) !== null,
          ready:
            document.querySelector('.score-matrix-canvas canvas')
            ?.dataset.renderState === 'ready',
        })""",
    )
    require(
        renderer == {"canvas": True, "ready": True},
        f"Score Matrix renderer regression: {renderer}",
    )
    capture(browser, screenshots / "10-lab-regression.png")
    _close_viewer(browser)
    require(
        evaluate_dict(
            browser,
            """({
              dialogCount: document.querySelectorAll('[role="dialog"]').length,
              canvasCount: document.querySelectorAll('canvas').length,
              overflow:
                document.documentElement.scrollWidth
                - document.documentElement.clientWidth,
            })""",
        )
        == {"dialogCount": 0, "canvasCount": 0, "overflow": 0},
        "Lab viewer did not close cleanly",
    )
    return {"runtime": runtime, "renderer": renderer}


def run_contract(url: str, screenshots: Path, evidence_path: Path) -> None:
    evidence: JsonObject = {"chapters": []}
    with ChromeSession(enable_gpu=True) as browser:
        cdp = browser.require_cdp()
        cdp.send(
            "Page.addScriptToEvaluateOnNewDocument",
            {"source": INSTRUMENT_LEARNING_WORKSPACE},
            browser.page_session,
        )
        browser.navigate(url)
        cdp.evaluate(browser.page_session, READY_PROBE, True)
        wait_for(
            browser,
            "document.querySelector('.architecture-app') !== null",
            "Application shell",
        )
        wait_for(
            browser,
            "['ready', 'complete'].includes("
            "document.querySelector('[data-threeui-status]')"
            "?.getAttribute('data-threeui-status') ?? '')",
            "Model ready",
        )

        for width, height in VIEWPORTS:
            set_viewport(browser, width, height)
            for (
                slug,
                title,
                figure_id,
                formula_count,
                desktop_name,
                mobile_name,
            ) in CHAPTERS:
                _go_chapter(browser, slug)
                probe = _chapter_probe(
                    browser,
                    title,
                    figure_id,
                    formula_count,
                    mobile=width == 390,
                )
                evidence["chapters"].append(
                    {"width": width, "height": height, "slug": slug, "probe": probe}
                )
                if width == 1440:
                    _position_figure_for_capture(browser, figure_id)
                    capture(browser, screenshots / desktop_name)
                elif width == 390:
                    _position_figure_for_capture(browser, figure_id)
                    capture(browser, screenshots / mobile_name)

        _content_invariants(evidence)
        set_viewport(browser, 1440, 900)
        evidence["navigation"] = _scroll_reset_workflow(browser, screenshots)
        evidence["lab"] = _lab_regression(browser, screenshots)

    evidence_path.parent.mkdir(parents=True, exist_ok=True)
    evidence_path.write_text(
        json.dumps(evidence, ensure_ascii=False, indent=2) + "\n",
    )
    print("Part 1 editorial browser contract: PASS (4 viewports, 10 screenshots)")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--url", default="http://127.0.0.1:5173/")
    parser.add_argument(
        "--screenshots",
        type=Path,
        default=Path(".omo/evidence/part1-pass/final"),
    )
    parser.add_argument(
        "--evidence",
        type=Path,
        default=Path(".omo/evidence/part1-pass/final-browser.json"),
    )
    args = parser.parse_args()
    run_contract(args.url, args.screenshots, args.evidence)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
