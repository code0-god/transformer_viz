import { fireEvent, render, screen, within } from "@testing-library/react";

import { SelfAttentionSceneFigure } from "./SelfAttentionSceneFigure";

describe("SelfAttentionSceneFigure", () => {
  test("progresses through exact causal attention semantics", () => {
    const { container } = render(
      <SelfAttentionSceneFigure
        fallback={<div role="img" aria-label="Attention static fallback" />}
        headCount={4}
        layerCount={2}
      />,
    );

    const state = screen.getByTestId("attention-scene-state");
    expect(screen.getByText("Layer 1 · Head 1 · Illustrative")).toBeVisible();

    fireEvent.click(screen.getByRole("button", { name: "Q/K/V" }));
    expect(screen.getByTestId("attention-scene-state")).toHaveAttribute(
      "data-stage",
      "qkv",
    );
    const labels = container.querySelector(".scene-figure__labels");
    if (!(labels instanceof HTMLElement)) {
      throw new Error("Attention stage labels missing");
    }
    for (const label of ["Query", "Key", "Value"]) {
      expect(within(labels).getByText(label)).toBeVisible();
    }

    fireEvent.click(screen.getByRole("button", { name: "Scores" }));
    expect(within(state).getByText("S = QKᵀ / √D")).toBeVisible();

    fireEvent.click(screen.getByRole("button", { name: "Mask" }));
    expect(
      within(state).getByText("Future positions blocked before Softmax"),
    ).toBeVisible();

    fireEvent.click(screen.getByRole("button", { name: "Softmax" }));
    expect(
      within(state).getByText("Positive weights · row sum 1"),
    ).toBeVisible();

    fireEvent.click(screen.getByRole("button", { name: "Value" }));
    expect(within(state).getByText("Y = AV")).toBeVisible();
    expect(
      within(state).getByText("Heads merge · output projection"),
    ).toBeVisible();
  });

  test("keeps a complete static Attention fallback", () => {
    render(
      <SelfAttentionSceneFigure
        fallback={<div role="img" aria-label="Attention static fallback" />}
        headCount={4}
        layerCount={2}
      />,
    );

    expect(
      screen.getByRole("img", { name: "Attention static fallback" }),
    ).toBeInTheDocument();
  });
});
