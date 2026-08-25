import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fireEvent, render, screen } from "@testing-library/react";
import { vi } from "vitest";

import { ArchitectureNode } from "./ArchitectureNode";

const bounds = { x: 4, y: 8, width: 120, height: 48, radius: 8 };

const CONNECTOR_SELECTORS = [
  ".architecture-flow",
  ".architecture-repeat",
  ".architecture-merge",
  ".architecture-residual",
  ".architecture-forward-guide",
  ".architecture-residual-junction",
  ".architecture-detail-flow",
  ".architecture-detail-residual",
  ".architecture-attention-flow",
] as const;

type CssRule = {
  readonly selectors: readonly string[];
  readonly declarations: ReadonlyMap<string, string>;
};

function parseCssRules(css: string): readonly CssRule[] {
  const rules: CssRule[] = [];
  for (const match of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const selectorSource = match[1];
    const declarationSource = match[2];
    if (selectorSource === undefined || declarationSource === undefined)
      throw new Error("Malformed CSS rule");
    const declarations = new Map<string, string>();
    for (const declaration of declarationSource.split(";")) {
      const separator = declaration.indexOf(":");
      if (separator < 0) continue;
      declarations.set(
        declaration.slice(0, separator).trim(),
        declaration.slice(separator + 1).trim(),
      );
    }
    rules.push({
      selectors: selectorSource.split(",").map((selector) => selector.trim()),
      declarations,
    });
  }
  return rules;
}

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

  test("owns connector hit routing in shared CSS without embedded SVG styles", () => {
    const { container } = render(
      <svg aria-label="Test diagram">
        <ArchitectureNode
          id="self-attention"
          bounds={bounds}
          selected={false}
          onActivate={() => undefined}
        >
          <rect {...bounds} />
        </ArchitectureNode>
      </svg>,
    );
    const css = readFileSync(
      resolve(process.cwd(), "src/architecture/architecture.css"),
      "utf8",
    );

    const ownedSelectors = new Set<string>(CONNECTOR_SELECTORS);
    const ownedRules = parseCssRules(css).filter((rule) =>
      rule.selectors.some((selector) => ownedSelectors.has(selector)),
    );

    expect(container.querySelector("style")).toBeNull();
    expect(ownedRules).toHaveLength(1);
    const ownedRule = ownedRules[0];
    expect(ownedRule?.selectors).toHaveLength(CONNECTOR_SELECTORS.length);
    expect([...(ownedRule?.selectors ?? [])].sort()).toEqual(
      [...CONNECTOR_SELECTORS].sort(),
    );
    expect([...(ownedRule?.declarations ?? [])]).toEqual([
      ["pointer-events", "none"],
    ]);
  });

  test("adds one centered 136-unit pointer target without changing focus bounds", () => {
    const onActivate = vi.fn();
    const { container } = render(
      <svg aria-label="Test diagram">
        <ArchitectureNode
          id="self-attention"
          bounds={bounds}
          selected={false}
          onActivate={onActivate}
        >
          <rect data-testid="painted-node" {...bounds} />
        </ArchitectureNode>
      </svg>,
    );

    const node = screen.getByRole("button");
    const target = container.querySelector(".architecture-node__hit-target");
    const outline = container.querySelector(
      ".architecture-node__focus-outline",
    );
    expect(target).toBe(node.firstElementChild);
    expect(target).not.toHaveAttribute("role");
    expect(target).not.toHaveAttribute("aria-label");
    expect(target).not.toHaveAttribute("tabindex");
    expect(target).toHaveAttribute("fill", "currentColor");
    expect(target).toHaveAttribute("fill-opacity", "0.001");
    expect(target).toHaveAttribute("pointer-events", "all");
    expect(target).toHaveAttribute("x", "-4");
    expect(target).toHaveAttribute("y", "-36");
    expect(target).toHaveAttribute("width", "136");
    expect(target).toHaveAttribute("height", "136");
    expect(outline).toHaveAttribute("x", "4");
    expect(outline).toHaveAttribute("y", "8");
    expect(outline).toHaveAttribute("width", "120");
    expect(outline).toHaveAttribute("height", "48");

    if (target === null) throw new Error("Missing pointer target");
    fireEvent.click(target);
    expect(onActivate).toHaveBeenCalledOnce();
    expect(onActivate).toHaveBeenCalledWith("self-attention");
  });

  test("exposes learning highlight independently from selection", () => {
    // Given / When
    render(
      <svg aria-label="Test diagram">
        <ArchitectureNode
          id="self-attention"
          bounds={bounds}
          selected={false}
          highlighted
          onActivate={() => undefined}
        >
          <text>Attention</text>
        </ArchitectureNode>
      </svg>,
    );

    // Then
    const node = screen.getByRole("button");
    expect(node).toHaveAttribute("data-learning-highlighted", "true");
    expect(node).toHaveAttribute("aria-pressed", "false");
    expect(node).not.toHaveAttribute("data-selected");
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
    expect(
      document.querySelector(".architecture-node__hit-target"),
    ).not.toBeInTheDocument();

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
