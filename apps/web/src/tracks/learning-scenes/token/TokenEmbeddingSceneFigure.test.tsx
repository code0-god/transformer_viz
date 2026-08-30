import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, test } from "vitest";

import { curriculumLearningFigures } from "../../decoder-only-fundamentals/curriculum/learningFigureRegistry";
import type { GuideVisualNarrativeBlock } from "../../guideTypes";
import { VisualNarrative } from "../../VisualNarrative";
import { TokenEmbeddingSceneFigure } from "./TokenEmbeddingSceneFigure";

describe("TokenEmbeddingSceneFigure", () => {
  test("lets split prose drive row extraction without a replay rail", () => {
    const narrative = {
      id: "embedding-narrative",
      kind: "visual-narrative",
      layout: "split",
      label: "Embedding lookup",
      beats: [
        { id: "id", label: "ID", stage: "id", text: "ID_BEAT" },
        { id: "lookup", label: "Row", stage: "lookup", text: "ROW_BEAT" },
        { id: "lift", label: "선택", stage: "lift", text: "LIFT_BEAT" },
        {
          id: "vector",
          label: "Vector",
          stage: "vector",
          text: "VECTOR_BEAT",
        },
      ],
      figure: {
        id: "embedding-figure",
        kind: "figure",
        figureId: "decoder.diagram.representation.embedding",
        caption: "EMBEDDING_CAPTION",
        alt: "EMBEDDING_ALT",
      },
    } as const satisfies GuideVisualNarrativeBlock;

    render(
      <VisualNarrative
        block={narrative}
        registry={curriculumLearningFigures}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Vector" }));

    expect(screen.getByTestId("token-scene-state")).toHaveAttribute(
      "data-phase",
      "vector",
    );
    expect(screen.queryByRole("button", { name: "다시 보기" })).toBeNull();
    expect(screen.getByRole("button", { name: "cat · ID 42" })).toBeVisible();
  });

  test("synchronizes token ID, selected row, and vector semantics", () => {
    render(<TokenEmbeddingSceneFigure />);

    expect(
      screen.getByRole("heading", {
        name: "Token ID는 어떻게 하나의 vector를 찾을까요?",
      }),
    ).toBeVisible();
    expect(screen.getByText("ID 91")).toBeVisible();
    for (const row of [89, 90, 91, 92, 93]) {
      expect(screen.getByText(`row ${row}`)).toBeVisible();
    }

    fireEvent.click(screen.getByRole("button", { name: "Row 선택" }));
    expect(screen.getByTestId("token-scene-state")).toHaveAttribute(
      "data-phase",
      "lookup",
    );

    fireEvent.click(screen.getByRole("button", { name: "Vector 추출" }));
    expect(
      screen.getByText("선택한 row 91이 vector로 이동합니다."),
    ).toBeVisible();

    fireEvent.click(screen.getByRole("button", { name: "cat · ID 42" }));

    expect(screen.getByText("ID 42")).toBeVisible();
    for (const row of [40, 41, 42, 43, 44]) {
      expect(screen.getByText(`row ${row}`)).toBeVisible();
    }
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
    fireEvent.click(screen.getByRole("button", { name: "Row 선택" }));
    fireEvent.click(screen.getByRole("button", { name: "다시 보기" }));

    expect(state).toHaveAttribute("data-selected-token", "cat");
    expect(state).toHaveAttribute("data-phase", "id");
    expect(state.getAttribute("data-replay")).not.toBe(replayBefore);
  });

  test("operates token selection from the keyboard", async () => {
    const user = userEvent.setup();
    render(<TokenEmbeddingSceneFigure />);
    screen.getByRole("button", { name: "cat · ID 42" }).focus();

    await user.keyboard("{Enter}");

    expect(screen.getByTestId("token-scene-state")).toHaveAttribute(
      "data-selected-token",
      "cat",
    );
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
      screen.getByText("Channel 값은 학습을 위한 예시입니다."),
    ).toBeVisible();
  });
});
