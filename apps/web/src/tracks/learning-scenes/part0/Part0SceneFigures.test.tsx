import { fireEvent, render, screen } from "@testing-library/react";

import { curriculumLearningFigures } from "../../decoder-only-fundamentals/curriculum/learningFigureRegistry";
import {
  NlpTransformationSceneFigure,
  TokenizationMethodsSceneFigure,
  TokenSegmentationSceneFigure,
  VocabularyAddressSceneFigure,
} from "./Part0SceneFigures";

describe("Part 0 Learning Scenes", () => {
  test("moves NLP through four representation states", () => {
    render(<NlpTransformationSceneFigure />);

    expect(
      screen.getByRole("heading", {
        name: "언어는 어떻게 계산 가능한 표현이 될까요?",
      }),
    ).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "수치 표현" }));
    expect(screen.getByTestId("nlp-scene-state")).toHaveAttribute(
      "data-scene-stage",
      "representation",
    );
    fireEvent.click(screen.getByRole("button", { name: "결과" }));
    expect(screen.getByTestId("nlp-scene-state")).toHaveAttribute(
      "data-scene-stage",
      "result",
    );
  });

  test("distinguishes illustrative token split from current byte mode", () => {
    render(<TokenSegmentationSceneFigure />);

    fireEvent.click(screen.getByRole("button", { name: "현재 byte" }));
    fireEvent.click(screen.getByRole("button", { name: "경계 나누기" }));

    expect(screen.getByTestId("tokenization-unit-scene-state")).toHaveAttribute(
      "data-mode",
      "byte",
    );
    expect(screen.getByTestId("tokenization-unit-scene-state")).toHaveAttribute(
      "data-phase",
      "split",
    );
    expect(screen.getByText("실제 byte tokenizer 예시")).toBeVisible();
  });

  test("connects token selection to vocabulary address", () => {
    render(<VocabularyAddressSceneFigure />);

    fireEvent.click(screen.getByRole("button", { name: "cat" }));
    fireEvent.click(screen.getByRole("button", { name: "주소" }));

    expect(screen.getByTestId("vocabulary-scene-state")).toHaveAttribute(
      "data-token",
      "cat",
    );
    expect(screen.getByTestId("vocabulary-scene-state")).toHaveAttribute(
      "data-phase",
      "address",
    );
  });

  test("resegments one source across four tokenizer methods", () => {
    render(<TokenizationMethodsSceneFigure />);

    fireEvent.click(screen.getByRole("button", { name: "Character" }));
    fireEvent.click(screen.getByRole("button", { name: "분할 보기" }));

    expect(
      screen.getByTestId("tokenization-method-scene-state"),
    ).toHaveAttribute("data-method", "character");
    expect(
      screen.getByTestId("tokenization-method-scene-state"),
    ).toHaveAttribute("data-phase", "split");
  });

  test("registers all four Chapters as lazy scenes with static fallbacks", () => {
    const expected = [
      "decoder.diagram.intro.nlp",
      "decoder.diagram.tokenization.token",
      "decoder.diagram.tokenization.vocabulary",
      "decoder.diagram.tokenization.methods",
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
      screen.getByRole("img", { name: "자연어 처리 추론 경로" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("img", { name: "Token 개념 흐름" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("img", {
        name: "Token과 Token ID를 embedding row에 연결하는 vocabulary lookup",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("img", { name: "Tokenization 방식 비교" }),
    ).toBeInTheDocument();
  });
});
