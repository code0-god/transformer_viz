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
    expect(screen.getByText("cat · token vector [C]")).toBeVisible();
    expect(screen.getByText("position 0 · learned vector [C]")).toBeVisible();
    expect(screen.getByText("[C] + [C] = [C]")).toBeVisible();

    fireEvent.click(screen.getByRole("button", { name: "Channel 정렬" }));
    expect(screen.getByTestId("position-scene-state")).toHaveAttribute(
      "data-phase",
      "align",
    );
    fireEvent.click(screen.getByRole("button", { name: "더하기" }));

    expect(screen.getByText("X₀ · result vector [C]")).toBeVisible();
    expect(screen.getByTestId("position-scene-state")).toHaveAttribute(
      "data-phase",
      "sum",
    );
  });

  test("keeps token fixed while comparing learned absolute positions", () => {
    render(<PositionEmbeddingSceneFigure />);
    fireEvent.click(screen.getByRole("button", { name: "position 3" }));

    expect(screen.getByText("cat · token vector [C]")).toBeVisible();
    expect(screen.getByText("position 3 · learned vector [C]")).toBeVisible();
    expect(screen.getByTestId("position-scene-state")).toHaveAttribute(
      "data-position",
      "3",
    );
    expect(screen.getByRole("button", { name: "position 3" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );

    fireEvent.click(screen.getByRole("button", { name: "더하기" }));
    expect(screen.getByText("X₀ · result vector [C]")).toBeVisible();

    fireEvent.click(screen.getByRole("button", { name: "다시 보기" }));
    expect(screen.getByTestId("position-scene-state")).toHaveAttribute(
      "data-phase",
      "separate",
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
      screen.getByText("Position channel 값은 학습을 위한 예시입니다."),
    ).toBeVisible();
    expect(screen.getByText("concatenation 아님")).toBeVisible();
  });
});
