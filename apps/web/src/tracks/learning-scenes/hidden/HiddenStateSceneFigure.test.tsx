import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, test } from "vitest";

import { curriculumLearningFigures } from "../../decoder-only-fundamentals/curriculum/learningFigureRegistry";
import { HiddenStateSceneFigure } from "./HiddenStateSceneFigure";

describe("HiddenStateSceneFigure", () => {
  test("preserves tensor shape while hidden activations evolve", () => {
    render(<HiddenStateSceneFigure />);

    expect(
      screen.getByRole("heading", {
        name: "같은 tensor가 Block을 지나면 무엇이 달라질까요?",
      }),
    ).toBeVisible();
    const frames = screen.getAllByText("[T,C]");
    expect(frames).toHaveLength(3);
    expect(
      frames.map((frame) =>
        frame.closest("[data-shape]")?.getAttribute("data-shape"),
      ),
    ).toEqual(["[T,C]", "[T,C]", "[T,C]"]);
    const state = screen.getByTestId("hidden-scene-state");
    expect(within(state).getByText("t0 · the")).toBeVisible();
    expect(within(state).getByText("t1 · cat")).toBeVisible();
    expect(
      within(state).getByText("Shape stays · values change"),
    ).toBeVisible();

    fireEvent.click(screen.getByRole("button", { name: "X_1" }));
    expect(screen.getByTestId("hidden-scene-state")).toHaveAttribute(
      "data-stage",
      "x1",
    );
    expect(screen.getByText("첫 Block 이후")).toBeVisible();

    fireEvent.click(screen.getByRole("button", { name: "X_N" }));
    expect(screen.getByTestId("hidden-scene-state")).toHaveAttribute(
      "data-stage",
      "xn",
    );
    expect(screen.getByText("마지막 Block 이후")).toBeVisible();
    expect(screen.getByRole("button", { name: "X_N" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  test("replays from X_0 without changing token row identities", () => {
    render(<HiddenStateSceneFigure />);
    fireEvent.click(screen.getByRole("button", { name: "X_N" }));

    const state = screen.getByTestId("hidden-scene-state");
    const replayBefore = state.getAttribute("data-replay");
    fireEvent.click(screen.getByRole("button", { name: "다시 보기" }));

    expect(state).toHaveAttribute("data-stage", "x0");
    expect(state.getAttribute("data-replay")).not.toBe(replayBefore);
    expect(within(state).getByText("t0 · the")).toBeVisible();
    expect(within(state).getByText("t1 · cat")).toBeVisible();
  });

  test("resolves with an evolution fallback and no causal-prefix detail", () => {
    render(
      curriculumLearningFigures.render(
        "decoder.diagram.representation.hidden-state",
      ),
    );

    expect(
      screen.getByRole("img", {
        name: "Shape를 유지하며 값이 바뀌는 hidden state 흐름",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Activation 값은 학습을 위한 예시입니다."),
    ).toBeVisible();
    expect(screen.queryByText(/causal prefix/i)).toBeNull();
  });
});
