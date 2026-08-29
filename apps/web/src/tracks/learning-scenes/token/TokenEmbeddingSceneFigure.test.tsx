import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";

import { curriculumLearningFigures } from "../../decoder-only-fundamentals/curriculum/learningFigureRegistry";
import { TokenEmbeddingSceneFigure } from "./TokenEmbeddingSceneFigure";

describe("TokenEmbeddingSceneFigure", () => {
  test("synchronizes token ID, selected row, and vector semantics", () => {
    render(<TokenEmbeddingSceneFigure />);

    expect(
      screen.getByRole("heading", {
        name: "Token ID는 어떻게 하나의 vector를 찾을까요?",
      }),
    ).toBeVisible();
    expect(screen.getByText("ID 91")).toBeVisible();
    expect(screen.getByText("row 대기")).toBeVisible();
    expect(screen.getByText("vector 대기")).toBeVisible();

    fireEvent.click(screen.getByRole("button", { name: "Row 찾기" }));
    expect(screen.getByText("row 91 선택")).toBeVisible();

    fireEvent.click(screen.getByRole("button", { name: "Vector 추출" }));
    expect(screen.getByText("the vector")).toBeVisible();

    fireEvent.click(screen.getByRole("button", { name: "cat · ID 42" }));

    expect(screen.getByText("ID 42")).toBeVisible();
    expect(screen.getByText("row 대기")).toBeVisible();
    expect(screen.getByText("vector 대기")).toBeVisible();
    expect(screen.getByTestId("token-scene-state")).toHaveAttribute(
      "data-selected-token",
      "cat",
    );
    expect(screen.getByRole("button", { name: "cat · ID 42" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  test("replays lookup without changing selected token", () => {
    render(<TokenEmbeddingSceneFigure />);
    fireEvent.click(screen.getByRole("button", { name: "cat · ID 42" }));

    const state = screen.getByTestId("token-scene-state");
    const replayBefore = state.getAttribute("data-replay");
    fireEvent.click(screen.getByRole("button", { name: "Row 찾기" }));
    fireEvent.click(screen.getByRole("button", { name: "Lookup 다시 보기" }));

    expect(state).toHaveAttribute("data-selected-token", "cat");
    expect(state).toHaveAttribute("data-phase", "id");
    expect(state.getAttribute("data-replay")).not.toBe(replayBefore);
  });

  test("resolves as canonical Part 2 scene with static learning fallback", () => {
    render(
      curriculumLearningFigures.render(
        "decoder.diagram.representation.embedding",
      ),
    );

    expect(
      screen.getByRole("heading", {
        name: "Token ID는 어떻게 하나의 vector를 찾을까요?",
      }),
    ).toBeVisible();
    expect(
      screen.getByRole("img", {
        name: "Token ID와 embedding table row lookup",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("표시된 channel은 학습 개념을 위한 예시입니다."),
    ).toBeVisible();
  });
});
