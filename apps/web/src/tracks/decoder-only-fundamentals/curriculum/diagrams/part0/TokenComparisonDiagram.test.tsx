import { render } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";

import { VisualNarrativeContext } from "../../../../visualNarrativeContext";
import {
  TOKEN_GOLDEN_STAGES,
  TokenComparisonDiagram,
  type TokenGoldenStage,
} from "./TokenComparisonDiagram";

function renderStage(stage: TokenGoldenStage) {
  return render(
    <VisualNarrativeContext.Provider
      value={{ activeStage: stage, selectStage: vi.fn() }}
    >
      <TokenComparisonDiagram />
    </VisualNarrativeContext.Provider>,
  );
}

describe("TokenComparisonDiagram Golden narrative", () => {
  test("exposes five semantic stages from one persistent visual", () => {
    const { container } = render(<TokenComparisonDiagram />);

    expect(
      Array.from(container.querySelectorAll("[data-token-fallback-stage]")).map(
        (item) => item.getAttribute("data-token-fallback-stage"),
      ),
    ).toEqual(TOKEN_GOLDEN_STAGES);
    expect(container.querySelectorAll("[role='img']")).toHaveLength(1);
    expect(container.querySelector("canvas")).toBeNull();
  });

  test("starts with conceptual boundaries on the inherited sentence", () => {
    const { container } = renderStage("why-split");

    expect(
      container.querySelector("[data-token-stage='why-split']"),
    ).not.toBeNull();
    expect(container.querySelector("[data-token-sentence]")).not.toBeNull();
    expect(container.querySelectorAll("[data-token-boundary]")).toHaveLength(4);
    expect(
      container.querySelector("[data-token-example='conceptual']"),
    ).not.toBeNull();
  });

  test("turns the sentence into five ordered text units", () => {
    const { container } = renderStage("token-units");

    expect(
      container.querySelectorAll("[data-token-sequence='conceptual']"),
    ).toHaveLength(5);
    expect(container.querySelectorAll("[data-token-ordinal]")).toHaveLength(5);
  });

  test("shows one word with an alternative two-token boundary", () => {
    const { container } = renderStage("not-word");

    expect(
      container.querySelectorAll("[data-token-resegmentation='whole']"),
    ).toHaveLength(1);
    expect(
      container.querySelectorAll("[data-token-resegmentation='split']"),
    ).toHaveLength(2);
  });

  test("grounds the current model in three verified byte units", () => {
    const { container } = renderStage("current-byte");

    expect(
      container.querySelector(".token-golden__state-label"),
    ).toBeEmptyDOMElement();
    expect(
      container.querySelector(".token-golden__current-marker"),
    ).not.toBeEmptyDOMElement();
    expect(
      container.querySelector("[data-current-tokenizer='byte_fallback_v1']"),
    ).not.toBeNull();
    expect(
      container.querySelectorAll("[data-current-byte-token]"),
    ).toHaveLength(3);
    expect(container.querySelector("[data-token-id-value]")).toBeNull();
  });

  test("selects one token without assigning its next-Chapter ID", () => {
    const { container } = renderStage("next-token-id");

    expect(
      container.querySelectorAll("[data-token-selected='true']"),
    ).toHaveLength(1);
    expect(
      container.querySelector("[data-token-identity='unknown']"),
    ).not.toBeNull();
    expect(container.querySelector("[data-navigation-direction]")).toBeNull();
  });

  test.each([
    ["not-word", "word-to-token-pieces", 2, 1],
    ["current-byte", "text-to-byte-tokens", 3, 2],
  ] as const)(
    "renders %s as boundary separation without a connector",
    (stage, transformation, segmentCount, boundaryCount) => {
      const { container } = renderStage(stage);

      const segmentation = container.querySelector(
        `[data-token-segmentation='${transformation}']`,
      );
      expect(segmentation).not.toBeNull();
      expect(
        segmentation?.querySelectorAll("[data-token-segment-preview]"),
      ).toHaveLength(segmentCount);
      expect(
        segmentation?.querySelectorAll("[data-token-segment-boundary]"),
      ).toHaveLength(boundaryCount);
      expect(
        container.querySelector("[data-token-connector='segmentation']"),
      ).toBeNull();
    },
  );

  test("keeps direction only on the Token ID mapping connector", () => {
    const { container } = renderStage("next-token-id");
    const mappingArrow = container.querySelector(
      "svg[data-token-connector='mapping'][data-token-direction='down']",
    );
    const marker = mappingArrow?.querySelector("marker");
    const arrowhead = marker?.querySelector("path");
    const shaft = mappingArrow?.querySelector("line");

    expect(mappingArrow).not.toBeNull();
    expect(mappingArrow).toHaveAttribute(
      "data-token-transformation",
      "token-to-id-question",
    );
    expect(mappingArrow).toHaveAttribute("aria-hidden", "true");
    expect(mappingArrow).toHaveAttribute("focusable", "false");
    expect(marker).toHaveAttribute("orient", "auto");
    expect(marker).toHaveAttribute("markerUnits", "strokeWidth");
    expect(arrowhead).toHaveAttribute("fill", "currentColor");
    expect(arrowhead?.getAttribute("d")?.trimEnd().endsWith("Z")).toBe(true);
    expect(shaft).toHaveAttribute("x1", shaft?.getAttribute("x2"));
    expect(shaft?.getAttribute("marker-end")).toBe(`url(#${marker?.id})`);
    expect(
      container.querySelector("[data-token-identity-label='token-id']"),
    ).not.toBeNull();
    expect(container.querySelectorAll("[data-token-semantic]")).toHaveLength(2);
    expect(
      container.querySelector("[data-token-connector='segmentation']"),
    ).toBeNull();
  });

  test("keeps segmented chips on intrinsic rails", () => {
    const cases = [
      {
        expectedContent: ["cat", "s"],
        rail: "wordpiece",
        selector: "[data-token-resegmentation='split']",
        stage: "not-word",
      },
      {
        expectedContent: ["c", "a", "t"],
        rail: "byte",
        selector: "[data-current-byte-token]",
        stage: "current-byte",
      },
    ] as const;

    for (const { expectedContent, rail, selector, stage } of cases) {
      const { container } = renderStage(stage);
      const railElement = container.querySelector(
        `[data-token-stage='${stage}'] [data-token-rail='${rail}']`,
      );

      expect(railElement).toHaveAttribute(
        "data-token-rail-layout",
        "intrinsic",
      );
      expect(
        Array.from(railElement?.querySelectorAll(selector) ?? []).map((chip) =>
          chip.textContent?.trim(),
        ),
      ).toEqual(expectedContent);
      expect(
        railElement?.querySelectorAll("[data-token-chip-content]"),
      ).toHaveLength(expectedContent.length);
    }
  });

  test("keeps boundaries and mapping outside page navigation", () => {
    const { container } = renderStage("next-token-id");

    for (const boundary of container.querySelectorAll(
      "[data-token-boundary]",
    )) {
      expect(boundary).not.toHaveAttribute("data-token-direction");
    }
    expect(container.querySelector("[aria-label='Chapter 이동']")).toBeNull();
  });
});
