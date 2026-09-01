import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";

import { NlpPipelineDiagram } from "./NlpPipelineDiagram";

describe("NlpPipelineDiagram numerical representation", () => {
  test("does not preview result semantics on the language slide", () => {
    // Given/When: the persistent Chapter 0.1 visual is rendered.
    const { container } = render(<NlpPipelineDiagram />);

    // Then: explicit result meaning remains exclusive to Slide 4.
    expect(container.querySelector(".nlp-golden__semantic-cue")).toBeNull();
  });

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

  test("pairs before and after values inside the same calculation slots", () => {
    // Given: the persistent Chapter 0.1 visual.
    const { container } = render(<NlpPipelineDiagram />);

    // When: its numeric transformation structure is inspected.
    const slots = [
      ...screen
        .getByTestId("nlp-golden-numeric-strip")
        .querySelectorAll("[data-nlp-value]"),
    ];

    // Then: each stable slot owns both phases and one directional cue.
    expect(slots).toHaveLength(6);
    for (const slot of slots.slice(0, -1)) {
      expect(slot.querySelectorAll("[data-value-phase='before']")).toHaveLength(
        1,
      );
      expect(slot.querySelectorAll("[data-value-phase='after']")).toHaveLength(
        1,
      );
      expect(
        slot.querySelectorAll("[data-value-change-direction='down']"),
      ).toHaveLength(1);
    }
    expect(
      slots.at(-1)?.querySelectorAll("[data-value-change-direction='down']"),
    ).toHaveLength(0);
    expect(
      container.querySelectorAll("[data-nlp-calculation-cue]"),
    ).toHaveLength(1);
  });

  test("separates result value, example task, and other NLP tasks", () => {
    // Given/When: the persistent result structure is rendered.
    const { container } = render(<NlpPipelineDiagram />);
    const result = screen.getByTestId("nlp-golden-result");

    // Then: output, task type, and neighboring problems own distinct levels.
    expect(result.querySelectorAll("[data-nlp-result-value]")).toHaveLength(1);
    expect(result.querySelectorAll("[data-nlp-result-task]")).toHaveLength(1);
    expect(result.querySelectorAll("[data-nlp-other-task]")).toHaveLength(3);
    expect(
      container.querySelectorAll("[data-nlp-result-connector]"),
    ).toHaveLength(1);
  });

  test("orders conceptual sentence boundaries for one progressive reveal", () => {
    // Given/When: the persistent sentence phrases are inspected.
    const { container } = render(<NlpPipelineDiagram />);
    const boundarySteps = [
      ...container.querySelectorAll("[data-nlp-boundary-step]"),
    ].map((element) => element.getAttribute("data-nlp-boundary-step"));

    // Then: four boundaries expose one deterministic sequence.
    expect(boundarySteps).toEqual(["1", "2", "3", "4"]);
  });
});
