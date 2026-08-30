import { fireEvent, render, screen } from "@testing-library/react";

import { GptArchitectureSceneFigure } from "./GptArchitectureSceneFigure";

describe("GptArchitectureSceneFigure", () => {
  test("focuses the metadata-accurate GPT generation pipeline", () => {
    render(
      <GptArchitectureSceneFigure
        fallback={<div role="img" aria-label="GPT static fallback" />}
        headCount={4}
        layerCount={2}
        modelName="nanoGPT Edu"
        nextHref="#/learn/decoder-only-fundamentals/4-1"
      />,
    );

    expect(screen.getByText("2 Blocks · 4 Heads")).toBeVisible();
    expect(
      screen.getByText("Token lookup + learned position lookup"),
    ).toBeVisible();

    fireEvent.click(screen.getByRole("button", { name: "Blocks" }));
    expect(screen.getByTestId("gpt-scene-state")).toHaveAttribute(
      "data-stage",
      "blocks",
    );

    fireEvent.click(screen.getByRole("button", { name: "Generation" }));
    expect(screen.getByTestId("gpt-scene-state")).toHaveAttribute(
      "data-stage",
      "generation",
    );
    expect(
      screen.getByText("Generated token이 Updated Context에 붙습니다."),
    ).toBeVisible();
    expect(
      screen.getByRole("link", { name: "Transformer Block 설명으로 이동" }),
    ).toHaveAttribute("href", "#/learn/decoder-only-fundamentals/4-1");
  });

  test("keeps a complete static architecture fallback", () => {
    render(
      <GptArchitectureSceneFigure
        fallback={<div role="img" aria-label="GPT static fallback" />}
        headCount={4}
        layerCount={2}
        modelName="nanoGPT Edu"
        nextHref="#/learn/decoder-only-fundamentals/4-1"
      />,
    );

    expect(
      screen.getByRole("img", { name: "GPT static fallback" }),
    ).toBeInTheDocument();
  });
});
