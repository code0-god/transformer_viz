import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";

import { NlpPipelineDiagram } from "./NlpPipelineDiagram";

describe("NlpPipelineDiagram numerical representation", () => {
  test("renders one horizontal illustrative number sequence", () => {
    // Given: the Chapter 0.1 visual narrative.
    const { container } = render(<NlpPipelineDiagram />);

    // When: its persistent numerical representation is inspected.
    const strip = screen.getByTestId("nlp-golden-numeric-strip");

    // Then: one sequence owns six value slots without a row/column grid.
    expect(container.querySelectorAll("[data-nlp-cell]")).toHaveLength(0);
    expect(container.querySelectorAll("[data-nlp-cell-group]")).toHaveLength(0);
    expect(strip).toHaveAttribute("data-nlp-representation", "sequence");
    expect(strip.querySelectorAll("[data-nlp-value]")).toHaveLength(6);
    expect(strip).toHaveTextContent("0.24");
    expect(strip).toHaveTextContent("-0.71");
    expect(strip).toHaveTextContent("…");
  });
});
