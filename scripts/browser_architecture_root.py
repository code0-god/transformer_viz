#!/usr/bin/env python3
# /// script
# requires-python = ">=3.12"
# dependencies = []
# ///
# ─── How to run ───
# uv run scripts/browser_architecture_root.py
"""Capture and verify the final Root GPT Architecture in real Chrome."""

from __future__ import annotations

import base64
import json
from pathlib import Path
from typing import Final, TypedDict

from browser_probes import READY_PROBE
from browser_session import ChromeSession

URL: Final = "http://127.0.0.1:8080/"
SCREENSHOT: Final = Path("docs/screenshots/architecture-root-final.png")
WIDTH: Final = 1440
HEIGHT: Final = 900

ROOT_ARCHITECTURE_PROBE: Final = r"""
(() => {
  const required = selector => {
    const element = document.querySelector(selector);
    if (!element) throw new Error(`missing ${selector}`);
    return element;
  };
  const diagram = required('.architecture-diagram');
  const block = required('.architecture-block-group');
  const repeat = required('.architecture-repeat');
  const architecture = required('.architecture-shell');
  const prompt = required('.generation-bar');
  const decoded = required('.generation-timeline');
  const repeatStyle = getComputedStyle(repeat);
  const canvasStyle = getComputedStyle(required('.architecture-svg-scroll'));
  const bounds = selector => required(selector).getBoundingClientRect();
  const numberAttribute = (element, name) => Number(element.getAttribute(name));
  const svgRect = selector => {
    const element = required(selector);
    return {
      x: numberAttribute(element, 'x'),
      y: numberAttribute(element, 'y'),
      width: numberAttribute(element, 'width'),
      height: numberAttribute(element, 'height'),
    };
  };
  const centerX = rect => rect.x + rect.width / 2;
  const bottom = rect => rect.y + rect.height;
  const gap = (before, after) =>
    Math.round(bounds(after).top - bounds(before).bottom);
  const outputGaps = [
    gap('.architecture-node-normalization rect', '.architecture-node-projection rect'),
    gap('.architecture-node-projection rect', '.architecture-node-logits rect'),
    gap('.architecture-node-logits rect', '.architecture-node-sampling rect'),
    gap('.architecture-node-sampling rect', '.architecture-node-token rect'),
    gap('.architecture-node-token rect', '.architecture-node-append rect'),
  ];
  const shortFlowCount = [...document.querySelectorAll('.architecture-flow')]
    .map(element => element.getBoundingClientRect())
    .filter(rect => Math.max(rect.width, rect.height) < 6).length;
  const addCircle = required('.architecture-add');
  const addCenter = {
    x: Number(addCircle.getAttribute('cx')),
    y: Number(addCircle.getAttribute('cy')),
    radius: Number(addCircle.getAttribute('r')),
  };
  const mergeEndpointError = Math.max(
    ...[...document.querySelectorAll('.architecture-merge')].map(path => {
      const endpoint = path.getPointAtLength(path.getTotalLength());
      const distance = Math.hypot(
        endpoint.x - addCenter.x,
        endpoint.y - addCenter.y,
      );
      return Math.abs(distance - addCenter.radius);
    }),
  );
  const inputRect = svgRect('.architecture-node-input rect');
  const hiddenRect = svgRect('.architecture-node-hidden rect');
  const mainCenter = centerX(inputRect);
  const embeddingRects = [...document.querySelectorAll('.architecture-node-embedding rect')]
    .map(element => ({
      x: numberAttribute(element, 'x'),
      y: numberAttribute(element, 'y'),
      width: numberAttribute(element, 'width'),
      height: numberAttribute(element, 'height'),
    }));
  const frameRect = svgRect('.architecture-block-frame');
  const moduleRects = [...document.querySelectorAll('.architecture-block-module rect')]
    .map(element => ({
      x: numberAttribute(element, 'x'),
      y: numberAttribute(element, 'y'),
      width: numberAttribute(element, 'width'),
      height: numberAttribute(element, 'height'),
    }));
  const outputRects = [
    '.architecture-node-normalization rect',
    '.architecture-node-projection rect',
    '.architecture-node-logits rect',
    '.architecture-node-sampling rect',
    '.architecture-node-token rect',
    '.architecture-node-append rect',
  ].map(svgRect);
  const mainRects = [
    inputRect,
    hiddenRect,
    frameRect,
    ...moduleRects,
    ...outputRects,
  ];
  const outputSvgGaps = outputRects.slice(1).map(
    (rect, index) => rect.y - bottom(outputRects[index]),
  );
  const residualCircles = [...document.querySelectorAll('.architecture-residual-add')]
    .map(element => ({
      x: numberAttribute(element, 'cx'),
      y: numberAttribute(element, 'cy'),
      radius: numberAttribute(element, 'r'),
    }));
  const internalGaps = [
    moduleRects[1].y - bottom(moduleRects[0]),
    residualCircles[0].y - residualCircles[0].radius - bottom(moduleRects[1]),
    moduleRects[2].y - (residualCircles[0].y + residualCircles[0].radius),
    moduleRects[3].y - bottom(moduleRects[2]),
    residualCircles[1].y - residualCircles[1].radius - bottom(moduleRects[3]),
  ];
  const standardInternalGaps = internalGaps.filter((_, index) => index !== 2);
  const residualPaths = [...document.querySelectorAll('.architecture-residual')];
  const residualEndpointError = Math.max(
    ...residualPaths.map((path, index) => {
      const endpoint = path.getPointAtLength(path.getTotalLength());
      const circle = residualCircles[index];
      return Math.abs(
        Math.hypot(endpoint.x - circle.x, endpoint.y - circle.y) - circle.radius,
      );
    }),
  );
  const residualRailX = Math.max(
    ...residualPaths.map(path => path.getBBox().x + path.getBBox().width),
  );
  const moduleRight = moduleRects[0].x + moduleRects[0].width;
  const frameRight = frameRect.x + frameRect.width;
  const forwardGuide = required('.architecture-forward-guide');
  const finalRect = outputRects[0];
  const blockExit = [...document.querySelectorAll('line.architecture-flow')]
    .find(line => numberAttribute(line, 'y2') === finalRect.y);
  const moduleElements = [...document.querySelectorAll('.architecture-block-module rect')];
  const residualElements = [...document.querySelectorAll('.architecture-residual-add')];
  const finalElement = required('.architecture-node-normalization rect');
  const connectorTargets = [
    ['hidden-to-ln1', moduleElements[0], {
      x: centerX(moduleRects[0]),
      y: moduleRects[0].y,
    }],
    ['attention-to-add1', residualElements[0], {
      x: residualCircles[0].x,
      y: residualCircles[0].y - residualCircles[0].radius,
    }],
    ['add1-to-ln2', moduleElements[2], {
      x: centerX(moduleRects[2]),
      y: moduleRects[2].y,
    }],
    ['ln2-to-mlp', moduleElements[3], {
      x: centerX(moduleRects[3]),
      y: moduleRects[3].y,
    }],
    ['mlp-to-add2', residualElements[1], {
      x: residualCircles[1].x,
      y: residualCircles[1].y - residualCircles[1].radius,
    }],
    ['add2-to-final', finalElement, {
      x: centerX(finalRect),
      y: finalRect.y,
    }],
  ];
  const connectorChecks = connectorTargets.map(([name, target, endpoint]) => {
    const connector = document.querySelector(`[data-connector="${name}"]`);
    if (!connector) return {missing: 1, endpointError: 999, paintOrderError: 1};
    const actual = connector.tagName.toLowerCase() === 'line'
      ? {
          x: numberAttribute(connector, 'x2'),
          y: numberAttribute(connector, 'y2'),
        }
      : connector.getPointAtLength(connector.getTotalLength());
    const paintsAfterTarget = Boolean(
      target.compareDocumentPosition(connector) & Node.DOCUMENT_POSITION_FOLLOWING
    );
    return {
      missing: 0,
      endpointError: Math.hypot(actual.x - endpoint.x, actual.y - endpoint.y),
      paintOrderError: paintsAfterTarget ? 0 : 1,
    };
  });
  const junctionElements = [
    ...document.querySelectorAll('.architecture-residual-junction'),
  ];
  const junctionRanges = [
    [bottom(hiddenRect), moduleRects[0].y],
    [residualCircles[0].y + residualCircles[0].radius, moduleRects[2].y],
  ];
  const junctionSourceConnectors = [
    document.querySelector('[data-connector="hidden-to-ln1"]'),
    document.querySelector('[data-connector="add1-to-ln2"]'),
  ];
  const junctionChecks = residualPaths.map((path, index) => {
    const junction = junctionElements[index];
    const sourceConnector = junctionSourceConnectors[index];
    if (!junction || !sourceConnector) {
      return {originError: 999, rangeError: 1, paintOrderError: 1};
    }
    const origin = path.getPointAtLength(0);
    const center = {
      x: numberAttribute(junction, 'cx'),
      y: numberAttribute(junction, 'cy'),
    };
    const [rangeStart, rangeEnd] = junctionRanges[index];
    const paintsAfterPath = Boolean(
      path.compareDocumentPosition(junction) & Node.DOCUMENT_POSITION_FOLLOWING
    );
    const paintsAfterSpine = Boolean(
      sourceConnector.compareDocumentPosition(junction)
        & Node.DOCUMENT_POSITION_FOLLOWING
    );
    return {
      originError: Math.hypot(origin.x - center.x, origin.y - center.y),
      rangeError:
        center.x === mainCenter && center.y > rangeStart && center.y < rangeEnd ? 0 : 1,
      paintOrderError: paintsAfterPath && paintsAfterSpine ? 0 : 1,
    };
  });
  const residual2Flow = required('[data-connector="add1-to-ln2"]');
  const arrowVisualLength =
    numberAttribute(required('#architecture-arrow'), 'markerWidth') *
    Number.parseFloat(getComputedStyle(residual2Flow).strokeWidth);
  const residual2OpticalMidpoint =
    (junctionRanges[1][0] + junctionRanges[1][1] - arrowVisualLength) / 2;
  return {
    status: required('#status').dataset.status ?? '',
    blockGroups: document.querySelectorAll('.architecture-block-group').length,
    blockLabel: block.textContent?.replace(/\s+/g, ' ').trim() ?? '',
    residualPaths: document.querySelectorAll('.architecture-residual').length,
    repeatPath: repeat.getAttribute('d') ?? '',
    repeatDash: repeatStyle.strokeDasharray,
    repeatMarkerStart: repeatStyle.markerStart,
    repeatMarkerEnd: repeatStyle.markerEnd,
    mergeMarkerEnd: getComputedStyle(required('.architecture-merge')).markerEnd,
    fullForward: diagram.textContent?.includes('FULL FORWARD') ?? false,
    contextUpdate: diagram.textContent?.includes('CONTEXT UPDATE') ?? false,
    gridBackground: canvasStyle.backgroundImage,
    forbiddenPanels: document.querySelectorAll(
      '.architecture-map, .inspector, .stage-rail, .playback-controls'
    ).length,
    documentOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    architectureHeight: Math.round(architecture.getBoundingClientRect().height),
    promptHeight: Math.round(prompt.getBoundingClientRect().height),
    decodedHeight: Math.round(decoded.getBoundingClientRect().height),
    minOutputGap: Math.min(...outputGaps),
    shortFlowCount,
    inputScale: bounds('.architecture-node-input rect').width / inputRect.width,
    mergeEndpointError,
    mainCenterError: Math.max(
      ...mainRects.map(rect => Math.abs(centerX(rect) - mainCenter)),
    ),
    embeddingSymmetryError: Math.abs(
      (centerX(embeddingRects[0]) + centerX(embeddingRects[1])) / 2 - mainCenter,
    ),
    outputGapMin: Math.min(...outputSvgGaps),
    outputGapSpread: Math.max(...outputSvgGaps) - Math.min(...outputSvgGaps),
    internalGapMin: Math.min(...standardInternalGaps),
    internalGapSpread:
      Math.max(...standardInternalGaps) - Math.min(...standardInternalGaps),
    add1ToLayerNorm2Gap: internalGaps[2],
    residualEndpointError,
    residualRailBalance: Math.abs(
      residualRailX - moduleRight - (frameRight - residualRailX),
    ),
    forwardGuideBoundsError:
      Math.abs(numberAttribute(forwardGuide, 'y1') - frameRect.y)
      + Math.abs(numberAttribute(forwardGuide, 'y2') - bottom(frameRect)),
    blockExitError: blockExit
      ? Math.abs(
          numberAttribute(blockExit, 'y1')
          - (residualCircles[1].y + residualCircles[1].radius),
        )
      : 999,
    markerRefX: numberAttribute(required('#architecture-arrow'), 'refX'),
    connectorMissingCount: connectorChecks.reduce(
      (sum, check) => sum + check.missing,
      0,
    ),
    connectorEndpointError: Math.max(
      ...connectorChecks.map(check => check.endpointError),
    ),
    connectorPaintOrderErrors: connectorChecks.reduce(
      (sum, check) => sum + check.paintOrderError,
      0,
    ),
    diagramWidth: Math.round(bounds('.architecture-diagram').width),
    residualJunctionCount: junctionElements.length,
    residualJunctionOriginError: Math.max(
      ...junctionChecks.map(check => check.originError),
    ),
    residualJunctionRangeErrors: junctionChecks.reduce(
      (sum, check) => sum + check.rangeError,
      0,
    ),
    residualJunctionPaintOrderErrors: junctionChecks.reduce(
      (sum, check) => sum + check.paintOrderError,
      0,
    ),
    residual2JunctionOpticalMidpointError: junctionElements[1]
      ? Math.abs(
          numberAttribute(junctionElements[1], 'cy') -
            residual2OpticalMidpoint,
        )
      : 999,
  };
})()
"""


class RootArchitectureState(TypedDict):
    """Browser-observed Root Architecture contracts."""

    status: str
    blockGroups: int
    blockLabel: str
    residualPaths: int
    repeatPath: str
    repeatDash: str
    repeatMarkerStart: str
    repeatMarkerEnd: str
    mergeMarkerEnd: str
    fullForward: bool
    contextUpdate: bool
    gridBackground: str
    forbiddenPanels: int
    documentOverflow: int
    architectureHeight: int
    promptHeight: int
    decodedHeight: int
    minOutputGap: int
    shortFlowCount: int
    inputScale: float
    mergeEndpointError: float
    mainCenterError: float
    embeddingSymmetryError: float
    outputGapMin: float
    outputGapSpread: float
    internalGapMin: float
    internalGapSpread: float
    add1ToLayerNorm2Gap: float
    residualEndpointError: float
    residualRailBalance: float
    forwardGuideBoundsError: float
    blockExitError: float
    markerRefX: float
    connectorMissingCount: int
    connectorEndpointError: float
    connectorPaintOrderErrors: int
    diagramWidth: int
    residualJunctionCount: int
    residualJunctionOriginError: float
    residualJunctionRangeErrors: int
    residualJunctionPaintOrderErrors: int
    residual2JunctionOpticalMidpointError: float


def failures_for(state: RootArchitectureState) -> list[str]:
    """Return objective Root Architecture contract failures."""
    failures: list[str] = []
    if state["status"] != "ready":
        failures.append(f"model status is {state['status']!r}")
    if state["blockGroups"] != 1 or "Transformer Block × 2" not in state["blockLabel"]:
        failures.append(f"repeated Block group is wrong: {state['blockLabel']!r}")
    if state["residualPaths"] != 2:
        failures.append(f"expected two residual paths, got {state['residualPaths']}")
    if "H 80 V" not in state["repeatPath"]:
        failures.append(f"Context Update is not orthogonal: {state['repeatPath']!r}")
    if state["repeatDash"] == "none":
        failures.append("Context Update is not dashed")
    if state["repeatMarkerStart"] != "none" or state["repeatMarkerEnd"] == "none":
        failures.append("Context Update arrowhead is not input-only")
    if state["mergeMarkerEnd"] == "none":
        failures.append("Embedding merge paths have no arrowheads")
    if state["minOutputGap"] < 16:
        failures.append(f"output node gap is too tight: {state['minOutputGap']}px")
    if state["shortFlowCount"] != 0:
        failures.append(f"connectors shorter than marker: {state['shortFlowCount']}")
    if state["inputScale"] < 0.8:
        failures.append(f"diagram is height-compressed: {state['inputScale']:.2f}x")
    if state["mergeEndpointError"] > 1:
        failures.append(
            f"Embedding arrows miss addition circle by {state['mergeEndpointError']:.1f}px"
        )
    if state["mainCenterError"] != 0:
        failures.append(f"main nodes miss centerline by {state['mainCenterError']}")
    if state["embeddingSymmetryError"] != 0:
        failures.append(
            f"Embedding pair is asymmetric by {state['embeddingSymmetryError']}"
        )
    if state["outputGapMin"] != 24 or state["outputGapSpread"] != 0:
        failures.append(
            "output rhythm is inconsistent: "
            f"min={state['outputGapMin']}, spread={state['outputGapSpread']}"
        )
    if state["internalGapMin"] != 24 or state["internalGapSpread"] != 0:
        failures.append(
            "Block rhythm is inconsistent: "
            f"min={state['internalGapMin']}, spread={state['internalGapSpread']}"
        )
    if state["add1ToLayerNorm2Gap"] != 36:
        failures.append(
            "Add 1 to LayerNorm 2 gap is not extended: "
            f"{state['add1ToLayerNorm2Gap']}"
        )
    if state["residualEndpointError"] > 1:
        failures.append(
            f"residual arrows miss Add circles by {state['residualEndpointError']}"
        )
    if state["residualRailBalance"] != 0:
        failures.append(
            f"residual rail clearance is unbalanced by {state['residualRailBalance']}"
        )
    if state["forwardGuideBoundsError"] != 0:
        failures.append(
            f"Full Forward guide misses Block bounds by {state['forwardGuideBoundsError']}"
        )
    if state["blockExitError"] != 0:
        failures.append(f"Block exit starts inside Add circle by {state['blockExitError']}")
    if state["markerRefX"] != 10:
        failures.append(f"arrow marker tip is offset: refX={state['markerRefX']}")
    if state["connectorMissingCount"] != 0:
        failures.append(
            f"named connector contracts missing: {state['connectorMissingCount']}"
        )
    if state["connectorEndpointError"] > 0.1:
        failures.append(
            f"connector endpoints miss targets by {state['connectorEndpointError']}"
        )
    if state["connectorPaintOrderErrors"] != 0:
        failures.append(
            f"connectors painted beneath targets: {state['connectorPaintOrderErrors']}"
        )
    if state["diagramWidth"] > 840:
        failures.append(f"diagram remains oversized: {state['diagramWidth']}px")
    if state["residualJunctionCount"] != 2:
        failures.append(
            f"expected two residual junctions, got {state['residualJunctionCount']}"
        )
    if state["residualJunctionOriginError"] > 0.1:
        failures.append(
            "residual paths do not start at junctions: "
            f"{state['residualJunctionOriginError']}"
        )
    if state["residualJunctionRangeErrors"] != 0:
        failures.append(
            f"residual junctions are outside source spans: "
            f"{state['residualJunctionRangeErrors']}"
        )
    if state["residualJunctionPaintOrderErrors"] != 0:
        failures.append(
            f"residual junctions are hidden beneath lines: "
            f"{state['residualJunctionPaintOrderErrors']}"
        )
    if state["residual2JunctionOpticalMidpointError"] > 0.5:
        failures.append(
            "Residual 2 does not branch at Add 1 → LayerNorm 2 optical midpoint: "
            f"{state['residual2JunctionOpticalMidpointError']}"
        )
    if not state["fullForward"] or not state["contextUpdate"]:
        failures.append("Full Forward and Context Update labels are not distinct")
    if state["gridBackground"] != "none":
        failures.append(f"architecture grid remains: {state['gridBackground']!r}")
    if state["forbiddenPanels"] != 0:
        failures.append(f"forbidden persistent panels rendered: {state['forbiddenPanels']}")
    if state["documentOverflow"] != 0:
        failures.append(f"document horizontal overflow: {state['documentOverflow']}px")
    if state["architectureHeight"] <= state["promptHeight"] + state["decodedHeight"]:
        failures.append("Architecture lacks dominant visual weight")
    return failures


def main() -> int:
    """Run bounded Chrome verification and write the requested screenshot."""
    with ChromeSession() as browser:
        cdp = browser.require_cdp()
        session = browser.page_session
        cdp.send(
            "Emulation.setDeviceMetricsOverride",
            {
                "width": WIDTH,
                "height": HEIGHT,
                "deviceScaleFactor": 1,
                "mobile": False,
            },
            session,
        )
        browser.navigate(URL)
        cdp.evaluate(session, READY_PROBE, True)
        browser.session_barrier()
        state: RootArchitectureState = cdp.evaluate(session, ROOT_ARCHITECTURE_PROBE)
        failures = failures_for(state)
        image = cdp.send(
            "Page.captureScreenshot",
            {"format": "png", "captureBeyondViewport": True},
            session,
        )["data"]
        SCREENSHOT.parent.mkdir(parents=True, exist_ok=True)
        SCREENSHOT.write_bytes(base64.b64decode(image))

    print(json.dumps(state, ensure_ascii=False, sort_keys=True))
    if failures:
        print("\n".join(f"- {failure}" for failure in failures))
        return 1
    print(f"Root Architecture Chrome contract: PASS ({SCREENSHOT})")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
