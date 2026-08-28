"""DOM and data contracts shared by hybrid browser QA phases."""

from __future__ import annotations

import json

from browser_hybrid_helpers import (
    HybridBrowserError,
    JsonObject,
    JsonValue,
    evaluate_dict,
    navigate_hash,
    wait_for,
)
from browser_session import ChromeSession

CHAPTER_IDS = {
    "0-1": "decoder.chapter.0.1",
    "0-2": "decoder.chapter.0.2",
    "1-1": "decoder.chapter.1.1",
    "1-2": "decoder.chapter.1.2",
    "3-1": "decoder.chapter.3.1",
    "4-1": "decoder.chapter.4.1",
    "5-1": "decoder.chapter.5.1",
}


def require(condition: bool, message: str) -> None:
    if not condition:
        raise HybridBrowserError(message)


def number(value: JsonValue, label: str) -> float:
    if not isinstance(value, int | float):
        raise HybridBrowserError(f"{label} is not numeric: {value!r}")
    return float(value)


def set_viewport(browser: ChromeSession, width: int, height: int) -> None:
    browser.require_cdp().send(
        "Emulation.setDeviceMetricsOverride",
        {
            "width": width,
            "height": height,
            "deviceScaleFactor": 1,
            "mobile": width < 600,
        },
        browser.page_session,
    )


def go_chapter(browser: ChromeSession, slug: str) -> None:
    chapter_id = CHAPTER_IDS[slug]
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


def diagram_probe(browser: ChromeSession) -> JsonObject:
    return evaluate_dict(
        browser,
        """(() => {
          const viewer = document.querySelector('#focused-viewer');
          const surface = viewer?.querySelector('.diagram-viewport__surface');
          const content = viewer?.querySelector('.diagram-viewport__content');
          const description = viewer?.querySelector(
            '#focused-viewer-description',
          );
          const toolbar = viewer?.querySelector('.diagram-viewport__toolbar');
          const closeButton = viewer?.querySelector(
            '[aria-label="집중 보기 닫기"]',
          );
          const returnButton = viewer?.querySelector(
            '.focused-viewer__return',
          );
          if (!viewer || !surface || !content || !toolbar)
            throw new Error('focused Diagram viewer missing');
          const body = viewer.querySelector('.focused-viewer__body');
          const v = viewer.getBoundingClientRect();
          const b = body?.getBoundingClientRect();
          const s = surface.getBoundingClientRect();
          const c = content.getBoundingClientRect();
          const t = toolbar.getBoundingClientRect();
          const svg = content.querySelector('svg[viewBox]');
          const caption = content.querySelector('figcaption');
          const embeddedDescriptions = [
            caption,
            content.querySelector('.architecture-metadata'),
            content.querySelector('.architecture-detail-toolbar'),
          ].filter(element => element instanceof Element);
          const visualRects = [svg]
            .filter(element => element instanceof Element)
            .map(element => element.getBoundingClientRect());
          const d = description?.getBoundingClientRect();
          return {
            mode: surface.dataset.viewportMode,
            fitScale: Number(surface.dataset.fitScale),
            scale: Number(surface.dataset.scale),
            panX: Number(surface.dataset.panX),
            panY: Number(surface.dataset.panY),
            contentWidth: Number(surface.dataset.contentWidth),
            contentHeight: Number(surface.dataset.contentHeight),
            surfaceRect: {
              left: s.left, top: s.top, right: s.right, bottom: s.bottom,
            },
            visualRects: visualRects.map(rect => ({
              left: rect.left,
              top: rect.top,
              right: rect.right,
              bottom: rect.bottom,
            })),
            fullyContained:
              c.left >= s.left - 1 && c.top >= s.top - 1
              && c.right <= s.right + 1 && c.bottom <= s.bottom + 1
              && visualRects.every(rect =>
                rect.left >= s.left - 1 && rect.top >= s.top - 1
                && rect.right <= s.right + 1 && rect.bottom <= s.bottom + 1
              ),
            viewerWidthRatio: v.width / innerWidth,
            viewerHeightRatio: v.height / innerHeight,
            bodyRect: {
              left: b?.left ?? 0,
              top: b?.top ?? 0,
              right: b?.right ?? 0,
              bottom: b?.bottom ?? 0,
            },
            contentRect: {
              left: c.left, top: c.top, right: c.right, bottom: c.bottom,
            },
            toolbarRect: {
              left: t.left, top: t.top, right: t.right, bottom: t.bottom,
            },
            styles: {
              viewerOpacity: getComputedStyle(viewer).opacity,
              bodyDisplay: body ? getComputedStyle(body).display : null,
              bodyOpacity: body ? getComputedStyle(body).opacity : null,
              paneOpacity:
                getComputedStyle(surface.closest('.diagram-viewport')).opacity,
              paneVisibility:
                getComputedStyle(surface.closest('.diagram-viewport')).visibility,
              surfaceDisplay: getComputedStyle(surface).display,
              surfaceOpacity: getComputedStyle(surface).opacity,
              contentOpacity: getComputedStyle(content).opacity,
              contentTransform: getComputedStyle(content).transform,
              svgDisplay: svg ? getComputedStyle(svg).display : null,
              svgOpacity: svg ? getComputedStyle(svg).opacity : null,
            },
            overflowX: document.documentElement.scrollWidth > innerWidth,
            descriptionVisible:
              d === undefined ? false : d.width > 0 && d.height > 0,
            descriptionOutsideTransform:
              description === null || !content.contains(description),
            embeddedDescriptionVisible: embeddedDescriptions.some(element => {
              const rect = element.getBoundingClientRect();
              return rect.width > 0 && rect.height > 0;
            }),
            toolbarInsideSurface: surface.contains(toolbar),
            dialogLabelled:
              viewer.getAttribute('aria-labelledby')
              === 'focused-viewer-title',
            closeNative: closeButton instanceof HTMLButtonElement,
            returnNative:
              returnButton === null
              || returnButton instanceof HTMLButtonElement,
            toolbarLabelled:
              toolbar.getAttribute('aria-label')
              === '다이어그램 보기 도구',
            zoomPercent: toolbar.querySelector('output')?.textContent?.trim(),
          };
        })()""",
    )


def button_with_text(label: str, scope: str = "document") -> str:
    text = json.dumps(label)
    return (
        f"Array.from({scope}.querySelectorAll('button'))"
        f".find(button => button.textContent?.trim() === {text})"
    )


def canvas_metrics(browser: ChromeSession) -> JsonObject:
    return evaluate_dict(
        browser,
        """(() => {
          const canvas = document.querySelector('.score-matrix-canvas canvas');
          const table = document.querySelector('.score-matrix-table');
          const request = window.__learningWorkerRequests.findLast(
            item => item?.type === 'inspect_attention_head',
          );
          const response = window.__learningWorkerResponses.findLast(
            item => item?.type === 'attention_head_trace',
          );
          if (!(canvas instanceof HTMLCanvasElement) || !table || !request || !response)
            throw new Error('score matrix runtime evidence missing');
          const firstCell = table.querySelector('tbody td');
          const expected = response.trace.raw_scores.values[0];
          return {
            canvasCount: document.querySelectorAll(
              '.score-matrix-canvas canvas',
            ).length,
            dpr: canvas.width / canvas.clientWidth,
            expected,
            tableValue: Number(
              firstCell?.querySelector('span')?.textContent?.trim(),
            ),
            requestId: request.request_id,
            responseRequestId: response.request_id,
            runId: request.run_id,
            responseRunId: response.run_id,
            inspectRequests: window.__learningWorkerRequests.filter(
              item => item?.type === 'inspect_attention_head',
            ).length,
          };
        })()""",
    )


def lose_context(browser: ChromeSession) -> JsonObject:
    wait_for(
        browser,
        "document.querySelector('[data-visualization-state=\"context-lost\"]') !== null",
        "WebGL context loss",
        """(() => {
          const canvas = document.querySelector('.score-matrix-canvas canvas');
          const gl = canvas?.getContext('webgl2') ?? canvas?.getContext('webgl');
          const extension = gl?.getExtension('WEBGL_lose_context');
          if (!extension) throw new Error('WEBGL_lose_context unavailable');
          window.__scoreMatrixLoseContext = extension;
          extension.loseContext();
        })();""",
    )
    return evaluate_dict(
        browser,
        """(() => {
          const details = document.querySelector(
            '.three-visualization-surface__fallback',
          );
          const table = document.querySelector('.score-matrix-table');
          return {
            fallbackOpen: details instanceof HTMLDetailsElement && details.open,
            tableVisible: table instanceof HTMLElement
              && table.getBoundingClientRect().height > 0,
          };
        })()""",
    )
