import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";

import { NlpPipelineDiagram } from "./NlpPipelineDiagram";

describe("NlpPipelineDiagram numerical representation", () => {
  test("renders one unified conceptual numerical field", () => {
    // Given: the Chapter 0.1 visual narrative.
    const { container } = render(<NlpPipelineDiagram />);

    // When: its persistent numerical representation is inspected.
    const field = screen.getByTestId("nlp-golden-numeric-field");

    // Then: one field owns every conceptual cell without token-like groups.
    expect(container.querySelectorAll("[data-nlp-cell-group]")).toHaveLength(0);
    expect(field.querySelectorAll("[data-nlp-cell]")).toHaveLength(16);
  });
});
