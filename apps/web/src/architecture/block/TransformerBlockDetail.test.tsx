import { fireEvent, render, screen, within } from "@testing-library/react";
import { vi } from "vitest";

import type { ArchitectureNodeId } from "../catalog";
import {
  ADD1_Y,
  ADD2_Y,
  ATTENTION_HEIGHT,
  ATTENTION_Y,
  LN_HEIGHT,
  LN1_Y,
  LN2_Y,
  MLP_HEIGHT,
  MLP_Y,
} from "./blockGeometry";
import { TransformerBlockDetail } from "./TransformerBlockDetail";

const config = { n_layer: 3 };
const noSelection: ArchitectureNodeId | null = null;

function renderDetail(
  selectedNodeId: ArchitectureNodeId | null = noSelection,
  highlightedNodeIds: readonly ArchitectureNodeId[] = [],
) {
  const onActivateNode = vi.fn();
  const onNavigate = vi.fn();
  const onSelectLayer = vi.fn();
  const result = render(
    <TransformerBlockDetail
      config={config}
      selectedLayer={1}
      selectedNodeId={selectedNodeId}
      highlightedNodeIds={highlightedNodeIds}
      onActivateNode={onActivateNode}
      onNavigate={onNavigate}
      onSelectLayer={onSelectLayer}
    />,
  );
  return { ...result, onActivateNode, onNavigate, onSelectLayer };
}

function connectorNames(container: HTMLElement): (string | null)[] {
  return Array.from(container.querySelectorAll("[data-connector]")).map(
    (connector) => connector.getAttribute("data-connector"),
  );
}

describe("TransformerBlockDetail", () => {
  test("ports the vertically reflowed diagram and exact residual geometry", () => {
    const { container } = renderDetail();
    const diagram = container.querySelector("svg");
    expect(diagram).toHaveAttribute("viewBox", "0 0 900 1208");

    expect(
      container.querySelector('[data-connector="input-to-residual1"]'),
    ).toHaveAttribute("d", "M 390 108 H 700 V 492 H 412");
    expect(
      container.querySelector('[data-connector="x-prime-to-residual2"]'),
    ).toHaveAttribute("d", "M 390 660 H 700 V 1040 H 412");

    expect(connectorNames(container)).toEqual([
      "input-to-ln1",
      "ln1-to-attention",
      "attention-to-add1",
      "input-to-residual1",
      "add1-to-x-prime",
      "x-prime-to-ln2",
      "ln2-to-mlp",
      "mlp-to-add2",
      "x-prime-to-residual2",
      "add2-to-output",
    ]);
    expect(
      Array.from(container.querySelectorAll("line[data-connector]")).map(
        (line) => [
          line.getAttribute("x1"),
          line.getAttribute("y1"),
          line.getAttribute("x2"),
          line.getAttribute("y2"),
        ],
      ),
    ).toEqual([
      ["390", "72", "390", "160"],
      ["390", "216", "390", "312"],
      ["390", "392", "390", "470"],
      ["390", "514", "390", "580"],
      ["390", "628", "390", "712"],
      ["390", "768", "390", "864"],
      ["390", "936", "390", "1018"],
      ["390", "1062", "390", "1128"],
    ]);
  });

  test("preserves source, destination, junction, module, and plus-node bounds", () => {
    const { container } = renderDetail();
    const states = container.querySelectorAll(".architecture-detail-state");
    expect(states).toHaveLength(3);
    expect(states[0]?.querySelector("rect")).toHaveAttribute("x", "225");
    expect(states[0]?.querySelector("rect")).toHaveAttribute("y", "24");
    expect(states[0]?.querySelector("rect")).toHaveAttribute("width", "330");
    expect(states[0]?.querySelector("rect")).toHaveAttribute("height", "48");
    expect(states[1]?.querySelector("rect")).toHaveAttribute("y", "580");
    expect(states[2]?.querySelector("rect")).toHaveAttribute("y", "1128");
    expect(states[0]).toHaveAttribute("data-state-node", "block-input");
    expect(states[2]).toHaveAttribute("data-state-node", "block-output");

    const plusNodes = container.querySelectorAll(".architecture-residual-add");
    expect(plusNodes).toHaveLength(2);
    expect(plusNodes[0]).toHaveAttribute("cx", "390");
    expect(plusNodes[0]).toHaveAttribute("cy", "492");
    expect(plusNodes[0]).toHaveAttribute("r", "22");
    expect(plusNodes[1]).toHaveAttribute("cy", "1040");

    expect(
      container.querySelector('[data-junction="block-input-junction"]'),
    ).toHaveAttribute("cy", "108");
    expect(
      container.querySelector('[data-junction="x-prime-junction"]'),
    ).toHaveAttribute("cy", "660");

    const modules = Array.from(
      container.querySelectorAll(".architecture-block-module > rect"),
    ).map((rect) => [
      rect.getAttribute("x"),
      rect.getAttribute("y"),
      rect.getAttribute("width"),
      rect.getAttribute("height"),
    ]);
    expect(modules).toEqual([
      ["225", "160", "330", "56"],
      ["225", "312", "330", "80"],
      ["225", "712", "330", "56"],
      ["225", "864", "330", "72"],
    ]);
  });

  test("keeps actionable 136-unit targets free of positive-area overlap", () => {
    const bounds = [
      { y: LN1_Y, height: LN_HEIGHT },
      { y: ATTENTION_Y, height: ATTENTION_HEIGHT },
      { y: ADD1_Y - 22, height: 44 },
      { y: LN2_Y, height: LN_HEIGHT },
      { y: MLP_Y, height: MLP_HEIGHT },
      { y: ADD2_Y - 22, height: 44 },
    ].map(({ y, height }) => ({
      top: y + height / 2 - Math.max(height, 136) / 2,
      bottom: y + height / 2 + Math.max(height, 136) / 2,
    }));

    for (const [index, target] of bounds.entries()) {
      for (const other of bounds.slice(index + 1)) {
        expect(
          Math.max(
            0,
            Math.min(target.bottom, other.bottom) -
              Math.max(target.top, other.top),
          ),
        ).toBe(0);
      }
    }
  });

  test("derives layers from config and reports selected layer changes", () => {
    const { onSelectLayer } = renderDetail();
    const selector = screen.getByRole("group", { name: "Layer" });
    const buttons = within(selector).getAllByRole("button");
    const selectedLayer = within(selector).getByRole("button", { name: "1" });
    expect(buttons).toHaveLength(3);
    expect(selectedLayer).toHaveAttribute("aria-pressed", "true");
    expect(selectedLayer).toHaveClass("selected");

    fireEvent.click(within(selector).getByRole("button", { name: "2" }));
    expect(onSelectLayer).toHaveBeenCalledWith(2);
    expect(screen.getByTestId("architecture-detail")).toHaveAttribute(
      "data-selected-layer",
      "1",
    );
  });

  test.each(["Enter", " "])(
    "drills into Self-Attention with the %s key",
    (key) => {
      const { onActivateNode } = renderDetail();
      const attention = screen.getByRole("button", {
        name: /Causal Multi-Head Self-Attention/,
      });
      fireEvent.keyDown(attention, { key });
      expect(onActivateNode).toHaveBeenCalledWith("self-attention");
    },
  );

  test("exposes selection and all block operations through shared nodes", () => {
    const { container, onActivateNode } = renderDetail("mlp");
    const selected = container.querySelector('[data-node-id="mlp"]');
    expect(selected).toHaveClass("is-selected");
    expect(selected).toHaveAttribute("data-selected", "true");
    expect(selected).toHaveAttribute("aria-pressed", "true");

    fireEvent.click(
      screen.getByRole("button", { name: /Causal Multi-Head Self-Attention/ }),
    );
    fireEvent.click(screen.getByRole("button", { name: /LayerNorm 1/ }));
    expect(onActivateNode).toHaveBeenNthCalledWith(1, "self-attention");
    expect(onActivateNode).toHaveBeenNthCalledWith(2, "layer-norm-1");
  });

  test("keeps learning highlights independent from selection", () => {
    const { container } = renderDetail("mlp", ["layer-norm-2"]);
    const selected = container.querySelector('[data-node-id="mlp"]');
    const highlighted = container.querySelector(
      '[data-node-id="layer-norm-2"]',
    );

    expect(selected).toHaveAttribute("aria-pressed", "true");
    expect(selected).not.toHaveAttribute("data-learning-highlighted");
    expect(highlighted).toHaveAttribute("aria-pressed", "false");
    expect(highlighted).toHaveAttribute("data-learning-highlighted", "true");
  });

  test("preserves breadcrumb and back callback surfaces", () => {
    const { onNavigate } = renderDetail();
    fireEvent.click(screen.getByTestId("architecture-breadcrumb-gpt"));
    fireEvent.click(screen.getByTestId("architecture-back-root"));
    expect(onNavigate).toHaveBeenNthCalledWith(1, "root");
    expect(onNavigate).toHaveBeenNthCalledWith(2, "root");
    expect(screen.getByTestId("architecture-breadcrumb-block")).toHaveAttribute(
      "aria-current",
      "page",
    );
  });

  test("renders only diagram formulas without an embedded guide", () => {
    const { container } = renderDetail();
    expect(
      screen.getByTestId("architecture-model-layer-count"),
    ).toHaveTextContent("3");
    expect(
      container.querySelector('[data-guide-page-id="decoder-guide-block"]'),
    ).toBeNull();
    expect(
      screen.queryByTestId("architecture-block-equations"),
    ).not.toBeInTheDocument();
    const diagram = container.querySelector(".architecture-detail-diagram");
    expect(
      diagram?.querySelectorAll(".architecture-node-formula"),
    ).toHaveLength(7);
    expect(
      diagram?.querySelectorAll(".architecture-node-formula .katex"),
    ).toHaveLength(7);
    expect(
      diagram?.querySelectorAll(".architecture-node-subtitle"),
    ).toHaveLength(0);
    expect(
      diagram?.querySelectorAll(".architecture-node__drill-down--compact"),
    ).toHaveLength(1);
    expect(
      diagram?.querySelectorAll(".architecture-node__drill-down--label"),
    ).toHaveLength(1);
    const drillDownLabel = diagram?.querySelector(
      ".architecture-node__drill-down--label",
    );
    expect(drillDownLabel).toHaveAttribute("x", "539");
    expect(drillDownLabel).toHaveAttribute("y", "380");
    const caption = container.querySelector("figcaption");
    expect(caption?.querySelectorAll('[role="math"]')).toHaveLength(2);
    expect(caption?.querySelectorAll(".katex")).toHaveLength(2);
    expect(caption).not.toHaveTextContent("X_res1 =");
    expect(caption).not.toHaveTextContent("X_out =");
  });
});
