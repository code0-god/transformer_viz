"""Production-browser geometry contract for canonical page boundaries."""

from __future__ import annotations

import argparse
import json
from pathlib import Path

from browser_hybrid_contract import require
from browser_hybrid_helpers import (
    JsonObject,
    evaluate_dict,
    navigate_hash,
    pointer_click,
    settle_animations,
    wait_for,
)
from browser_session import ChromeSession

VIEWPORTS = (
    (320, 568),
    (390, 844),
    (768, 1024),
    (1024, 768),
    (1366, 768),
    (1440, 900),
)
LEARN_CHAPTERS = ("0-1", "0-2", "0-3", "0-4", "3-1")


def _set_viewport(browser: ChromeSession, width: int, height: int) -> None:
    browser.require_cdp().send(
        "Emulation.setDeviceMetricsOverride",
        {
            "width": width,
            "height": height,
            "deviceScaleFactor": 1,
            "mobile": False,
        },
        browser.page_session,
    )


def _boundary_probe(browser: ChromeSession, boundary_id: str) -> JsonObject:
    return evaluate_dict(
        browser,
        f"""(() => {{
          const boundary = document.querySelector(
            '[data-boundary-id="{boundary_id}"]',
          );
          const scope =
            boundary?.closest('#focused-viewer') ??
            document.querySelector('.architecture-app');
          const rect = boundary?.getBoundingClientRect();
          const scopeRect = scope?.getBoundingClientRect();
          return {{
            found: boundary !== null,
            kind: boundary?.getAttribute('data-boundary-kind') ?? '',
            left: rect?.left ?? -1,
            right: rect?.right ?? -1,
            width: rect?.width ?? -1,
            height: rect?.height ?? -1,
            scopeLeft: scopeRect?.left ?? -1,
            scopeRight: scopeRect?.right ?? -1,
            ancestors: boundary
              ? [boundary.parentElement, boundary.parentElement?.parentElement,
                  boundary.parentElement?.parentElement?.parentElement,
                  boundary.parentElement?.parentElement?.parentElement
                    ?.parentElement]
                  .filter(Boolean)
                  .map((element) => {{
                    const ancestorRect = element.getBoundingClientRect();
                    const style = getComputedStyle(element);
                    return {{
                      className: element.className,
                      left: ancestorRect.left,
                      right: ancestorRect.right,
                      paddingInline: style.paddingInline,
                      columns: style.gridTemplateColumns,
                    }};
                  }})
              : [],
          }};
        }})()""",
    )


def _assert_boundary(
    browser: ChromeSession,
    boundary_id: str,
) -> JsonObject:
    probe = _boundary_probe(browser, boundary_id)
    require(probe["found"] is True, f"Missing {boundary_id} boundary: {probe}")
    require(
        probe["kind"] == "structural",
        f"Wrong {boundary_id} boundary kind: {probe}",
    )
    require(
        abs(float(probe["left"]) - float(probe["scopeLeft"])) <= 1,
        f"{boundary_id} left edge is not canonical: {probe}",
    )
    require(
        abs(float(probe["right"]) - float(probe["scopeRight"])) <= 1,
        f"{boundary_id} right edge is not canonical: {probe}",
    )
    require(
        float(probe["height"]) == 1,
        f"{boundary_id} is not one pixel: {probe}",
    )
    return probe


def _assert_no_overflow(browser: ChromeSession) -> JsonObject:
    probe = evaluate_dict(
        browser,
        """(() => {
          const clientWidth = document.documentElement.clientWidth;
          const offenders = [...document.querySelectorAll('*')]
            .map((element) => {
              const rect = element.getBoundingClientRect();
              return {
                tag: element.tagName,
                className:
                  typeof element.className === 'string'
                    ? element.className
                    : '',
                left: rect.left,
                right: rect.right,
                width: rect.width,
              };
            })
            .filter(({ left, right }) => left < -0.5 || right > clientWidth + 0.5)
            .slice(0, 12);
          return {
            clientWidth,
            scrollWidth: document.documentElement.scrollWidth,
            innerWidth,
            offenders,
            root: {
              htmlWidth: document.documentElement.getBoundingClientRect().width,
              bodyWidth: document.body.getBoundingClientRect().width,
              htmlMinWidth: getComputedStyle(document.documentElement).minInlineSize,
            },
            grids: [
              '.architecture-app',
              '.architecture-header',
              '.architecture-header__content',
              '.course-home',
              '.course-home__content',
            ].map((selector) => {
              const element = document.querySelector(selector);
              const rect = element?.getBoundingClientRect();
              return {
                selector,
                left: rect?.left ?? -1,
                right: rect?.right ?? -1,
                width: rect?.width ?? -1,
                columns: element
                  ? getComputedStyle(element).gridTemplateColumns
                  : '',
              };
            }),
          };
        })()""",
    )
    require(
        probe["clientWidth"] == probe["scrollWidth"],
        f"Horizontal overflow: {probe}",
    )
    return probe


def _home_alignment_probe(browser: ChromeSession) -> JsonObject:
    probe = evaluate_dict(
        browser,
        """(() => {
          const intro = document.querySelector('.course-home__intro');
          const course = document.querySelector('.course-home__course');
          const introRect = intro?.getBoundingClientRect();
          const courseRect = course?.getBoundingClientRect();
          return {
            introTop: introRect?.top ?? -1,
            courseTop: courseRect?.top ?? -1,
            introLeft: introRect?.left ?? -1,
            courseLeft: courseRect?.left ?? -1,
          };
        })()""",
    )
    require(
        abs(float(probe["introTop"]) - float(probe["courseTop"])) <= 1,
        f"Home hero and curriculum header do not share a baseline: {probe}",
    )
    return probe


def _learn_alignment_probe(
    browser: ChromeSession,
    slug: str,
) -> JsonObject:
    wait_for(
        browser,
        "document.querySelector('.learning-figure figcaption') !== null",
        f"Chapter {slug} Figure caption",
    )
    probe = evaluate_dict(
        browser,
        """(() => {
          const rect = (selector) =>
            document.querySelector(selector)?.getBoundingClientRect();
          const content = rect('.curriculum-workspace__header-content');
          const workspace = rect('.curriculum-workspace__content');
          const title = rect('.curriculum-workspace__chapter-copy h1');
          const prose = rect(
            '.learning-guide-introduction > p, '
            + '.learning-guide-section > p',
          );
          const figure = rect('.learning-figure');
          const caption = rect('.learning-figure figcaption');
          return {
            contentLeft: content?.left ?? -1,
            workspaceLeft: workspace?.left ?? -1,
            workspaceRight: workspace?.right ?? -1,
            titleLeft: title?.left ?? -1,
            proseLeft: prose?.left ?? -1,
            figureLeft: figure?.left ?? -1,
            figureRight: figure?.right ?? -1,
            captionLeft: caption?.left ?? -1,
            footerCount:
              document.querySelectorAll('.curriculum-chapter-footer').length,
            finalBoundaryCount:
              document.querySelectorAll('[data-boundary-id="article-final"]').length,
            rootColumns: getComputedStyle(
              document.querySelector('.architecture-app'),
            ).gridTemplateColumns,
            chapterColumns: getComputedStyle(
              document.querySelector('.curriculum-workspace__header'),
            ).gridTemplateColumns,
            contentWidth: content?.width ?? -1,
          };
        })()""",
    )
    aligned = ("titleLeft", "proseLeft")
    for key in aligned:
        require(
            abs(float(probe[key]) - float(probe["contentLeft"])) <= 1,
            f"Chapter {slug} {key} is off the CONTENT line: {probe}",
        )
    require(
        float(probe["figureLeft"]) >= float(probe["workspaceLeft"]) - 1
        and float(probe["figureRight"]) <= float(probe["workspaceRight"]) + 1,
        f"Chapter {slug} Figure escaped WIDE workspace: {probe}",
    )
    require(
        float(probe["captionLeft"]) >= float(probe["figureLeft"]) - 1
        and float(probe["captionLeft"]) <= float(probe["figureRight"]) + 1,
        f"Chapter {slug} caption escaped Figure bounds: {probe}",
    )
    require(
        probe["footerCount"] == 0 and probe["finalBoundaryCount"] == 0,
        f"Chapter {slug} retained the removed footer bar: {probe}",
    )
    return probe


def _go_home(browser: ChromeSession) -> None:
    navigate_hash(
        browser,
        "#/",
        "document.querySelector('.course-home') !== null",
        "Course Home",
    )


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


def _go_lab(browser: ChromeSession) -> None:
    navigate_hash(
        browser,
        "#/lab",
        "document.querySelector('.lab-workspace') !== null",
        "Lab",
    )


def _open_architecture_viewer(browser: ChromeSession) -> None:
    wait_for(
        browser,
        (
            "document.querySelector("
            "'[data-testid=\"lab-open-architecture-root\"]'"
            ")?.disabled === false"
        ),
        "Architecture inspection launcher",
    )
    pointer_click(
        browser,
        "document.querySelector('[data-testid=\"lab-open-architecture-root\"]')",
        condition=(
            "document.querySelector('#focused-viewer "
            "[data-testid=\"architecture-root\"]') !== null"
        ),
        label="Architecture viewer",
    )
    settle_animations(
        browser,
        "[data-viewer-backdrop]",
        "Architecture viewer animation",
    )


def _close_viewer(browser: ChromeSession) -> None:
    pointer_click(
        browser,
        "document.querySelector('[aria-label=\"집중 보기 닫기\"]')",
        condition="document.querySelector('#focused-viewer') === null",
        label="Architecture viewer close",
    )


def run_contract(url: str, evidence_path: Path) -> None:
    evidence: list[JsonObject] = []
    with ChromeSession(enable_gpu=True) as browser:
        browser.navigate(url)
        wait_for(
            browser,
            "document.querySelector('.architecture-app') !== null",
            "Application shell",
        )
        for width, height in VIEWPORTS:
            _set_viewport(browser, width, height)
            _go_home(browser)
            header = _assert_boundary(browser, "global-header")
            home = _assert_boundary(browser, "home-final")
            home_alignment = (
                _home_alignment_probe(browser) if width >= 1100 else None
            )
            home_overflow = _assert_no_overflow(browser)

            _go_chapter(browser, "0-2")
            chapter = _assert_boundary(browser, "chapter-header")
            article = evaluate_dict(
                browser,
                """({
                  found: document.querySelector(
                    '[data-boundary-id="article-final"]',
                  ) !== null,
                })""",
            )
            require(
                article["found"] is False,
                f"Removed article-final boundary remained: {article}",
            )
            learn_overflow = _assert_no_overflow(browser)

            _go_lab(browser)
            lab = {
                boundary_id: _assert_boundary(browser, boundary_id)
                for boundary_id in (
                    "lab-prompt",
                    "lab-output",
                    "lab-runtime",
                    "lab-inspect",
                )
            }
            lab_overflow = _assert_no_overflow(browser)

            evidence.append(
                {
                    "viewport": {"width": width, "height": height},
                    "header": header,
                    "home": home,
                    "homeAlignment": home_alignment,
                    "chapter": chapter,
                    "article": article,
                    "lab": lab,
                    "overflow": {
                        "home": home_overflow,
                        "learn": learn_overflow,
                        "lab": lab_overflow,
                    },
                },
            )

        _set_viewport(browser, 1440, 900)
        chapter_alignment: dict[str, JsonObject] = {}
        for slug in LEARN_CHAPTERS:
            _go_chapter(browser, slug)
            chapter_alignment[slug] = _learn_alignment_probe(browser, slug)
        evidence.append({"chapterAlignment": chapter_alignment})

        _go_lab(browser)
        _open_architecture_viewer(browser)
        viewer = _assert_boundary(browser, "overlay-header")
        _close_viewer(browser)
        evidence.append({"viewer": viewer})

    evidence_path.parent.mkdir(parents=True, exist_ok=True)
    evidence_path.write_text(
        json.dumps(evidence, ensure_ascii=False, indent=2) + "\n",
    )
    print(f"Boundary layout browser geometry: PASS ({len(VIEWPORTS)} viewports)")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--url", default="http://127.0.0.1:5173/")
    parser.add_argument(
        "--evidence",
        type=Path,
        default=Path(".omo/evidence/boundary-layout-pass/geometry.json"),
    )
    args = parser.parse_args()
    run_contract(args.url, args.evidence)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
