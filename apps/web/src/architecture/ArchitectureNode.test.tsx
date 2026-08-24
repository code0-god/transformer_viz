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
          drillDownIndicator={{ label: "Open" }}
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
          drillDownIndicator={{ label: "Open" }}
        >
          <text>Attention</text>
        </ArchitectureNode>
      </svg>,
    );

    const node = screen.getByRole("button", { name: /자세히 보기 가능/ });
    expect(node).toHaveAttribute("data-selected", "true");
    expect(node).toHaveAttribute("aria-pressed", "true");
    expect(node).toHaveAttribute("data-node-capability", "drill-down");
    const label = screen.getByText("Open");
    const compact = screen.getByText("›");
    expect(label).toHaveClass("architecture-node__drill-down--label");
    expect(compact).toHaveClass("architecture-node__drill-down--compact");
    expect(label).toHaveAttribute("x", compact.getAttribute("x"));
    expect(label).toHaveAttribute("y", compact.getAttribute("y"));
    expect(label).toHaveAttribute("x", "108");
    expect(label).toHaveAttribute("y", "44");
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
