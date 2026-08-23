import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";

import { AttentionDetail } from "./AttentionDetail";

function renderAttention(
  overrides: Partial<React.ComponentProps<typeof AttentionDetail>> = {},
) {
  const props: React.ComponentProps<typeof AttentionDetail> = {
    layerCount: 2,
    headCount: 4,
    modelWidth: 16,
    traceSequenceLength: 3,
    selectedLayer: 0,
    selectedHead: 0,
    selectedNodeId: null,
    onNavigateRoot: vi.fn(),
    onBack: vi.fn(),
    onSelectLayer: vi.fn(),
    onSelectHead: vi.fn(),
    onSelectNode: vi.fn(),
    ...overrides,
  };
  return { props, ...render(<AttentionDetail {...props} />) };
}

const connectorContracts = [
  ["input-to-qkv", "line", "470", "80", "470", "120"],
  ["qkv-to-query", "path", "M 470 192 V 225 H 180 V 260"],
  ["qkv-to-key", "path", "M 470 192 V 260"],
  ["qkv-to-value", "path", "M 470 192 V 225 H 760 V 260"],
  ["query-to-heads", "line", "180", "328", "180", "380"],
  ["key-to-heads", "line", "470", "328", "470", "380"],
  ["value-to-heads", "line", "760", "328", "760", "380"],
  ["query-heads-to-scores", "path", "M 180 452 V 482 H 300 V 520"],
  ["key-heads-to-scores", "path", "M 470 452 V 482 H 420 V 520"],
  ["scores-to-scale", "line", "360", "592", "360", "640"],
  ["scale-to-mask", "line", "360", "704", "360", "750"],
  ["mask-to-softmax", "line", "360", "822", "360", "870"],
  ["softmax-to-value-aggregation", "path", "M 360 942 V 980 H 470 V 1010"],
  ["value-heads-to-aggregation", "path", "M 760 452 V 1046 H 620"],
  ["aggregation-to-head-outputs", "line", "470", "1082", "470", "1130"],
  ["head-outputs-to-merge", "line", "470", "1188", "470", "1235"],
  ["merge-to-output-projection", "line", "470", "1307", "470", "1355"],
  [
    "output-projection-to-attention-output",
    "line",
    "470",
    "1427",
    "470",
    "1470",
  ],
];

describe("AttentionDetail", () => {
  test("renders the exact attention geometry and ordered connectors", () => {
    const { container } = renderAttention();
    const diagram = container.querySelector(".architecture-attention-diagram");
    expect(diagram).toHaveAttribute("viewBox", "0 0 1000 1555");
    expect(screen.getAllByText("Split Heads")).toHaveLength(3);

    const connectors = Array.from(
      container.querySelectorAll("[data-connector]"),
    );
    expect(connectors).toHaveLength(connectorContracts.length);
    connectorContracts.forEach((contract, index) => {
      const connector = connectors[index];
      if (connector === undefined)
        throw new Error(`Missing connector ${index}`);
      expect(connector).toHaveAttribute("data-connector", contract[0]);
      expect(connector.tagName.toLowerCase()).toBe(contract[1]);
      if (contract[1] === "path") {
        expect(connector).toHaveAttribute("d", contract[2]);
      } else {
        expect(connector).toHaveAttribute("x1", contract[2]);
        expect(connector).toHaveAttribute("y1", contract[3]);
        expect(connector).toHaveAttribute("x2", contract[4]);
        expect(connector).toHaveAttribute("y2", contract[5]);
      }
    });
  });

  test("preserves the operation order without a residual duplicate", () => {
    renderAttention();
    const ids = screen
      .getAllByRole("button")
      .map((node) => node.getAttribute("data-node-id"))
      .filter((id) => id !== null);
    expect(ids).toEqual([
      "attention-qkv-projection",
      "attention-query",
      "attention-key",
      "attention-value",
      "attention-scores",
      "attention-scale",
      "attention-causal-mask",
      "attention-softmax",
      "attention-value-aggregation",
      "attention-merge-heads",
      "attention-output-projection",
    ]);
    expect(screen.queryByText(/Residual/)).not.toBeInTheDocument();
    expect(screen.getByText("Head Outputs")).toBeInTheDocument();
    expect(screen.getByText("Attention Output")).toBeInTheDocument();
  });

  test("selects operations by pointer and keyboard and renders KaTeX math", () => {
    const onSelectNode = vi.fn();
    const { rerender, props } = renderAttention({ onSelectNode });
    const score = screen.getByLabelText(/Score MatMul.*선택 가능/);
    fireEvent.keyDown(score, { key: "Enter" });
    expect(onSelectNode).toHaveBeenCalledWith("attention-scores");

    rerender(<AttentionDetail {...props} selectedNodeId="attention-scores" />);
    expect(screen.getByLabelText(/Score MatMul.*선택 가능/)).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    const operation = screen.getByTestId("attention-operation-copy");
    const formula = within(operation).getByLabelText(/Score MatMul/);
    expect(formula).toHaveClass("katex");
    expect(formula.textContent).not.toContain("@");
    expect(within(operation).getByText("[3, 4] @ [4, 3] → [3, 3]")).toHaveClass(
      "architecture-actual-shape",
    );

    rerender(
      <AttentionDetail
        {...props}
        selectedNodeId="attention-value-aggregation"
      />,
    );
    const valueFormula = within(
      screen.getByTestId("attention-operation-copy"),
    ).getByLabelText(/Value MatMul/);
    expect(valueFormula).toHaveClass("katex");
    expect(valueFormula.textContent).not.toContain("@");
  });

  test("uses config values and trace-only dimensions without invented values", () => {
    const { rerender, props } = renderAttention({ traceSequenceLength: null });
    expect(screen.getByText("A. 기호")).toBeInTheDocument();
    const facts = screen.getByLabelText("현재 모델값");
    expect(within(facts).getByText("16")).toBeInTheDocument();
    expect(within(facts).getAllByText("4", { selector: "dd" })).toHaveLength(2);
    expect(within(facts).getByText("—")).toBeInTheDocument();
    expect(within(facts).getAllByText("실행 후 표시")).toHaveLength(2);

    rerender(<AttentionDetail {...props} traceSequenceLength={5} />);
    expect(
      within(screen.getByLabelText("현재 모델값")).getByText("5"),
    ).toBeInTheDocument();
  });

  test("preserves selectors, breadcrumb, and back callbacks", async () => {
    const user = userEvent.setup();
    const { props } = renderAttention();
    await user.click(screen.getByTestId("architecture-breadcrumb-gpt"));
    await user.click(screen.getByTestId("architecture-breadcrumb-block"));
    await user.click(screen.getByTestId("architecture-back-block"));
    await user.click(screen.getByRole("button", { name: "Layer 1" }));
    await user.click(screen.getByRole("button", { name: "Head 2" }));
    expect(props.onNavigateRoot).toHaveBeenCalledOnce();
    expect(props.onBack).toHaveBeenCalledTimes(2);
    expect(props.onSelectLayer).toHaveBeenCalledWith(1);
    expect(props.onSelectHead).toHaveBeenCalledWith(2);
  });
});
