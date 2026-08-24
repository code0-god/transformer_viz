import { render, screen } from "@testing-library/react";
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

describe("RootArchitecture guide boundary", () => {
  test("renders diagram content without an embedded learning guide", () => {
    // Given: the Root architecture route content.
    const { container } = render(
      <RootArchitecture
        modelName="Test GPT"
        config={config}
        state={{ selectedNodeId: null }}
        onActivate={vi.fn()}
        onOpenBlock={vi.fn()}
      />,
    );

    // When: route-owned diagram markup is inspected.
    // Then: no guide page remains inside the diagram component.
    expect(container.querySelector("[data-guide-page-id]")).toBeNull();
    expect(container.querySelector(".architecture-annotation")).toBeNull();
  });

  test("keeps learning highlights independent from selected state", () => {
    // Given: logits is selected while every input representation is highlighted.
    const { container } = render(
      <RootArchitecture
        modelName="Test GPT"
        config={config}
        state={{ selectedNodeId: "logits" }}
        highlightedNodeIds={[
          "token-embedding",
          "position-embedding",
          "embedding-add",
          "hidden-state",
        ]}
        onActivate={vi.fn()}
        onOpenBlock={vi.fn()}
      />,
    );
    const logits = screen.getByRole("button", { name: /Vocabulary logits/ });
    const tokenEmbedding = screen.getByRole("button", {
      name: /Token embedding lookup/,
    });

    // When: actual selection and guide highlighting render together.
    // Then: each uses its own machine state without changing geometry semantics.
    expect(logits).toHaveAttribute("aria-pressed", "true");
    expect(logits).not.toHaveAttribute("data-learning-highlighted");
    expect(tokenEmbedding).toHaveAttribute("data-learning-highlighted", "true");
    expect(tokenEmbedding).toHaveAttribute("aria-pressed", "false");
    expect(container.querySelector(".architecture-add")).toHaveAttribute(
      "data-learning-highlighted",
      "true",
    );
    expect(
      container.querySelector('[data-node-id="hidden-state"]'),
    ).toHaveClass("is-learning-highlighted");
  });
});
