#!/usr/bin/env python3
"""Verify Golden and benchmark Learn Visual Narratives in production Chrome."""

from __future__ import annotations

import argparse
import base64
import json
import threading
from functools import partial
from http.server import ThreadingHTTPServer
from pathlib import Path
from typing import NamedTuple

from browser_hybrid_capture import capture
from browser_hybrid_contract import require, set_viewport
from browser_hybrid_foundation import QuietHandler
from browser_hybrid_helpers import (
    JsonObject,
    evaluate_dict,
    navigate_hash,
    pointer_click,
    settle,
    settle_animations,
    wait_for,
)
from browser_learning_scenes import _settle_scene, _verify_idle
from browser_learning_workspace_probes import browser_errors
from browser_probes import READY_PROBE
from browser_session import ChromeSession

VIEWPORTS = (
    (320, 568),
    (390, 844),
    (768, 1024),
    (1024, 768),
    (1366, 768),
    (1440, 900),
)


class NarrativeSpec(NamedTuple):
    chapter: str
    figure_id: str
    layout: str
    name: str
    state_attribute: str
    state_test_id: str
    states: tuple[tuple[str, str], ...]


SPECS = (
    NarrativeSpec(
        "0-2",
        "decoder.diagram.tokenization.token",
        "golden",
        "tokenization",
        "data-token-stage",
        "token-golden-visual",
        (
            ("문장을 나누기", "why-split"),
            ("Token", "token-units"),
            ("단어와 Token", "not-word"),
            ("현재 모델", "current-byte"),
            ("다음 질문", "next-token-id"),
        ),
    ),
    NarrativeSpec(
        "2-1",
        "decoder.diagram.representation.embedding",
        "split",
        "embedding",
        "data-phase",
        "token-scene-state",
        (
            ("ID", "id"),
            ("Row", "lookup"),
            ("선택", "lift"),
            ("Vector", "vector"),
        ),
    ),
    NarrativeSpec(
        "5-1",
        "self-attention",
        "sticky",
        "attention",
        "data-stage",
        "attention-scene-state",
        (
            ("Overview", "overview"),
            ("Q/K/V", "qkv"),
            ("Scores", "scores"),
            ("Mask", "mask"),
            ("Softmax", "softmax"),
            ("Value", "value"),
        ),
    ),
)

OBSERVER_PROBE = r"""
(() => {
  const NativeObserver = window.IntersectionObserver;
  const metrics = { active: 0, created: 0, disconnected: 0 };
  class TrackedObserver extends NativeObserver {
    constructor(callback, options) {
      super(callback, options);
      this.__trackedDisconnected = false;
      metrics.active += 1;
      metrics.created += 1;
    }
    disconnect() {
      if (!this.__trackedDisconnected) {
        this.__trackedDisconnected = true;
        metrics.active -= 1;
        metrics.disconnected += 1;
      }
      super.disconnect();
    }
  }
  Object.defineProperty(window, 'IntersectionObserver', {
    configurable: true,
    value: TrackedObserver,
  });
  Object.defineProperty(window, '__narrativeObserverMetrics', {
    configurable: true,
    value: metrics,
  });
})();
"""


def _install_observer_probe(browser: ChromeSession) -> None:
    browser.require_cdp().send(
        "Page.addScriptToEvaluateOnNewDocument",
        {"source": OBSERVER_PROBE},
        browser.page_session,
    )


def _chapter_selector(spec: NarrativeSpec) -> str:
    chapter_id = f"decoder.chapter.{spec.chapter.replace('-', '.')}"
    return f'[data-curriculum-chapter-id="{chapter_id}"]'


def _open_chapter(browser: ChromeSession, spec: NarrativeSpec) -> None:
    navigate_hash(
        browser,
        f"#/learn/decoder-only-fundamentals/{spec.chapter}",
        (
            "Boolean(document.querySelector("
            + json.dumps(_chapter_selector(spec))
            + "))"
        ),
        f"{spec.name} Chapter",
    )


def _state_selector(spec: NarrativeSpec) -> str:
    if spec.name == "tokenization":
        return "[data-token-golden-visual]"
    return f'[data-testid="{spec.state_test_id}"]'


def _settle_narrative(browser: ChromeSession, spec: NarrativeSpec) -> None:
    if spec.name != "tokenization":
        _settle_scene(browser)
        return
    browser.require_cdp().evaluate(
        browser.page_session,
        (
            "delete document.querySelector('[data-token-golden-visual]')"
            "?.dataset.browserAnimationsSettled"
        ),
        True,
    )
    settle_animations(
        browser,
        "[data-token-golden-visual]",
        "Golden Token narrative settled",
    )
    settle(browser)


def _open_narrative(browser: ChromeSession, spec: NarrativeSpec) -> None:
    _open_chapter(browser, spec)
    ready_selector = (
        f'[data-figure-id="{spec.figure_id}"] {_state_selector(spec)}'
        if spec.name == "tokenization"
        else (
            f'[data-figure-id="{spec.figure_id}"] '
            '[data-scene-status="ready"]'
        )
    )
    wait_for(
        browser,
        f"document.querySelector({json.dumps(ready_selector)}) !== null",
        f"{spec.name} narrative ready",
        (
            f"document.querySelector('[data-figure-id=\"{spec.figure_id}\"]')"
            "?.scrollIntoView({ block: 'center', inline: 'nearest' });"
        ),
    )
    _settle_narrative(browser, spec)


def _state_condition(spec: NarrativeSpec, state: str) -> str:
    return (
        f"document.querySelector({json.dumps(_state_selector(spec))})"
        f"?.getAttribute('{spec.state_attribute}') === {json.dumps(state)}"
    )


def _click_stage(
    browser: ChromeSession,
    spec: NarrativeSpec,
    label: str,
    state: str,
) -> None:
    encoded = json.dumps(label, ensure_ascii=False)
    before = browser.require_cdp().evaluate(
        browser.page_session,
        "window.__learningSceneMetrics?.animationFrameCount ?? 0",
        True,
    )
    current = browser.require_cdp().evaluate(
        browser.page_session,
        (
            f"document.querySelector({json.dumps(_state_selector(spec))})"
            f"?.getAttribute('{spec.state_attribute}') ?? ''"
        ),
        True,
    )
    if not isinstance(before, int):
        raise TypeError(f"{spec.name} frame count: {before!r}")
    if current == state:
        _settle_narrative(browser, spec)
        return
    button_match = (
        "button.getAttribute('aria-label')"
        f"?.endsWith({json.dumps(f': {label}', ensure_ascii=False)})"
        if spec.name == "tokenization"
        else f"button.textContent?.trim() === {encoded}"
    )
    pointer_click(
        browser,
        (
            "Array.from(document.querySelectorAll("
            "'.visual-narrative__steps button'))"
            f".find(button => {button_match})"
        ),
        condition=_state_condition(spec, state),
        label=f"{spec.name} {state}",
    )
    if spec.name == "tokenization":
        _settle_narrative(browser, spec)
    else:
        _settle_scene(
            browser,
            after_frame=before if current != state else None,
        )


def _capture_chapter(
    browser: ChromeSession,
    selector: str,
    path: Path,
) -> str:
    box = evaluate_dict(
        browser,
        f"""(() => {{
          const element = document.querySelector({json.dumps(selector)});
          if (!(element instanceof HTMLElement))
            throw new Error('Chapter capture target missing');
          const rect = element.getBoundingClientRect();
          return {{
            x: Math.max(0, rect.left + scrollX),
            y: Math.max(0, rect.top + scrollY),
            width: rect.width,
            height: rect.height,
          }};
        }})()""",
    )
    payload = browser.require_cdp().send(
        "Page.captureScreenshot",
        {
            "format": "png",
            "captureBeyondViewport": True,
            "fromSurface": True,
            "clip": {
                "x": _number(box, "x"),
                "y": _number(box, "y"),
                "width": _number(box, "width"),
                "height": _number(box, "height"),
                "scale": 1,
            },
        },
        browser.page_session,
    )
    content = base64.b64decode(str(payload["data"]))
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(content)
    return str(path)


def _probe(browser: ChromeSession, spec: NarrativeSpec) -> JsonObject:
    return evaluate_dict(
        browser,
        f"""(() => {{
          const narrative = document.querySelector(
            '[data-narrative-layout="{spec.layout}"]',
          );
          const visual = narrative?.querySelector('.visual-narrative__visual');
          const figure = narrative?.querySelector(
            '[data-figure-id="{spec.figure_id}"]',
          );
          const stateTarget = document.querySelector(
            {json.dumps(_state_selector(spec))},
          );
          const plane = {json.dumps(spec.name == "tokenization")}
            ? stateTarget
            : figure?.querySelector('.scene-figure__plane');
          const header = figure?.querySelector('.scene-figure__header');
          const caption = figure?.querySelector('figcaption');
          const chapterLinks = document.querySelector(
            '.curriculum-workspace__adjacent-navigation',
          );
          const chapterLinkAnchors = Array.from(
            chapterLinks?.querySelectorAll('a') ?? [],
          );
          const guideArticle = document.querySelector(
            '.learning-guide[data-guide-page-id]',
          );
          const curriculumContent = document.querySelector(
            '.curriculum-workspace__content',
          );
          const deckSteps = narrative?.querySelector(
            ':scope > .visual-narrative__steps',
          );
          const firstBeat = narrative?.querySelector(
            ':scope > .visual-narrative__beat',
          );
          const sceneControls = figure?.querySelector(
            '.scene-figure__controls',
          );
          const stage = narrative?.querySelector(
            ':scope > .visual-narrative__stage',
          );
          const takeaway = document.querySelector(
            '.learning-guide-takeaway',
          );
          const glossary = document.querySelector(
            '[data-testid="guide-glossary"]',
          );
          const tokenConnectors = Array.from(
            narrative?.querySelectorAll('[data-token-connector]') ?? [],
          );
          const tokenSegmentations = Array.from(
            narrative?.querySelectorAll('[data-token-segmentation]') ?? [],
          );
          const tokenRails = Array.from(
            narrative?.querySelectorAll('[data-token-rail-layout]') ?? [],
          );
          const goldenStage = narrative?.querySelector(
            ':scope > .visual-narrative__stage',
          );
          const goldenCopy = goldenStage?.querySelector(
            ':scope > .visual-narrative__copy',
          );
          const goldenBeat = goldenCopy?.querySelector(
            '.visual-narrative__beat',
          );
          const tokenScene = narrative?.querySelector('.token-golden__scene');
          const stageButtons = Array.from(
            narrative?.querySelectorAll('.visual-narrative__steps button')
              ?? [],
          );
          const allButtons = Array.from(
            narrative?.querySelectorAll('button') ?? [],
          );
          const rect = element => {{
            const box = element?.getBoundingClientRect();
            return box === undefined
              ? null
              : {{
                  top: box.top,
                  right: box.right,
                  bottom: box.bottom,
                  left: box.left,
                  width: box.width,
                  height: box.height,
                }};
          }};
          const style = element =>
            element instanceof Element ? getComputedStyle(element) : null;
          const isRendered = element => {{
            const elementStyle = style(element);
            const box = element?.getBoundingClientRect();
            return elementStyle !== null
              && elementStyle.display !== 'none'
              && elementStyle.visibility !== 'hidden'
              && Number(elementStyle.opacity) > 0.01
              && box !== undefined
              && box.width > 0
              && box.height > 0;
          }};
          const tokenContent = Array.from(
            narrative?.querySelectorAll(
              '.token-golden__conceptual, '
              + '.token-golden__resegment, .token-golden__current',
            ) ?? [],
          ).filter(isRendered);
          const tokenSegmentation = tokenSegmentations
            .filter(isRendered)
            .at(0);
          const tokenRail = tokenRails.filter(isRendered).at(0);
          const tokenRailChips = Array.from(
            tokenRail?.querySelectorAll('.token-golden__chip') ?? [],
          );
          const centerX = element => {{
            const box = element?.getBoundingClientRect();
            return box === undefined ? null : box.left + box.width / 2;
          }};
          const overlaps = (left, right) => {{
            const leftBox = left?.getBoundingClientRect();
            const rightBox = right?.getBoundingClientRect();
            return leftBox !== undefined
              && rightBox !== undefined
              && leftBox.left < rightBox.right
              && leftBox.right > rightBox.left
              && leftBox.top < rightBox.bottom
              && leftBox.bottom > rightBox.top;
          }};
          const narrativeStyle = style(narrative);
          const planeStyle = style(plane);
          const figureStyle = style(figure);
          return {{
            activeBeatCount: narrative?.querySelectorAll(
              '[data-narrative-active="true"]',
            ).length ?? -1,
            allControlMinHeight:
              allButtons.length === 0
                ? 0
                : Math.min(...allButtons.map(button =>
                    button.getBoundingClientRect().height
                  )),
            beatCount:
              narrative?.querySelectorAll('[data-narrative-stage]').length
              ?? -1,
            canvasCount: figure?.querySelectorAll('canvas').length ?? -1,
            captionRect: rect(caption),
            chapterLinksRect: rect(chapterLinks),
            chapterLinksAfterGlossary:
              glossary instanceof Element
              && chapterLinks instanceof Element
              && Boolean(
                glossary.compareDocumentPosition(chapterLinks)
                  & Node.DOCUMENT_POSITION_FOLLOWING,
              ),
            chapterLinksContentBottomGap:
              (rect(curriculumContent)?.bottom ?? 0)
              - (rect(chapterLinks)?.bottom ?? 0),
            chapterLinksContentLast:
              curriculumContent?.lastElementChild === chapterLinks,
            chapterLinksAfterArticle:
              guideArticle instanceof Element
              && chapterLinks instanceof Element
              && Boolean(
                guideArticle.compareDocumentPosition(chapterLinks)
                  & Node.DOCUMENT_POSITION_FOLLOWING,
              ),
            chapterLinksInNarrative:
              narrative?.contains(chapterLinks) ?? false,
            chapterLinksVisible: isRendered(chapterLinks),
            chapterLinkHrefs: chapterLinkAnchors.map(
              link => link.getAttribute('href') ?? '',
            ),
            chapterLinkMinHeight:
              chapterLinkAnchors.length === 0
                ? 0
                : Math.min(...chapterLinkAnchors.map(
                    link => link.getBoundingClientRect().height,
                  )),
            chapterLinksStepsOverlap: overlaps(chapterLinks, deckSteps),
            nextChapterLinkRect: rect(chapterLinkAnchors.at(-1)),
            chapterRect: rect(document.querySelector(
              {json.dumps(_chapter_selector(spec))},
            )),
            documentOverflow: Math.max(
              0,
              document.documentElement.scrollWidth
                - document.documentElement.clientWidth,
            ),
            figureBackground: figureStyle?.backgroundColor ?? '',
            figureBorderWidth: figureStyle?.borderTopWidth ?? '',
            figureRect: rect(figure),
            firstBeatOffsetTop:
              firstBeat instanceof HTMLElement ? firstBeat.offsetTop : -1,
            firstBeatRect: rect(firstBeat),
            glossaryRect: rect(glossary),
            goldenCopyAlignItems: style(goldenCopy)?.alignItems ?? '',
            goldenLeftRect: rect(goldenBeat),
            goldenMobileStackGap:
              (rect(visual)?.top ?? 0) - (rect(goldenBeat)?.bottom ?? 0),
            goldenStageRect: rect(goldenStage),
            goldenVisualAlignItems: style(visual)?.alignItems ?? '',
            headerRect: rect(header),
            internalControlCount:
              sceneControls?.querySelectorAll('button').length ?? 0,
            layout: narrative?.getAttribute('data-narrative-layout') ?? '',
            localOverflow:
              narrative instanceof HTMLElement
                ? Math.max(0, narrative.scrollWidth - narrative.clientWidth)
                : -1,
            narrativeBackground: narrativeStyle?.backgroundColor ?? '',
            narrativeBorderWidth: narrativeStyle?.borderTopWidth ?? '',
            narrativeRect: rect(narrative),
            narrativeTakeawayOverlap: overlaps(narrative, takeaway),
            observerMetrics: window.__narrativeObserverMetrics ?? null,
            planeBackground: planeStyle?.backgroundImage ?? '',
            planeBackgroundColor: planeStyle?.backgroundColor ?? '',
            planeBorderWidth: planeStyle?.borderTopWidth ?? '',
            planeRect: rect(plane),
            previousChapterLinkRect: rect(chapterLinkAnchors.at(0)),
            resegmentResultRect: rect(narrative?.querySelector(
              '.token-golden__resegment-rail',
            )),
            resegmentSourceRect: rect(narrative?.querySelector(
              '.token-golden__word',
            )),
            sceneStatus:
              figure?.querySelector('.scene-figure')
                ?.getAttribute('data-scene-status') ?? '',
            sceneMetrics: {{ ...(window.__learningSceneMetrics ?? {{}}) }},
            sceneViewport:
              figure?.querySelector('.scene-figure')
                ?.getAttribute('data-scene-viewport') ?? '',
            runningAnimations: Array.from(
              stateTarget?.getAnimations({{ subtree: true }}) ?? [],
            ).filter(animation => animation.playState === 'running').length,
            stageButtonCount: stageButtons.length,
            stageControlMinHeight:
              stageButtons.length === 0
                ? 0
                : Math.min(...stageButtons.map(button =>
                    button.getBoundingClientRect().height
                  )),
            state: Object.fromEntries(
              Array.from(stateTarget?.attributes ?? [])
                .filter(attribute => attribute.name.startsWith('data-'))
                .map(attribute => [attribute.name, attribute.value]),
            ),
            stageRect: rect(stage),
            stickyPosition: style(visual)?.position ?? '',
            takeawayGlossaryOverlap: overlaps(takeaway, glossary),
            takeawayRect: rect(takeaway),
            tokenByteRailRect: rect(narrative?.querySelector(
              '.token-golden__byte-rail',
            )),
            tokenMappingCenters: {{
              connector: centerX(tokenConnectors.filter(isRendered).at(0)),
              identity: centerX(narrative?.querySelector(
                '.token-golden__identity',
              )),
              selected: centerX(narrative?.querySelector(
                '[data-token-selected="true"]',
              )),
            }},
            tokenContentRect: rect(tokenContent.at(0)),
            tokenIdentityRect: rect(narrative?.querySelector(
              '.token-golden__identity',
            )),
            tokenRail: tokenRail === undefined
              ? null
              : {{
                  display: style(tokenRail)?.display ?? '',
                  flexWrap: style(tokenRail)?.flexWrap ?? '',
                  layout:
                    tokenRail.getAttribute('data-token-rail-layout') ?? '',
                  rect: rect(tokenRail),
                  chips: tokenRailChips.map(chip => ({{
                    contentCenter: centerX(chip.querySelector(
                      '[data-token-chip-content]',
                    )),
                    flexGrow: style(chip)?.flexGrow ?? '',
                    flexShrink: style(chip)?.flexShrink ?? '',
                    justifyContent: style(chip)?.justifyContent ?? '',
                    rect: rect(chip),
                    width: chip.getBoundingClientRect().width,
                    center: centerX(chip),
                  }})),
                }},
            tokenSegmentation: tokenSegmentation === undefined
              ? null
              : {{
                  boundaryCount: tokenSegmentation.querySelectorAll(
                    '[data-token-segment-boundary]',
                  ).length,
                  rect: rect(tokenSegmentation),
                  segmentCount: tokenSegmentation.querySelectorAll(
                    '[data-token-segment-preview]',
                  ).length,
                  transformation:
                    tokenSegmentation.getAttribute(
                      'data-token-segmentation',
                    ) ?? '',
                }},
            tokenSelectedRect: rect(narrative?.querySelector(
              '[data-token-selected="true"]',
            )),
            tokenSourceRect: rect(narrative?.querySelector(
              '.token-golden__current-source',
            )),
            tokenSceneAlignItems: style(tokenScene)?.alignItems ?? '',
            visualRect: rect(visual),
            visualAlignSelf: style(visual)?.alignSelf ?? '',
            visualOffsetTop:
              visual instanceof HTMLElement ? visual.offsetTop : -1,
            visibleTokenConnectors: tokenConnectors
              .filter(isRendered)
              .map(connector => {{
                const marker = connector.querySelector('marker');
                const arrowhead = marker?.querySelector('path');
                const shaft = connector.querySelector('line');
                return {{
                  arrowheadFill: style(arrowhead)?.fill ?? '',
                  arrowheadPathClosed:
                    arrowhead?.getAttribute('d')?.trim().endsWith('Z') ?? false,
                  connector:
                    connector.getAttribute('data-token-connector') ?? '',
                  direction:
                    connector.getAttribute('data-token-direction') ?? '',
                  markerEnd: shaft?.getAttribute('marker-end') ?? '',
                  markerHeight: Number.parseFloat(
                    marker?.getAttribute('markerHeight') ?? '0',
                  ),
                  markerUnits: marker?.getAttribute('markerUnits') ?? '',
                  markerWidth: Number.parseFloat(
                    marker?.getAttribute('markerWidth') ?? '0',
                  ),
                  pseudoAfter:
                    getComputedStyle(connector, '::after').content,
                  pseudoBefore:
                    getComputedStyle(connector, '::before').content,
                  rect: rect(connector),
                  shaftLength: Math.abs(
                    Number.parseFloat(shaft?.getAttribute('y2') ?? '0')
                      - Number.parseFloat(shaft?.getAttribute('y1') ?? '0'),
                  ),
                  shaftStrokeWidth: Number.parseFloat(
                    shaft?.getAttribute('stroke-width') ?? '0',
                  ),
                  tagName: connector.tagName.toLowerCase(),
                  transformation:
                    connector.getAttribute('data-token-transformation') ?? '',
                }};
              }}),
          }};
        }})()""",
    )


def _number(data: JsonObject, key: str) -> float:
    value = data[key]
    if not isinstance(value, int | float):
        raise TypeError(f"{key} must be numeric: {value!r}")
    return float(value)


def _numeric_value(value: object, label: str) -> float:
    if not isinstance(value, int | float):
        raise TypeError(f"{label} must be numeric: {value!r}")
    return float(value)


def _rect_height(probe: JsonObject, key: str) -> float:
    value = probe[key]
    if not isinstance(value, dict):
        raise TypeError(f"{key} missing: {value!r}")
    height = value.get("height")
    if not isinstance(height, int | float):
        raise TypeError(f"{key}.height missing: {value!r}")
    return float(height)


def _rect_coordinate(probe: JsonObject, key: str, coordinate: str) -> float:
    value = probe[key]
    if not isinstance(value, dict):
        raise TypeError(f"{key} missing: {value!r}")
    coordinate_value = value.get(coordinate)
    if not isinstance(coordinate_value, int | float):
        raise TypeError(f"{key}.{coordinate} missing: {value!r}")
    return float(coordinate_value)


def _assert_probe(
    probe: JsonObject,
    spec: NarrativeSpec,
    width: int,
) -> None:
    is_token = spec.name == "tokenization"
    require(probe["layout"] == spec.layout, f"{spec.name} layout: {probe}")
    require(
        probe["sceneStatus"] == ("" if is_token else "ready"),
        f"{spec.name} renderer state: {probe}",
    )
    require(
        probe["canvasCount"] == (0 if is_token else 1),
        f"{spec.name} Canvas: {probe}",
    )
    require(
        probe["runningAnimations"] == 0,
        f"{spec.name} unsettled animation: {probe}",
    )
    require(
        probe["documentOverflow"] == 0 and probe["localOverflow"] == 0,
        f"{spec.name} overflow at {width}: {probe}",
    )
    require(
        probe["narrativeTakeawayOverlap"] is False
        and probe["takeawayGlossaryOverlap"] is False,
        f"{spec.name} summary/glossary overlap at {width}: {probe}",
    )
    require(
        probe["narrativeBorderWidth"] == "0px"
        and probe["figureBorderWidth"] == "0px"
        and probe["planeBorderWidth"] == "0px",
        f"{spec.name} visible card border: {probe}",
    )
    require(
        probe["narrativeBackground"] in ("rgba(0, 0, 0, 0)", "transparent")
        and probe["figureBackground"] in ("rgba(0, 0, 0, 0)", "transparent")
        and probe["planeBackground"] == "none"
        and probe["planeBackgroundColor"] in (
            "rgba(0, 0, 0, 0)",
            "transparent",
        ),
        f"{spec.name} visible panel background: {probe}",
    )
    if is_token:
        state = probe["state"]
        if not isinstance(state, dict):
            raise TypeError(f"{spec.name} state missing: {probe}")
        token_stage = state.get("data-token-stage")
        if not isinstance(token_stage, str):
            raise TypeError(f"{spec.name} Token stage missing: {probe}")
        connectors = probe["visibleTokenConnectors"]
        if not isinstance(connectors, list):
            raise TypeError(f"{spec.name} connectors missing: {probe}")
        expected_segmentations: dict[
            str,
            tuple[str, int, int, str],
        ] = {
            "not-word": (
                "word-to-token-pieces",
                2,
                1,
                "resegmentSourceRect",
            ),
            "current-byte": (
                "text-to-byte-tokens",
                3,
                2,
                "tokenSourceRect",
            ),
        }
        expected_segmentation = expected_segmentations.get(token_stage)
        if expected_segmentation is not None:
            transformation, segment_count, boundary_count, source_key = (
                expected_segmentation
            )
            segmentation = probe["tokenSegmentation"]
            rail = probe["tokenRail"]
            if not isinstance(segmentation, dict) or not isinstance(rail, dict):
                raise TypeError(
                    f"{spec.name} segmentation geometry missing: {probe}",
                )
            segmentation_rect = segmentation.get("rect")
            rail_rect = rail.get("rect")
            chips = rail.get("chips")
            if (
                not isinstance(segmentation_rect, dict)
                or not isinstance(rail_rect, dict)
                or not isinstance(chips, list)
            ):
                raise TypeError(
                    f"{spec.name} segmentation layout missing: {probe}",
                )
            require(
                len(connectors) == 0
                and segmentation.get("transformation") == transformation
                and segmentation.get("segmentCount") == segment_count
                and segmentation.get("boundaryCount") == boundary_count
                and rail.get("display") == "flex"
                and rail.get("flexWrap") == "nowrap"
                and rail.get("layout") == "intrinsic"
                and len(chips) == segment_count
                and _rect_coordinate(probe, source_key, "bottom")
                <= float(segmentation_rect["top"]) + 1
                and float(segmentation_rect["bottom"])
                <= float(rail_rect["top"]) + 1
                and all(
                    isinstance(chip, dict)
                    and chip.get("flexGrow") == "0"
                    and chip.get("flexShrink") == "0"
                    and chip.get("justifyContent") == "center"
                    and isinstance(chip.get("center"), int | float)
                    and isinstance(chip.get("contentCenter"), int | float)
                    and abs(
                        float(chip["center"])
                        - float(chip["contentCenter"])
                    )
                    <= 1
                    for chip in chips
                )
                and (
                    token_stage != "not-word"
                    or abs(float(chips[0]["width"]) - float(chips[1]["width"]))
                    >= 8
                ),
                f"{spec.name} boundary segmentation at {token_stage}: "
                f"{probe}",
            )
        elif token_stage == "next-token-id":
            require(
                len(connectors) == 1,
                f"{spec.name} mapping connector count: {probe}",
            )
            connector = connectors[0]
            if not isinstance(connector, dict):
                raise TypeError(f"{spec.name} connector invalid: {connector}")
            connector_rect = connector.get("rect")
            centers = probe["tokenMappingCenters"]
            if not isinstance(connector_rect, dict) or not isinstance(
                centers,
                dict,
            ):
                raise TypeError(f"{spec.name} mapping geometry: {probe}")
            connector_top = connector_rect.get("top")
            connector_bottom = connector_rect.get("bottom")
            marker_height_value = _numeric_value(
                connector.get("markerHeight"),
                "mapping arrow marker height",
            )
            marker_width_value = _numeric_value(
                connector.get("markerWidth"),
                "mapping arrow marker width",
            )
            shaft_length_value = _numeric_value(
                connector.get("shaftLength"),
                "mapping arrow shaft length",
            )
            shaft_stroke_value = _numeric_value(
                connector.get("shaftStrokeWidth"),
                "mapping arrow shaft stroke",
            )
            selected_center = centers.get("selected")
            connector_center = centers.get("connector")
            identity_center = centers.get("identity")
            connector_top_value = _numeric_value(
                connector_top,
                "mapping connector top",
            )
            connector_bottom_value = _numeric_value(
                connector_bottom,
                "mapping connector bottom",
            )
            selected_center_value = _numeric_value(
                selected_center,
                "selected Token center",
            )
            connector_center_value = _numeric_value(
                connector_center,
                "mapping connector center",
            )
            identity_center_value = _numeric_value(
                identity_center,
                "Token identity center",
            )
            require(
                connector.get("transformation") == "token-to-id-question"
                and connector.get("connector") == "mapping"
                and connector.get("direction") == "down"
                and connector.get("tagName") == "svg"
                and connector.get("markerUnits") == "strokeWidth"
                and str(connector.get("markerEnd", "")).startswith("url(#")
                and connector.get("arrowheadPathClosed") is True
                and connector.get("arrowheadFill") not in {
                    "",
                    "none",
                    "rgba(0, 0, 0, 0)",
                }
                and connector.get("pseudoBefore") == "none"
                and connector.get("pseudoAfter") == "none"
                and 32 <= shaft_length_value <= 44
                and 1.5 <= shaft_stroke_value <= 2
                and 8 <= marker_height_value * shaft_stroke_value <= 10
                and 6 <= marker_width_value * shaft_stroke_value <= 9
                and _rect_coordinate(probe, "tokenSelectedRect", "bottom")
                <= connector_top_value + 1
                and connector_bottom_value
                <= _rect_coordinate(probe, "tokenIdentityRect", "top") + 1
                and abs(selected_center_value - connector_center_value) <= 1
                and abs(connector_center_value - identity_center_value) <= 1,
                f"{spec.name} mapping centers at {token_stage}: {probe}",
            )
        else:
            require(
                len(connectors) == 0,
                f"{spec.name} unexpected connector at {token_stage}: {probe}",
            )
        require(
            probe["headerRect"] is None
            and _rect_height(probe, "captionRect") <= 1,
            f"{spec.name} duplicated Figure chrome visible: {probe}",
        )
    else:
        require(
            _rect_height(probe, "headerRect") <= 1
            and _rect_height(probe, "captionRect") <= 1,
            f"{spec.name} duplicated Figure chrome visible: {probe}",
        )
    if is_token:
        require(
            probe["activeBeatCount"] == 1
            and probe["beatCount"] == 1
            and probe["stageButtonCount"] == len(spec.states) + 2,
            f"{spec.name} beat state: {probe}",
        )
        stage_left = _rect_coordinate(probe, "stageRect", "left")
        stage_right = _rect_coordinate(probe, "stageRect", "right")
        navigation_left = (
            stage_left
            if width > 768
            else _rect_coordinate(probe, "glossaryRect", "left")
        )
        navigation_right = (
            stage_right
            if width > 768
            else _rect_coordinate(probe, "glossaryRect", "right")
        )
        require(
            probe["chapterLinksVisible"] is True
            and probe["chapterLinksAfterGlossary"] is True
            and probe["chapterLinksAfterArticle"] is True
            and probe["chapterLinksContentLast"] is True
            and probe["chapterLinksInNarrative"] is False
            and probe["chapterLinksStepsOverlap"] is False
            and probe["chapterLinkHrefs"]
            == [
                "#/learn/decoder-only-fundamentals/0-1",
                "#/learn/decoder-only-fundamentals/0-3",
            ]
            and _number(probe, "chapterLinkMinHeight") >= 44
            and 0 <= _number(probe, "chapterLinksContentBottomGap") <= 1
            and _rect_coordinate(probe, "glossaryRect", "bottom")
            <= _rect_coordinate(probe, "chapterLinksRect", "top")
            and abs(
                _rect_coordinate(probe, "chapterLinksRect", "left")
                - navigation_left
            )
            <= 1
            and abs(
                _rect_coordinate(probe, "previousChapterLinkRect", "left")
                - navigation_left
            )
            <= 1
            and abs(
                _rect_coordinate(probe, "chapterLinksRect", "right")
                - navigation_right
            )
            <= 1
            and abs(
                _rect_coordinate(probe, "nextChapterLinkRect", "right")
                - navigation_right
            )
            <= 1,
            f"{spec.name} persistent bottom Chapter links at {width}: {probe}",
        )
        if width > 768:
            stage_top = _rect_coordinate(probe, "goldenStageRect", "top")
            left_top = _rect_coordinate(probe, "goldenLeftRect", "top")
            right_top = _rect_coordinate(probe, "tokenContentRect", "top")
            require(
                24 <= left_top - stage_top <= 48
                and 24 <= right_top - stage_top <= 48
                and abs(left_top - right_top) <= 24,
                f"{spec.name} Golden top alignment at {width}: {probe}",
            )
            require(
                probe["goldenCopyAlignItems"] == "flex-start"
                and probe["goldenVisualAlignItems"] == "flex-start"
                and probe["tokenSceneAlignItems"] == "start",
                f"{spec.name} Golden top styles at {width}: {probe}",
            )
            require(
                431 <= _rect_height(probe, "goldenStageRect") <= 433,
                f"{spec.name} Golden stage height at {width}: {probe}",
            )
        else:
            require(
                0
                <= _number(probe, "goldenMobileStackGap")
                <= 32
                and 385 <= _rect_height(probe, "goldenStageRect") <= 387,
                f"{spec.name} Golden mobile stack at {width}: {probe}",
            )
    else:
        require(
            probe["activeBeatCount"] == 1
            and probe["beatCount"] == len(spec.states),
            f"{spec.name} beat state: {probe}",
        )
        if width > 768:
            require(
                probe["visualAlignSelf"] == "start"
                and abs(
                    _number(probe, "firstBeatOffsetTop")
                    - _number(probe, "visualOffsetTop")
                )
                <= 1,
                f"{spec.name} top-start alignment at {width}: {probe}",
            )
    minimum_control_height = 24 if is_token else 44
    require(
        _number(probe, "stageControlMinHeight") >= minimum_control_height
        and _number(probe, "allControlMinHeight") >= minimum_control_height,
        f"{spec.name} targets: {probe}",
    )
    expected_internal = 2 if spec.name == "embedding" else 0
    require(
        probe["internalControlCount"] == expected_internal,
        f"{spec.name} auxiliary controls: {probe}",
    )
    plane_height = _rect_height(probe, "planeRect")
    compact_mobile = width <= 390
    height_limit = (
        (230 if width <= 768 else 440)
        if is_token
        else {
            "attention": 360 if compact_mobile else 540,
            "embedding": 330 if compact_mobile else 430,
        }[spec.name]
    )
    require(
        100 <= plane_height <= height_limit,
        f"{spec.name} density at {width}: {probe}",
    )
    if width <= 768:
        require(
            probe["stickyPosition"] == "static",
            f"{spec.name} mobile/tablet sticky: {probe}",
        )
    elif spec.layout == "sticky":
        require(
            probe["stickyPosition"] == "sticky",
            f"{spec.name} desktop sticky: {probe}",
        )


def _center_narrative(browser: ChromeSession, spec: NarrativeSpec) -> None:
    browser.require_cdp().evaluate(
        browser.page_session,
        (
            "document.querySelector("
            f"'[data-narrative-layout=\"{spec.layout}\"] "
            ".visual-narrative__visual'"
            ")"
            "?.scrollIntoView({ block: 'center', inline: 'nearest' })"
        ),
        True,
    )
    settle(browser)


def _show_bottom_navigation(browser: ChromeSession) -> None:
    browser.require_cdp().evaluate(
        browser.page_session,
        """document.querySelector(
          '.curriculum-workspace__adjacent-navigation',
        )?.scrollIntoView({ block: 'end', inline: 'nearest' })""",
        True,
    )
    settle(browser)


def _wheel_to_stage(
    browser: ChromeSession,
    spec: NarrativeSpec,
    stage: str,
    *,
    steps: int,
) -> None:
    delta = evaluate_dict(
        browser,
        f"""(() => {{
          const target = document.querySelector(
            '[data-narrative-stage="{stage}"]',
          );
          if (!(target instanceof HTMLElement))
            throw new Error('Narrative beat missing');
          const box = target.getBoundingClientRect();
          return {{ delta: box.top + box.height / 2 - innerHeight / 2 }};
        }})()""",
    )["delta"]
    if not isinstance(delta, int | float):
        raise TypeError(f"Wheel delta missing: {delta!r}")
    if abs(delta) < steps:
        delta = float(steps if delta >= 0 else -steps)
    cdp = browser.require_cdp()
    for _ in range(steps):
        cdp.send(
            "Input.dispatchMouseEvent",
            {
                "type": "mouseWheel",
                "x": 160,
                "y": 300,
                "deltaX": 0,
                "deltaY": float(delta) / steps,
            },
            browser.page_session,
        )
        settle(browser)
    diagnostics = evaluate_dict(
        browser,
        f"""(() => {{
          const target = document.querySelector(
            '[data-narrative-stage="{stage}"]',
          );
          const box = target?.getBoundingClientRect();
          return {{
            active:
              document.querySelector('[data-narrative-active="true"]')
                ?.getAttribute('data-narrative-stage') ?? '',
            observerMetrics: window.__narrativeObserverMetrics ?? null,
            scrollY,
            state:
              document.querySelector(
                '[data-testid="{spec.state_test_id}"]',
              )?.getAttribute('{spec.state_attribute}') ?? '',
            targetBottom: box?.bottom ?? 0,
            targetTop: box?.top ?? 0,
            viewportHeight: innerHeight,
          }};
        }})()""",
    )
    require(
        diagnostics["state"] == stage,
        f"{spec.name} wheel stage {stage}: {diagnostics}",
    )


def _keyboard_stage(
    browser: ChromeSession,
    spec: NarrativeSpec,
    label: str,
    stage: str,
) -> None:
    encoded = json.dumps(label, ensure_ascii=False)
    browser.require_cdp().evaluate(
        browser.page_session,
        (
            "Array.from(document.querySelectorAll("
            "'.visual-narrative__steps button'))"
            f".find(button => button.textContent?.trim() === {encoded})"
            "?.focus()"
        ),
        True,
    )
    cdp = browser.require_cdp()
    for event_type in ("keyDown", "keyUp"):
        cdp.send(
            "Input.dispatchKeyEvent",
            {
                "type": event_type,
                "key": "Enter",
                "code": "Enter",
                "windowsVirtualKeyCode": 13,
            },
            browser.page_session,
        )
    wait_for(
        browser,
        _state_condition(spec, stage),
        f"{spec.name} keyboard stage {stage}",
    )


def _deck_arrow_stage(
    browser: ChromeSession,
    key: str,
    stage: str,
) -> None:
    if key not in ("ArrowLeft", "ArrowRight"):
        raise ValueError(f"Unsupported deck arrow key: {key}")
    browser.require_cdp().evaluate(
        browser.page_session,
        """document.querySelector('[data-deck-action="next"]')?.focus()""",
        True,
    )
    cdp = browser.require_cdp()
    virtual_key = 37 if key == "ArrowLeft" else 39
    for event_type in ("keyDown", "keyUp"):
        cdp.send(
            "Input.dispatchKeyEvent",
            {
                "type": event_type,
                "key": key,
                "code": key,
                "windowsVirtualKeyCode": virtual_key,
            },
            browser.page_session,
        )
    wait_for(
        browser,
        _state_condition(SPECS[0], stage),
        f"tokenization {key} stage {stage}",
    )
    _settle_narrative(browser, SPECS[0])


def _deck_focus_probe(browser: ChromeSession) -> JsonObject:
    probe = evaluate_dict(
        browser,
        """(() => {
          const button = document.querySelector('[data-deck-action="next"]');
          const style =
            button instanceof HTMLElement ? getComputedStyle(button) : null;
          return {
            active: document.activeElement === button,
            focusVisible:
              button instanceof HTMLElement
              && button.matches(':focus-visible'),
            outlineStyle: style?.outlineStyle ?? '',
            outlineWidth: style?.outlineWidth ?? '',
          };
        })()""",
    )
    require(
        probe["active"] is True
        and probe["focusVisible"] is True
        and probe["outlineStyle"] != "none"
        and probe["outlineWidth"] == "1px",
        f"Token deck focus-visible: {probe}",
    )
    return probe


def _set_reduced_motion(browser: ChromeSession, value: str) -> None:
    browser.require_cdp().send(
        "Emulation.setEmulatedMedia",
        {
            "features": [
                {
                    "name": "prefers-reduced-motion",
                    "value": value,
                },
            ],
        },
        browser.page_session,
    )


def _reduced_motion_contract(
    browser: ChromeSession,
    url: str,
) -> JsonObject:
    _set_reduced_motion(browser, "reduce")
    browser.navigate(url)
    browser.require_cdp().evaluate(browser.page_session, READY_PROBE, True)
    tokenization = SPECS[0]
    _open_narrative(browser, tokenization)
    _click_stage(browser, tokenization, "다음 질문", "next-token-id")
    token_probe = _probe(browser, tokenization)
    _assert_probe(token_probe, tokenization, 1440)
    token_motion = evaluate_dict(
        browser,
        """(() => {
          const descendants = Array.from(
            document.querySelectorAll('.token-golden *'),
          );
          return {
            animations: descendants.flatMap(element =>
              element.getAnimations({ subtree: false })
            ).filter(animation => animation.playState === 'running').length,
            reduced:
              matchMedia('(prefers-reduced-motion: reduce)').matches,
          };
        })()""",
    )
    require(
        token_motion == {"animations": 0, "reduced": True},
        f"Token reduced motion: {token_motion}",
    )
    embedding = SPECS[1]
    _open_narrative(browser, embedding)
    wait_for(
        browser,
        """document.querySelector(
          '[data-scene-id="decoder.diagram.representation.embedding"]',
        )?.getAttribute('data-scene-motion') === 'reduced'""",
        "Embedding reduced motion",
    )
    embedding_probe = _probe(browser, embedding)
    _assert_probe(embedding_probe, embedding, 1440)
    return {
        "embedding": embedding_probe,
        "token": token_probe,
        "tokenMotion": token_motion,
    }


def _sticky_probe(browser: ChromeSession, spec: NarrativeSpec) -> JsonObject:
    browser.require_cdp().evaluate(
        browser.page_session,
        """(() => {
          const beat = document.querySelector(
            '[data-narrative-stage="mask"]',
          );
          beat?.scrollIntoView({ block: 'center', inline: 'nearest' });
        })()""",
        True,
    )
    wait_for(browser, _state_condition(spec, "mask"), "Attention sticky mask")
    middle = evaluate_dict(
        browser,
        """(() => {
          const narrative = document.querySelector(
            '[data-narrative-layout="sticky"]',
          );
          const visual = narrative?.querySelector(
            '.visual-narrative__visual',
          );
          const header = document.querySelector('.architecture-header');
          const n = narrative?.getBoundingClientRect();
          const v = visual?.getBoundingClientRect();
          const h = header?.getBoundingClientRect();
          return {
            narrativeBottom: n?.bottom ?? 0,
            visualBottom: v?.bottom ?? 0,
            visualTop: v?.top ?? 0,
            headerBottom: h?.bottom ?? 0,
          };
        })()""",
    )
    require(
        _number(middle, "visualTop") >= _number(middle, "headerBottom"),
        f"Attention sticky covers Header: {middle}",
    )
    require(
        _number(middle, "visualBottom") <= _number(middle, "narrativeBottom"),
        f"Attention sticky escapes narrative: {middle}",
    )
    browser.require_cdp().evaluate(
        browser.page_session,
        """document.querySelector('.learning-guide-takeaway')
          ?.scrollIntoView({ block: 'center', inline: 'nearest' })""",
        True,
    )
    settle(browser)
    ending = evaluate_dict(
        browser,
        """(() => {
          const visual = document.querySelector(
            '[data-narrative-layout="sticky"] .visual-narrative__visual',
          );
          const following = document.querySelector(
            '.learning-guide-takeaway',
          );
          const v = visual?.getBoundingClientRect();
          const f = following?.getBoundingClientRect();
          return {
            overlap:
              v !== undefined
              && f !== undefined
              && v.bottom > f.top
              && v.top < f.bottom,
          };
        })()""",
    )
    require(ending["overlap"] is False, f"Attention sticky overlap: {ending}")
    return {"middle": middle, "ending": ending}


def _baseline_contract(url: str, evidence: Path) -> JsonObject:
    screenshots = evidence / "before"
    result: JsonObject = {}
    with ChromeSession(enable_gpu=True) as browser:
        set_viewport(browser, 1440, 900)
        browser.navigate(url)
        browser.require_cdp().evaluate(browser.page_session, READY_PROBE, True)
        for spec in SPECS:
            _open_chapter(browser, spec)
            target = f'[data-figure-id="{spec.figure_id}"]'
            browser.require_cdp().evaluate(
                browser.page_session,
                (
                    f"document.querySelector({json.dumps(target)})"
                    "?.scrollIntoView({ block: 'center', inline: 'nearest' })"
                ),
                True,
            )
            settle(browser)
            result[f"{spec.name}Viewport"] = capture(
                browser,
                screenshots / f"{spec.name}-before-1440x900.png",
            )
            result[f"{spec.name}Chapter"] = _capture_chapter(
                browser,
                _chapter_selector(spec),
                screenshots / f"{spec.name}-before-chapter-1440.png",
            )
    return result


def _candidate_contract(url: str, evidence: Path) -> JsonObject:
    screenshots = evidence / "after"
    result: JsonObject = {}
    with ChromeSession(enable_gpu=True) as browser:
        _install_observer_probe(browser)
        set_viewport(browser, 1440, 900)
        browser.navigate(url)
        browser.require_cdp().evaluate(browser.page_session, READY_PROBE, True)

        state_evidence: JsonObject = {}
        for spec in SPECS:
            _open_narrative(browser, spec)
            states: JsonObject = {}
            heights: list[float] = []
            for label, state in spec.states:
                _center_narrative(browser, spec)
                _click_stage(browser, spec, label, state)
                probe = _probe(browser, spec)
                _assert_probe(probe, spec, 1440)
                state_data = probe["state"]
                require(
                    isinstance(state_data, dict)
                    and state_data.get(spec.state_attribute) == state,
                    f"{spec.name} captured wrong state {state}: {probe}",
                )
                heights.append(_rect_height(probe, "visualRect"))
                states[state] = probe
                capture(
                    browser,
                    screenshots / f"{spec.name}-{state}-1440x900.png",
                )
            require(
                max(heights) - min(heights) <= 1,
                f"{spec.name} state height shift: {heights}",
            )
            if spec.name == "tokenization":
                _show_bottom_navigation(browser)
                result["tokenizationBottomNavigation"] = capture(
                    browser,
                    screenshots / "tokenization-bottom-navigation-1440x900.png",
                )
            result[f"{spec.name}Chapter"] = _capture_chapter(
                browser,
                _chapter_selector(spec),
                screenshots / f"{spec.name}-after-chapter-1440.png",
            )
            idle = _verify_idle(browser)
            require(
                idle == 0,
                f"{spec.name} idle RAF: {idle}; probe={_probe(browser, spec)}",
            )
            state_evidence[spec.name] = {
                "states": states,
                "idleFrameDelta": idle,
            }

        # Natural wheel, keyboard, and history are independent access paths.
        tokenization = SPECS[0]
        _open_narrative(browser, tokenization)
        _click_stage(browser, tokenization, "Token", "token-units")
        _deck_arrow_stage(browser, "ArrowRight", "not-word")
        _deck_arrow_stage(browser, "ArrowLeft", "token-units")
        focus_visible = _deck_focus_probe(browser)
        reduced_motion = _reduced_motion_contract(browser, url)
        _set_reduced_motion(browser, "no-preference")
        browser.navigate(url)
        browser.require_cdp().evaluate(browser.page_session, READY_PROBE, True)
        attention = SPECS[2]
        _open_narrative(browser, attention)
        _click_stage(browser, attention, "Overview", "overview")
        browser.require_cdp().evaluate(
            browser.page_session,
            """window.scrollTo({ top: 0, left: 0, behavior: 'instant' })""",
            True,
        )
        settle(browser)
        _wheel_to_stage(browser, attention, "qkv", steps=6)
        _wheel_to_stage(browser, attention, "scores", steps=1)
        _keyboard_stage(browser, attention, "Value", "value")
        _open_chapter(browser, SPECS[1])
        wait_for(
            browser,
            _state_condition(SPECS[1], "id"),
            "Embedding deterministic entrance",
        )
        wait_for(
            browser,
            _state_condition(attention, "overview"),
            "Attention back navigation initial state",
            "history.back();",
        )
        history_state = evaluate_dict(
            browser,
            """(() => ({
              hash: location.hash,
              stage: document.querySelector(
                '[data-testid="attention-scene-state"]',
              )?.getAttribute('data-stage') ?? '',
            }))()""",
        )
        require(
            history_state["stage"] == "overview",
            f"Attention history state: {history_state}",
        )

        # Six widths × three narratives.
        matrix: list[JsonObject] = []
        for width, height in VIEWPORTS:
            set_viewport(browser, width, height)
            for spec in SPECS:
                _open_narrative(browser, spec)
                _center_narrative(browser, spec)
                probe = _probe(browser, spec)
                _assert_probe(probe, spec, width)
                matrix.append(
                    {
                        "width": width,
                        "height": height,
                        "name": spec.name,
                        **probe,
                    },
                )
        tokenization = SPECS[0]
        mapping_viewports: list[JsonObject] = []
        mapping_label, mapping_state = tokenization.states[-1]
        for width, height in VIEWPORTS:
            set_viewport(browser, width, height)
            _open_narrative(browser, tokenization)
            _center_narrative(browser, tokenization)
            _click_stage(
                browser,
                tokenization,
                mapping_label,
                mapping_state,
            )
            probe = _probe(browser, tokenization)
            _assert_probe(probe, tokenization, width)
            mapping_viewports.append(
                {
                    "width": width,
                    "height": height,
                    **probe,
                },
            )
            capture(
                browser,
                screenshots
                / f"tokenization-next-token-id-{width}x{height}.png",
            )
        result["mappingViewports"] = mapping_viewports
        set_viewport(browser, 1440, 900)
        _open_narrative(browser, attention)
        sticky = _sticky_probe(browser, attention)

        # Mobile main states.
        set_viewport(browser, 390, 844)
        mobile_token_states: JsonObject = {}
        for spec in SPECS:
            _open_narrative(browser, spec)
            _center_narrative(browser, spec)
            mobile_states = (
                spec.states if spec.name == "tokenization" else spec.states[-1:]
            )
            for label, state in mobile_states:
                _click_stage(browser, spec, label, state)
                probe = _probe(browser, spec)
                _assert_probe(probe, spec, 390)
                state_data = probe["state"]
                require(
                    isinstance(state_data, dict)
                    and state_data.get(spec.state_attribute) == state,
                    (
                        f"{spec.name} mobile captured wrong state "
                        f"{state}: {probe}"
                    ),
                )
                if spec.name == "tokenization":
                    mobile_token_states[state] = probe
                capture(
                    browser,
                    screenshots / f"{spec.name}-{state}-390x844.png",
                )
            if spec.name == "tokenization":
                _show_bottom_navigation(browser)
                capture(
                    browser,
                    screenshots / "tokenization-bottom-navigation-390x844.png",
                )
                result["tokenizationMobileChapter"] = _capture_chapter(
                    browser,
                    _chapter_selector(spec),
                    screenshots / "tokenization-after-chapter-390.png",
                )
        result["mobileTokenStates"] = mobile_token_states

        # All narrative and scene observers disconnect after leaving Learn.
        navigate_hash(
            browser,
            "#/",
            "document.querySelector('[data-narrative-layout]') === null",
            "Home after narratives",
        )
        observer_metrics = evaluate_dict(
            browser,
            "window.__narrativeObserverMetrics",
        )
        require(
            observer_metrics["active"] == 0,
            f"Narrative observers leaked: {observer_metrics}",
        )
        errors = browser_errors(browser)
        require(not errors["runtime"], f"Runtime errors: {errors}")
        require(not errors["network"], f"Network errors: {errors}")
        result.update(
            {
                "errors": errors,
                "focusVisible": focus_visible,
                "history": history_state,
                "matrix": matrix,
                "observerMetrics": observer_metrics,
                "reducedMotion": reduced_motion,
                "states": state_evidence,
                "sticky": sticky,
            },
        )
    return result


def _serve(root: Path) -> tuple[ThreadingHTTPServer, threading.Thread, str]:
    server = ThreadingHTTPServer(
        ("127.0.0.1", 0),
        partial(QuietHandler, directory=str(root.resolve())),
    )
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    return server, thread, f"http://127.0.0.1:{server.server_port}/"


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--baseline-root", type=Path, required=True)
    parser.add_argument("--candidate-root", type=Path, required=True)
    parser.add_argument("--candidate-base", default="/")
    parser.add_argument("--evidence", type=Path, required=True)
    args = parser.parse_args()

    baseline_server, baseline_thread, baseline_url = _serve(args.baseline_root)
    try:
        baseline = _baseline_contract(baseline_url, args.evidence)
    finally:
        baseline_server.shutdown()
        baseline_server.server_close()
        baseline_thread.join(timeout=10)

    candidate_server, candidate_thread, candidate_url = _serve(
        args.candidate_root,
    )
    try:
        candidate = _candidate_contract(
            f"{candidate_url.rstrip('/')}{args.candidate_base}",
            args.evidence,
        )
    finally:
        candidate_server.shutdown()
        candidate_server.server_close()
        candidate_thread.join(timeout=10)

    args.evidence.mkdir(parents=True, exist_ok=True)
    (args.evidence / "evidence.json").write_text(
        json.dumps(
            {"baseline": baseline, "candidate": candidate},
            ensure_ascii=False,
            indent=2,
        )
        + "\n",
    )
    print("Learn Visual Narrative browser: PASS")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
