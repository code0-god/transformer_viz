"""Production-browser contract for Home and Part 0 editorial composition."""

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
    settle,
    wait_for,
)
from browser_session import ChromeSession

CHAPTERS = (
    ("0-1", "decoder.diagram.intro.nlp", "part0-01"),
    ("0-2", "decoder.diagram.tokenization.token", "part0-02"),
    ("0-3", "decoder.diagram.tokenization.vocabulary", "part0-03"),
    ("0-4", "decoder.diagram.tokenization.methods", "part0-04"),
)


def _go_home(browser: ChromeSession) -> None:
    navigate_hash(
        browser,
        "#/",
        "document.querySelector('.course-home') !== null",
        "Course Home",
    )
    browser.require_cdp().evaluate(
        browser.page_session,
        "window.scrollTo({ top: 0, left: 0, behavior: 'auto' })",
        True,
    )
    wait_for(browser, "scrollY === 0", "Course Home top")


def _go_chapter(browser: ChromeSession, slug: str) -> None:
    chapter_id = f"decoder.chapter.{slug.replace('-', '.')}"
    navigate_hash(
        browser,
        f"#/learn/decoder-only-fundamentals/{slug}",
        (
            "document.querySelector("
            + json.dumps(
                f'[data-curriculum-chapter-id="{chapter_id}"]',
            )
            + ") !== null"
        ),
        f"Chapter {slug}",
    )


def _home_probe(browser: ChromeSession, desktop: bool) -> JsonObject:
    probe = evaluate_dict(
        browser,
        """(() => {
          const title = document.querySelector('#course-home-title');
          const words = [...document.querySelectorAll('[data-home-title-word]')]
            .map((word) => {
              const rect = word.getBoundingClientRect();
              return {
                text: word.textContent?.trim() ?? '',
                top: rect.top,
                right: rect.right,
                bottom: rect.bottom,
                height: rect.height,
                lineHeight: Number.parseFloat(getComputedStyle(word).lineHeight),
              };
            });
          const intro = document.querySelector('.course-home__intro')
            ?.getBoundingClientRect();
          const course = document.querySelector('.course-home__course')
            ?.getBoundingClientRect();
          const courseStyle = document.querySelector('.course-home__course')
            ? getComputedStyle(document.querySelector('.course-home__course'))
            : null;
          const boundary = document.querySelector(
            '[data-boundary-id="home-final"]',
          )?.getBoundingClientRect();
          return {
            words,
            introTop: intro?.top ?? -1,
            introBottom: intro?.bottom ?? -1,
            courseTop: course?.top ?? -1,
            courseBottom: course?.bottom ?? -1,
            courseRadius: courseStyle?.borderRadius ?? '',
            courseShadow: courseStyle?.boxShadow ?? '',
            boundaryTop: boundary?.top ?? -1,
            overflow:
              document.documentElement.scrollWidth
              - document.documentElement.clientWidth,
          };
        })()""",
    )
    words = probe["words"]
    require(isinstance(words, list) and len(words) == 3, f"Home words: {probe}")
    require(
        all(
            number(word["height"], "Home word height")
            <= number(word["lineHeight"], "Home word line height") * 1.2
            for word in words
            if isinstance(word, dict)
        ),
        f"Home word split: {probe}",
    )
    require(probe["overflow"] == 0, f"Home overflow: {probe}")
    if desktop:
        require(
            number(probe["boundaryTop"], "Home boundary") <= 810,
            f"Home leaves excessive lower whitespace: {probe}",
        )
        tops = [round(number(word["top"], "Home word top")) for word in words]
        require(
            tops[0] < tops[1] and tops[1] == tops[2],
            f"Home desktop heading is not two canonical lines: {probe}",
        )
        require(
            abs(
                number(probe["introTop"], "Home intro top")
                - number(probe["courseTop"], "Home course top"),
            )
            <= 1
            and abs(
                number(probe["introBottom"], "Home intro bottom")
                - number(probe["courseBottom"], "Home course bottom"),
            )
            <= 1,
            f"Home composition does not share edges: {probe}",
        )
        require(
            probe["courseRadius"] == "0px" and probe["courseShadow"] == "none",
            f"Home course still reads as a dashboard card: {probe}",
        )
    return probe


def _chapter_chrome_probe(browser: ChromeSession) -> JsonObject:
    probe = evaluate_dict(
        browser,
        """(() => {
          const rect = (selector) =>
            document.querySelector(selector)?.getBoundingClientRect();
          const title = rect('#curriculum-chapter-title');
          const abstract = rect(
            '.curriculum-workspace__chapter-copy > p:last-child',
          );
          const prose = rect('.learning-guide-introduction > p');
          const eyebrow = rect('.curriculum-workspace__eyebrow');
          const toc = rect('.curriculum-navigation__opener');
          const article = document.querySelector('.learning-workspace__article');
          return {
            metadataCenter: eyebrow ? (eyebrow.top + eyebrow.bottom) / 2 : -1,
            tocCenter: toc ? (toc.top + toc.bottom) / 2 : -1,
            titleSize: title
              ? Number.parseFloat(
                  getComputedStyle(
                    document.querySelector('#curriculum-chapter-title'),
                  ).fontSize,
                )
              : -1,
            titleAbstractGap:
              title && abstract ? abstract.top - title.bottom : -1,
            abstractProseGap:
              abstract && prose ? prose.top - abstract.bottom : -1,
            articleBackground: article
              ? getComputedStyle(article).backgroundColor
              : '',
          };
        })()""",
    )
    require(
        abs(
            number(probe["metadataCenter"], "Metadata center")
            - number(probe["tocCenter"], "TOC center"),
        )
        <= 2,
        f"Metadata and TOC do not share one row: {probe}",
    )
    require(
        number(probe["titleSize"], "Chapter H1") <= 36,
        f"Chapter H1 competes with shell: {probe}",
    )
    require(
        12 <= number(probe["titleAbstractGap"], "H1 abstract gap") <= 18,
        f"H1-to-abstract rhythm: {probe}",
    )
    require(
        28 <= number(probe["abstractProseGap"], "Abstract prose gap") <= 48,
        f"Abstract-to-prose rhythm: {probe}",
    )
    require(
        probe["articleBackground"] == "rgba(0, 0, 0, 0)",
        f"Article still renders as a white card: {probe}",
    )
    return probe


def _figure_probe(browser: ChromeSession, figure_id: str) -> JsonObject:
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
        """document.querySelector(%s)?.scrollIntoView({
          block: 'center',
          behavior: 'auto',
        })"""
        % json.dumps(f'[data-figure-id="{figure_id}"]'),
        True,
    )
    settle(browser)
    return evaluate_dict(
        browser,
        f"""(() => {{
          const figure = document.querySelector(
            {json.dumps(f'[data-figure-id="{figure_id}"]')},
          );
          const svg = figure?.querySelector('svg');
          const svgRect = svg?.getBoundingClientRect();
          const previousRect = figure?.previousElementSibling
            ?.getBoundingClientRect();
          const figureRect = figure?.getBoundingClientRect();
          const style = figure ? getComputedStyle(figure) : null;
          const narrative = figure?.closest('[data-narrative-layout]');
          const captionRect = figure?.querySelector(':scope > figcaption')
            ?.getBoundingClientRect();
          return {{
            id: figure?.getAttribute('data-figure-id') ?? '',
            layout: svg?.getAttribute('data-figure-layout') ?? '',
            ratio:
              svgRect && svgRect.width > 0
                ? svgRect.height / svgRect.width
                : -1,
            background: style?.backgroundColor ?? '',
            marginBefore: style?.marginBlockStart ?? '',
            marginAfter: style?.marginBlockEnd ?? '',
            flowGap:
              previousRect && figureRect
                ? figureRect.top - previousRect.bottom
                : -1,
            lookupCount: figure?.querySelectorAll(
              '[data-vocabulary-lookup]',
            ).length ?? -1,
            vocabularyRectCount:
              figure?.querySelectorAll('.part0-diagram--vocabulary rect')
                .length ?? -1,
            methodRows:
              figure?.querySelectorAll('[data-tokenization-method]').length
              ?? -1,
            currentRows:
              figure?.querySelectorAll('[data-current-runtime="true"]').length
              ?? -1,
            caption: figure?.querySelector(':scope > figcaption')
              ?.textContent?.trim() ?? '',
            captionHeight: captionRect?.height ?? -1,
            narrativeLayout:
              narrative?.getAttribute('data-narrative-layout') ?? '',
            overflow:
              document.documentElement.scrollWidth
              - document.documentElement.clientWidth,
          }};
        }})()""",
    )


def run_contract(url: str, screenshots: Path, evidence_path: Path) -> None:
    evidence: JsonObject = {"home": {}, "chapters": {}}
    with ChromeSession(enable_gpu=True) as browser:
        browser.navigate(url)
        wait_for(
            browser,
            "document.querySelector('.architecture-app') !== null",
            "Application shell",
        )

        for width, height, suffix in (
            (1440, 900, "desktop"),
            (390, 844, "mobile"),
        ):
            set_viewport(browser, width, height)
            _go_home(browser)
            evidence["home"][suffix] = _home_probe(
                browser,
                desktop=width == 1440,
            )
            capture(browser, screenshots / f"home-{suffix}.png")

            for slug, figure_id, name in CHAPTERS:
                _go_chapter(browser, slug)
                if slug == "0-1":
                    evidence["chapterChrome"] = _chapter_chrome_probe(browser)
                probe = _figure_probe(browser, figure_id)
                if slug == "0-1":
                    require(
                        probe["narrativeLayout"] == "golden"
                        and probe["background"] == "rgba(0, 0, 0, 0)"
                        and number(
                            probe["captionHeight"],
                            "0.1 hidden caption",
                        )
                        <= 1
                        and probe["overflow"] == 0,
                        f"0.1 composition: {probe}",
                    )
                if slug == "0-3":
                    require(
                        probe["lookupCount"] == 2
                        and probe["vocabularyRectCount"] == 0,
                        f"0.3 relationship composition: {probe}",
                    )
                if slug == "0-4":
                    require(
                        probe["methodRows"] == 4 and probe["currentRows"] == 1,
                        f"0.4 data sheet: {probe}",
                    )
                if slug != "0-1":
                    require(
                        probe["background"] == "rgba(0, 0, 0, 0)"
                        and probe["marginBefore"] == "16px"
                        and probe["marginAfter"] == "16px"
                        and 28
                        <= number(probe["flowGap"], "Figure flow gap")
                        <= 40
                        and str(probe["caption"]).endswith(".")
                        and probe["overflow"] == 0,
                        f"Figure editorial contract: {probe}",
                    )
                evidence["chapters"][f"{slug}-{suffix}"] = probe
                capture(browser, screenshots / f"{name}-{suffix}.png")

    evidence_path.parent.mkdir(parents=True, exist_ok=True)
    evidence_path.write_text(
        json.dumps(evidence, ensure_ascii=False, indent=2) + "\n",
    )
    print("Editorial composition browser contract: PASS (10 screenshots)")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--url", default="http://127.0.0.1:5173/")
    parser.add_argument(
        "--screenshots",
        type=Path,
        default=Path(".omo/evidence/editorial-part0-pass/final"),
    )
    parser.add_argument(
        "--evidence",
        type=Path,
        default=Path(".omo/evidence/editorial-part0-pass/final-browser.json"),
    )
    args = parser.parse_args()
    run_contract(args.url, args.screenshots, args.evidence)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
