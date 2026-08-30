import { fireEvent, render, screen, within } from "@testing-library/react";

import { curriculumLearningFigures } from "../../decoder-only-fundamentals/curriculum/learningFigureRegistry";
import {
  AutoregressiveSceneFigure,
  ConditionalProbabilitySceneFigure,
  LanguageModelSceneFigure,
  NextTokenSceneFigure,
} from "./Part1SceneFigures";

describe("Part 1 Learning Scenes", () => {
  test("fans one context into an illustrative candidate field", () => {
    render(<LanguageModelSceneFigure />);

    fireEvent.click(screen.getByRole("button", { name: "후보" }));
    expect(screen.getByTestId("language-model-scene-state")).toHaveAttribute(
      "data-stage",
      "candidates",
    );
    expect(
      screen.getByText("후보는 실제 model output이 아닌 설명용입니다."),
    ).toBeVisible();
  });

  test("preserves candidate identity through probability and selection", () => {
    render(<NextTokenSceneFigure />);
    const candidates = screen.getByTestId("next-token-candidates");

    expect(
      within(candidates)
        .getAllByRole("listitem")
        .map((item) => item.textContent),
    ).toEqual(["A", "B", "C"]);

    fireEvent.click(screen.getByRole("button", { name: "Probability" }));
    expect(screen.getByTestId("next-token-scene-state")).toHaveAttribute(
      "data-stage",
      "probability",
    );

    fireEvent.click(screen.getByRole("button", { name: "Selection" }));
    expect(screen.getByTestId("next-token-scene-state")).toHaveAttribute(
      "data-stage",
      "selection",
    );
    expect(screen.getByText("Sampler가 B를 선택")).toBeVisible();
  });

  test("grows the conditional context without turning formulas into geometry", () => {
    render(<ConditionalProbabilitySceneFigure />);

    fireEvent.click(screen.getByRole("button", { name: "w₃ 조건" }));
    expect(screen.getByTestId("conditional-scene-state")).toHaveAttribute(
      "data-stage",
      "w3",
    );
    expect(
      within(screen.getByTestId("conditional-scene-state")).getByText(
        "P(w₃ | w₁,w₂)",
      ),
    ).toBeVisible();
  });

  test("shows the generated token appended before repeating", () => {
    render(<AutoregressiveSceneFigure />);

    fireEvent.click(screen.getByRole("button", { name: "Append" }));
    expect(screen.getByTestId("autoregressive-scene-state")).toHaveAttribute(
      "data-stage",
      "append",
    );
    expect(screen.getByTestId("updated-context")).toHaveTextContent(
      "The cat s",
    );

    fireEvent.click(screen.getByRole("button", { name: "Repeat" }));
    expect(screen.getByTestId("autoregressive-scene-state")).toHaveAttribute(
      "data-stage",
      "repeat",
    );
    expect(
      screen.getByText("Updated Context가 다음 입력입니다."),
    ).toBeVisible();
  });

  test("registers Part 1 as four lazy scenes with semantic fallbacks", () => {
    const expected = [
      "decoder.diagram.language-model.definition",
      "decoder.diagram.language-model.next-token",
      "decoder.diagram.language-model.conditional-probability",
      "decoder.diagram.language-model.autoregressive",
    ] as const;

    for (const figureId of expected) {
      expect(curriculumLearningFigures.metadata(figureId)).toMatchObject({
        renderer: "scene",
        loadingStrategy: "visible",
        reducedMotion: "static-final-state",
      });
    }

    render(
      expected.map((figureId) => (
        <div key={figureId}>{curriculumLearningFigures.render(figureId)}</div>
      )),
    );

    expect(
      screen.getByRole("img", {
        name: "Context에서 다음 token 후보로 이어지는 언어 모델의 역할",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("img", {
        name: "Vocabulary logit에서 다음 token 선택까지의 한 단계",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("img", {
        name: "세 token sequence의 조건부 확률 연쇄",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("img", {
        name: "생성한 token을 context에 추가하는 반복 과정",
      }),
    ).toBeInTheDocument();
  });
});
