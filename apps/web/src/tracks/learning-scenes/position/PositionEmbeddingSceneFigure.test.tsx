import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";

import { curriculumLearningFigures } from "../../decoder-only-fundamentals/curriculum/learningFigureRegistry";
import { PositionEmbeddingSceneFigure } from "./PositionEmbeddingSceneFigure";

describe("PositionEmbeddingSceneFigure", () => {
  test("composes equal-length token and position vectors element-wise", () => {
    render(<PositionEmbeddingSceneFigure />);

    expect(
      screen.getByRole("heading", {
        name: "같은 token에 position을 어떻게 더할까요?",
      }),
    ).toBeVisible();
    expect(screen.getByText("cat · E_tok [C]")).toBeVisible();
    expect(screen.getByText("position 0 · E_pos [C]")).toBeVisible();
    expect(screen.getByText("X_0 대기 · [C]")).toBeVisible();
    expect(screen.getByText("[C] + [C] → [C]")).toBeVisible();

    fireEvent.click(screen.getByRole("button", { name: "원소별 더하기" }));

    expect(screen.getByText("X_0 = E_tok + E_pos · [C]")).toBeVisible();
    expect(screen.getByTestId("position-scene-state")).toHaveAttribute(
      "data-phase",
      "sum",
    );
  });

  test("keeps token fixed while comparing learned absolute positions", () => {
    render(<PositionEmbeddingSceneFigure />);
    fireEvent.click(screen.getByRole("button", { name: "position 1" }));

    expect(screen.getByText("cat · E_tok [C]")).toBeVisible();
    expect(screen.getByText("position 1 · E_pos [C]")).toBeVisible();
    expect(screen.getByText("X_0 대기 · [C]")).toBeVisible();
    expect(screen.getByTestId("position-scene-state")).toHaveAttribute(
      "data-position",
      "1",
    );
    expect(screen.getByRole("button", { name: "position 1" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );

    fireEvent.click(screen.getByRole("button", { name: "원소별 더하기" }));
    expect(screen.getByText("X_0 = E_tok + E_pos · [C]")).toBeVisible();

    fireEvent.click(
      screen.getByRole("button", { name: "Composition 다시 보기" }),
    );
    expect(screen.getByTestId("position-scene-state")).toHaveAttribute(
      "data-phase",
      "before",
    );
  });

  test("resolves as canonical scene with learned-position static fallback", () => {
    render(
      curriculumLearningFigures.render(
        "decoder.diagram.representation.position",
      ),
    );

    expect(
      screen.getByRole("heading", {
        name: "같은 token에 position을 어떻게 더할까요?",
      }),
    ).toBeVisible();
    expect(
      screen.getByRole("img", {
        name: "Token과 learned absolute position embedding의 합",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "Position row와 channel 모양은 학습 개념을 위한 예시입니다.",
      ),
    ).toBeVisible();
    expect(screen.getByText("concatenation 아님")).toBeVisible();
  });
});
