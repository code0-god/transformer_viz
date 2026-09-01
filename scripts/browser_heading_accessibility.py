#!/usr/bin/env python3
"""Verify scoped Architecture heading levels in real Chrome."""

from __future__ import annotations

import argparse
import json
import threading
from functools import partial
from http.server import ThreadingHTTPServer
from pathlib import Path

from browser_hybrid_contract import require, set_viewport
from browser_hybrid_foundation import QuietHandler
from browser_hybrid_helpers import JsonObject, evaluate_dict, navigate_hash, wait_for
from browser_probes import READY_PROBE
from browser_session import ChromeSession

VIEWPORTS = (
    (1440, 900),
    (1024, 768),
    (768, 1024),
    (390, 844),
    (320, 568),
)
ROUTES = ("3-1", "4-1", "5-1")


def _style(expression: str) -> str:
    return (
        f"(() => {{ const style = getComputedStyle({expression});"
        " return {"
        "fontSize: style.fontSize,"
        "lineHeight: style.lineHeight,"
        "marginBlockStart: style.marginBlockStart,"
        "marginBlockEnd: style.marginBlockEnd,"
        "paddingBlockStart: style.paddingBlockStart,"
        "paddingBlockEnd: style.paddingBlockEnd"
        "}; })()"
    )


def _ax_headings(browser: ChromeSession) -> list[JsonObject]:
    cdp = browser.require_cdp()
    result = cdp.send(
        "Accessibility.getFullAXTree",
        {},
        browser.page_session,
    )
    headings: list[JsonObject] = []
    for node in result.get("nodes", []):
        role = node.get("role", {}).get("value")
        if role != "heading":
            continue
        properties = {
            item.get("name"): item.get("value", {}).get("value")
            for item in node.get("properties", [])
        }
        headings.append(
            {
                "name": node.get("name", {}).get("value", ""),
                "level": properties.get("level"),
            },
        )
    return headings


def _probe(browser: ChromeSession, slug: str) -> JsonObject:
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
        f"Architecture Chapter {slug}",
    )
    wait_for(
        browser,
        (
            "Boolean(document.querySelector('#curriculum-chapter-title'))"
            " && Boolean(document.querySelector('.learning-guide-header > h3'))"
            " && Boolean(document.querySelector("
            "'.learning-guide-section-heading > h4'))"
        ),
        f"Architecture headings {slug}",
    )
    dom = evaluate_dict(
        browser,
        f"""
        (() => {{
          const chapter = document.querySelector('#curriculum-chapter-title');
          const guide = document.querySelector('.learning-guide-header > h3');
          const section = document.querySelector(
            '.learning-guide-section-heading > h4',
          );
          const describe = (heading) => ({{
            ariaLevel: heading?.getAttribute('aria-level') ?? '',
            role: heading?.getAttribute('role') ?? '',
            tag: heading?.tagName ?? '',
            text: heading?.textContent?.trim() ?? '',
          }});
          return {{
            chapter: describe(chapter),
            chapterStyle: {_style("chapter")},
            documentOverflow:
              document.documentElement.scrollWidth
              - document.documentElement.clientWidth,
            guide: describe(guide),
            guideStyle: {_style("guide")},
            section: describe(section),
            sectionStyle: {_style("section")},
          }};
        }})()
        """,
    )
    dom["axHeadings"] = _ax_headings(browser)
    return dom


def _capture_matrix(root: Path, base: str) -> list[JsonObject]:
    server = ThreadingHTTPServer(
        ("127.0.0.1", 0),
        partial(QuietHandler, directory=str(root.resolve())),
    )
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    try:
        with ChromeSession(enable_gpu=True) as browser:
            browser.navigate(
                f"http://127.0.0.1:{server.server_port}{base}",
            )
            browser.require_cdp().evaluate(
                browser.page_session,
                READY_PROBE,
                True,
            )
            matrix: list[JsonObject] = []
            for width, height in VIEWPORTS:
                set_viewport(browser, width, height)
                for slug in ROUTES:
                    matrix.append(
                        {
                            "width": width,
                            "height": height,
                            "slug": slug,
                            **_probe(browser, slug),
                        },
                    )
            return matrix
    finally:
        server.shutdown()
        server.server_close()
        thread.join(timeout=10)


def _has_heading_level(
    headings: object,
    name: object,
    level: int,
) -> bool:
    if not isinstance(headings, list) or not isinstance(name, str):
        return False
    for heading in headings:
        if (
            isinstance(heading, dict)
            and heading.get("name") == name
            and heading.get("level") == level
        ):
            return True
    return False


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--baseline-root", type=Path, required=True)
    parser.add_argument("--candidate-root", type=Path, required=True)
    parser.add_argument("--candidate-base", default="/")
    parser.add_argument("--evidence", type=Path, required=True)
    args = parser.parse_args()

    baseline = _capture_matrix(args.baseline_root, "/")
    candidate = _capture_matrix(args.candidate_root, args.candidate_base)
    require(len(baseline) == len(candidate) == 15, "Heading matrix size")

    for before, after in zip(baseline, candidate, strict=True):
        require(
            (before["width"], before["height"], before["slug"])
            == (after["width"], after["height"], after["slug"]),
            f"Heading matrix alignment: {before} {after}",
        )
        require(
            after["chapter"]["tag"] == "H1"
            and after["chapter"]["ariaLevel"] == ""
            and after["chapter"]["role"] == "",
            f"Chapter heading changed: {after}",
        )
        require(
            after["guide"]["tag"] == "H3"
            and after["guide"]["ariaLevel"] == "2"
            and after["guide"]["role"] == "",
            f"Guide heading level: {after}",
        )
        require(
            after["section"]["tag"] == "H4"
            and after["section"]["ariaLevel"] == "3"
            and after["section"]["role"] == "",
            f"Section heading level: {after}",
        )
        require(
            _has_heading_level(
                after["axHeadings"],
                after["chapter"]["text"],
                1,
            )
            and _has_heading_level(
                after["axHeadings"],
                after["guide"]["text"],
                2,
            )
            and _has_heading_level(
                after["axHeadings"],
                after["section"]["text"],
                3,
            ),
            f"Chrome AX heading levels: {after}",
        )
        require(
            before["chapterStyle"] == after["chapterStyle"]
            and before["guideStyle"] == after["guideStyle"]
            and before["sectionStyle"] == after["sectionStyle"],
            f"Heading computed style changed: {before} {after}",
        )
        require(
            after["documentOverflow"] == 0,
            f"Heading route overflow: {after}",
        )

    args.evidence.parent.mkdir(parents=True, exist_ok=True)
    args.evidence.write_text(
        json.dumps(
            {"baseline": baseline, "candidate": candidate},
            ensure_ascii=False,
            indent=2,
        )
        + "\n",
    )
    print("Architecture heading accessibility: PASS (15 cases)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
