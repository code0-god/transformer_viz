import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fireEvent, render, screen } from "@testing-library/react";
import { vi } from "vitest";

import type { GptConfig } from "../../generated/schema/GptConfig";
import { RootArchitecture } from "./RootArchitecture";

const config: GptConfig = {
  block_size: 128,
  vocab_size: 512,
  n_layer: 2,
  n_head: 4,
  n_embd: 64,
  bias: true,
  dropout: 0,
};

function renderRoot(
  selectedNodeId: "transformer-block" | "logits" | null = null,
) {
  const onActivate = vi.fn();
  const onOpenBlock = vi.fn();
  const view = render(
    <RootArchitecture
      modelName="Test GPT"
      config={config}
      state={{ selectedNodeId }}
      onActivate={onActivate}
      onOpenBlock={onOpenBlock}
    />,
  );
  return { ...view, onActivate, onOpenBlock };
}

describe("RootArchitecture", () => {
  test("renders Learn presentation as static geometry without nested Figure semantics", () => {
    render(
      <RootArchitecture
        presentation="learn"
        modelName="Model"
        config={config}
        state={{ selectedNodeId: null }}
      />,
    );

    expect(
      screen.getByRole("img", { name: /GPT text generation architecture/ }),
    ).toBeVisible();
    expect(screen.queryByRole("button")).toBeNull();
    expect(screen.queryByRole("figure")).toBeNull();
    expect(
      document.querySelector("[data-architecture-presentation='learn']"),
    ).not.toBeNull();
  });

  test("renders one compact pipeline with grouped Block detail", () => {
    const { container } = renderRoot();
    const svg = screen.getByTestId("architecture-root");

    expect(svg).toHaveAttribute("viewBox", "40 0 920 1080");
    expect(container.querySelector(".architecture-figure")).toHaveAttribute(
      "data-figure-type",
      "architecture-process",
    );
    expect(
      container.querySelectorAll(".architecture-block-group"),
    ).toHaveLength(1);
    expect(
      container.querySelectorAll(".architecture-block-module"),
    ).toHaveLength(0);
    expect(container.querySelectorAll(".architecture-residual")).toHaveLength(
      0,
    );
    expect(
      container.querySelectorAll(".architecture-node-focus-outline"),
    ).toHaveLength(0);
    expect(
      container.querySelectorAll(".architecture-node__focus-outline"),
    ).toHaveLength(11);
    expect(
      container.querySelectorAll(".architecture-node-drilldown-indicator"),
    ).toHaveLength(0);
    expect(
      container.querySelectorAll(".architecture-node-formula"),
    ).toHaveLength(10);
    expect(
      container.querySelectorAll(".architecture-node-formula .katex"),
    ).toHaveLength(10);
    expect(
      container.querySelectorAll('[data-formula-id="root-output-state"]'),
    ).toHaveLength(0);
    expect(
      screen.getByTestId("architecture-model-width").querySelector(".katex"),
    ).not.toBeNull();
    expect(
      container.querySelectorAll(".architecture-node-subtitle"),
    ).toHaveLength(0);
    expect(
      container.querySelectorAll(".architecture-node__drill-down--compact"),
    ).toHaveLength(1);
    expect(
      container.querySelectorAll(".architecture-node__drill-down--label"),
    ).toHaveLength(1);
    expect(
      container.querySelector(".architecture-block-summary"),
    ).toHaveTextContent("LN → Attention → Residual");
    expect(
      container.querySelector(".architecture-block-summary"),
    ).toHaveTextContent("LN → MLP → Residual");
    expect(container.querySelector("#architecture-arrow")).toHaveAttribute(
      "refX",
      "10",
    );
    expect(container.querySelector(".architecture-repeat")).toHaveAttribute(
      "d",
      "M 305 1027 H 80 V 66 H 340",
    );
    expect(
      container.querySelector('[data-connector="block-to-final"]'),
    ).toBeInTheDocument();
  });

  test("paints the compact flow after its target nodes", () => {
    const { container } = renderRoot();
    const pairs = [
      [".architecture-block-group rect", '[data-connector="block-to-final"]'],
      [
        ".architecture-node-projection rect",
        '[data-connector="final-to-lm-head"]',
      ],
    ];

    for (const [targetSelector, connectorSelector] of pairs) {
      if (targetSelector === undefined || connectorSelector === undefined)
        throw new Error("Invalid selector pair");
      const target = container.querySelector(targetSelector);
      const connector = container.querySelector(connectorSelector);
      if (target === null || connector === null)
        throw new Error("Missing geometry contract element");
      expect(
        target.compareDocumentPosition(connector) &
          Node.DOCUMENT_POSITION_FOLLOWING,
      ).not.toBe(0);
    }
  });

  test("uses catalog node IDs and preserves the complete forward order", () => {
    const { container } = renderRoot();
    const nodeIds = Array.from(
      container.querySelectorAll("[data-node-id]"),
      (node) => node.getAttribute("data-node-id"),
    );

    expect(nodeIds).toEqual([
      "input-context",
      "token-embedding",
      "position-embedding",
      "hidden-state",
      "transformer-block",
      "final-layer-norm",
      "lm-head",
      "logits",
      "token-selection",
      "generated-token",
      "append-context",
    ]);
    expect(
      container.querySelectorAll(".architecture-forward-label"),
    ).toHaveLength(0);
    expect(
      container.querySelectorAll(".architecture-repeat-label"),
    ).toHaveLength(1);
    expect(container.querySelectorAll(".architecture-edge-state")).toHaveLength(
      0,
    );
  });

  test.each(["click", "Enter", " "])(
    "opens Transformer Block on %s",
    (interaction) => {
      const { onActivate, onOpenBlock } = renderRoot();
      const block = screen.getByRole("button", {
        name: /반복 Transformer Blocks/,
      });

      if (interaction === "click") fireEvent.click(block);
      else fireEvent.keyDown(block, { key: interaction });

      expect(onOpenBlock).toHaveBeenCalledTimes(1);
      expect(onActivate).not.toHaveBeenCalled();
    },
  );

  test("hover and focus are pure presentation state", () => {
    const { onActivate, onOpenBlock } = renderRoot();
    const block = screen.getByRole("button", {
      name: /반복 Transformer Blocks/,
    });

    fireEvent.mouseEnter(block);
    fireEvent.focus(block);
    expect(onActivate).not.toHaveBeenCalled();
    expect(onOpenBlock).not.toHaveBeenCalled();
  });

  test("keeps selection controlled and activates selectable nodes", () => {
    const { onActivate } = renderRoot("logits");
    const logits = screen.getByRole("button", { name: /Vocabulary logits/ });

    expect(logits).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(logits);
    expect(onActivate).toHaveBeenCalledWith("logits");
  });

  test("uses precise node corners and a wider focused view", () => {
    const { container } = renderRoot();

    expect(screen.getByRole("img").getAttribute("viewBox")).toMatch(
      /^40 0 920 /,
    );
    const radii = Array.from(
      container.querySelectorAll(
        "rect[rx]:not(.architecture-node__learning-highlight):not(.architecture-node__focus-outline)",
      ),
      (node) => Number(node.getAttribute("rx")),
    );
    expect(radii.length).toBeGreaterThan(0);
    expect(Math.max(...radii)).toBeLessThanOrEqual(8);
  });

  test("uses restrained viewer palette and ThreeUI depth", () => {
    const rootCss = readFileSync(
      resolve(process.cwd(), "src/architecture/root/rootArchitecture.css"),
      "utf8",
    );
    const viewportCss = readFileSync(
      resolve(process.cwd(), "src/tracks/diagramViewport.css"),
      "utf8",
    );
    const viewerCss = readFileSync(
      resolve(process.cwd(), "src/overlays/focusedViewer.css"),
      "utf8",
    );

    expect(rootCss).not.toMatch(/#f7e8cc|#e8e1ed|#fff1d9/i);
    expect(rootCss).toMatch(
      /\.architecture-interactive-node\.is-selected[\s\S]*filter:\s*drop-shadow/s,
    );
    expect(viewportCss).toMatch(
      /\.diagram-viewport__toolbar\s*\{[^}]*box-shadow:(?!\s*none)/s,
    );
    expect(viewerCss).toContain(
      '.focused-viewer[data-viewer-kind="architecture"]',
    );
  });
});
