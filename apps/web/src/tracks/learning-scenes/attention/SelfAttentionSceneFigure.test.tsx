import { fireEvent, render, screen, within } from "@testing-library/react";

import type { GuideVisualNarrativeBlock } from "../../guideTypes";
import type { LearningFigureRegistry } from "../../learningFigureTypes";
import { VisualNarrative } from "../../VisualNarrative";
import { SelfAttentionSceneFigure } from "./SelfAttentionSceneFigure";

describe("SelfAttentionSceneFigure", () => {
  test("lets sticky prose drive one continuous Attention stage", () => {
    const narrative = {
      id: "attention-narrative",
      kind: "visual-narrative",
      layout: "sticky",
      label: "Attention flow",
      beats: [
        {
          id: "overview",
          label: "Overview",
          stage: "overview",
          text: "OVERVIEW_BEAT",
        },
        { id: "qkv", label: "Q/K/V", stage: "qkv", text: "QKV_BEAT" },
        { id: "scores", label: "Scores", stage: "scores", text: "SCORE_BEAT" },
        { id: "mask", label: "Mask", stage: "mask", text: "MASK_BEAT" },
        {
          id: "softmax",
          label: "Softmax",
          stage: "softmax",
          text: "SOFTMAX_BEAT",
        },
        { id: "value", label: "Value", stage: "value", text: "VALUE_BEAT" },
      ],
      figure: {
        id: "attention-figure",
        kind: "figure",
        figureId: "self-attention",
        caption: "ATTENTION_CAPTION",
        alt: "ATTENTION_ALT",
      },
    } as const satisfies GuideVisualNarrativeBlock;
    const registry: LearningFigureRegistry = {
      figureIds: new Set(["self-attention"]),
      metadata: () => ({
        fallbackFigureId: "self-attention.static",
        loadingStrategy: "visible",
        preferredAspectRatio: 1.48,
        preferredWidth: 1000,
        reducedMotion: "static-final-state",
        renderer: "scene",
      }),
      preferredWidth: () => 1000,
      render: () => (
        <SelfAttentionSceneFigure
          fallback={<div role="img" aria-label="Attention static fallback" />}
          headCount={4}
          layerCount={2}
        />
      ),
    };

    render(<VisualNarrative block={narrative} registry={registry} />);
    fireEvent.click(
      within(
        screen.getByRole("navigation", { name: "Attention flow 단계" }),
      ).getByRole("button", { name: "Mask" }),
    );

    expect(screen.getByTestId("attention-scene-state")).toHaveAttribute(
      "data-stage",
      "mask",
    );
    expect(
      screen.queryByRole("button", { name: "Attention 다시 보기" }),
    ).toBeNull();
    expect(screen.getAllByTestId("attention-scene-state")).toHaveLength(1);
  });

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
