import { fireEvent, render, screen, within } from "@testing-library/react";

import { TransformerBlockSceneFigure } from "./TransformerBlockSceneFigure";

describe("TransformerBlockSceneFigure", () => {
  test("preserves exact Pre-LN order and two residual merges", () => {
    render(
      <TransformerBlockSceneFigure
        fallback={<div role="img" aria-label="Block static fallback" />}
        layerCount={2}
      />,
    );

    expect(
      screen.getByText("LN₁ · Attention · Add · LN₂ · MLP · Add"),
    ).toBeVisible();
    expect(screen.getByText("Pre-LN")).toBeVisible();

    fireEvent.click(screen.getByRole("button", { name: "Attention half" }));
    expect(screen.getByTestId("block-scene-state")).toHaveAttribute(
      "data-stage",
      "attention",
    );
    expect(
      within(screen.getByTestId("block-scene-state")).getByText(
        "Residual bypass 1",
      ),
    ).toBeVisible();

    fireEvent.click(screen.getByRole("button", { name: "MLP half" }));
    expect(screen.getByTestId("block-scene-state")).toHaveAttribute(
      "data-stage",
      "mlp",
    );
    expect(
      within(screen.getByTestId("block-scene-state")).getByText(
        "Residual bypass 2",
      ),
    ).toBeVisible();
  });

  test("keeps a complete static Block fallback", () => {
    render(
      <TransformerBlockSceneFigure
        fallback={<div role="img" aria-label="Block static fallback" />}
        layerCount={2}
      />,
    );

    expect(
      screen.getByRole("img", { name: "Block static fallback" }),
    ).toBeInTheDocument();
  });
});
