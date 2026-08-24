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
  test("renders the exact pipeline, selectors, marker, and residual paths", () => {
    const { container } = renderRoot();
    const svg = screen.getByTestId("architecture-root");

    expect(svg).toHaveAttribute("viewBox", "0 0 1000 1332");
    expect(
      container.querySelectorAll(".architecture-block-group"),
    ).toHaveLength(1);
    expect(container.querySelectorAll(".architecture-residual")).toHaveLength(
      2,
    );
    expect(
      container.querySelectorAll(".architecture-residual-junction"),
    ).toHaveLength(2);
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
      container.querySelectorAll(
        '[data-formula-id="root-output-state"] .katex',
      ),
    ).toHaveLength(1);
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
    const drillDownLabel = container.querySelector(
      ".architecture-node__drill-down--label",
    );
    expect(drillDownLabel).toHaveAttribute("x", "724");
    expect(drillDownLabel).toHaveAttribute("y", "812");
    expect(container.querySelector("#architecture-arrow")).toHaveAttribute(
      "refX",
      "10",
    );
    expect(container.querySelector(".architecture-repeat")).toHaveAttribute(
      "d",
      "M 305 1262 H 80 V 52 H 320",
    );
    expect(
      container.querySelector('[data-connector="block-input-to-add1"]'),
    ).toHaveAttribute("d", "M 500 368 H 700 V 560 H 518");
    expect(
      container.querySelector('[data-connector="add1-output-to-add2"]'),
    ).toHaveAttribute("d", "M 500 590 H 700 V 776 H 518");
  });

  test("paints named connectors after their targets and junctions after paths", () => {
    const { container } = renderRoot();
    const pairs = [
      [".architecture-block-module rect", '[data-connector="hidden-to-ln1"]'],
      [".architecture-residual-add", '[data-connector="attention-to-add1"]'],
      [
        ".architecture-node-normalization rect",
        '[data-connector="add2-to-final"]',
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
    const residual = container.querySelector(".architecture-residual");
    const junction = container.querySelector(".architecture-residual-junction");
    if (residual === null || junction === null)
      throw new Error("Missing residual contract element");
    expect(
      residual.compareDocumentPosition(junction) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).not.toBe(0);
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
    ).toHaveLength(1);
    expect(
      container.querySelectorAll(".architecture-repeat-label"),
    ).toHaveLength(1);
    expect(container.querySelectorAll(".architecture-edge-state")).toHaveLength(
      1,
    );
    expect(container.querySelector(".architecture-edge-state")).toHaveAttribute(
      "data-formula-id",
      "root-output-state",
    );
    expect(container.querySelector(".architecture-edge-state")).toHaveClass(
      "architecture-node-formula-slot",
    );
    expect(
      container.querySelector(".architecture-edge-state text"),
    ).not.toBeInTheDocument();
    expect(
      container.querySelector(".architecture-edge-state .katex"),
    ).not.toBeNull();
    expect(container.querySelector(".architecture-edge-state")).toHaveAttribute(
      "x",
      "340",
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
});
