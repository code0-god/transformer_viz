import { fireEvent, render, screen } from "@testing-library/react";
import { vi } from "vitest";

import { ArchitectureNode } from "./ArchitectureNode";

const bounds = { x: 4, y: 8, width: 120, height: 48, radius: 8 };

describe("ArchitectureNode", () => {
  test.each(["Enter", " "])("activates with %s", (key) => {
    const onActivate = vi.fn();
    render(
      <svg aria-label="Test diagram">
        <ArchitectureNode
          id="self-attention"
          bounds={bounds}
          selected={false}
          onActivate={onActivate}
          drillDownIndicator={{ x: 116, y: 36, label: "Open" }}
        >
          <text>Attention</text>
        </ArchitectureNode>
      </svg>,
    );

    fireEvent.keyDown(screen.getByRole("button"), { key });
    expect(onActivate).toHaveBeenCalledWith("self-attention");
  });

  test("exposes selection, drill-down, and accessible labels", () => {
    render(
      <svg aria-label="Test diagram">
        <ArchitectureNode
          id="self-attention"
          bounds={bounds}
          selected
          onActivate={() => undefined}
          drillDownIndicator={{ x: 116, y: 36, label: "Open" }}
        >
          <text>Attention</text>
        </ArchitectureNode>
      </svg>,
    );

    const node = screen.getByRole("button", { name: /자세히 보기 가능/ });
    expect(node).toHaveAttribute("data-selected", "true");
    expect(node).toHaveAttribute("aria-pressed", "true");
    expect(node).toHaveAttribute("data-node-capability", "drill-down");
    expect(screen.getByText("Open")).toHaveClass(
      "architecture-node__drill-down",
    );
  });

  test("static and disabled nodes cannot activate", () => {
    const onActivate = vi.fn();
    const { rerender } = render(
      <svg aria-label="Test diagram">
        <ArchitectureNode
          id="root"
          bounds={bounds}
          selected={false}
          onActivate={onActivate}
        >
          <text>GPT</text>
        </ArchitectureNode>
      </svg>,
    );
    expect(screen.queryByRole("button")).not.toBeInTheDocument();

    rerender(
      <svg aria-label="Test diagram">
        <ArchitectureNode
          id="self-attention"
          bounds={bounds}
          selected={false}
          disabled
          onActivate={onActivate}
        >
          <text>Attention</text>
        </ArchitectureNode>
      </svg>,
    );
    fireEvent.click(screen.getByLabelText(/사용할 수 없음/));
    expect(onActivate).not.toHaveBeenCalled();
  });
});
