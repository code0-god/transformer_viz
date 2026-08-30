import { fireEvent, render, screen } from "@testing-library/react";

import { curriculumLearningFigures } from "../../decoder-only-fundamentals/curriculum/learningFigureRegistry";
import type { GuideVisualNarrativeBlock } from "../../guideTypes";
import { VisualNarrative } from "../../VisualNarrative";
import {
  NlpTransformationSceneFigure,
  TokenizationMethodsSceneFigure,
  TokenSegmentationSceneFigure,
  VocabularyAddressSceneFigure,
} from "./Part0SceneFigures";

describe("Part 0 Learning Scenes", () => {
  test("lets inline prose drive token segmentation without a replay rail", () => {
    const narrative = {
      id: "token-narrative",
      kind: "visual-narrative",
      layout: "inline",
      label: "Token split",
      beats: [
        { id: "source", label: "문장", stage: "source", text: "SOURCE_BEAT" },
        {
          id: "boundaries",
          label: "경계",
          stage: "boundaries",
          text: "BOUNDARY_BEAT",
        },
        { id: "split", label: "Token", stage: "split", text: "SPLIT_BEAT" },
      ],
      figure: {
        id: "token-figure",
        kind: "figure",
        figureId: "decoder.diagram.tokenization.token",
        caption: "TOKEN_CAPTION",
        alt: "TOKEN_ALT",
      },
    } as const satisfies GuideVisualNarrativeBlock;

    render(
      <VisualNarrative
        block={narrative}
        registry={curriculumLearningFigures}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Token" }));

    expect(screen.getByTestId("tokenization-unit-scene-state")).toHaveAttribute(
      "data-phase",
      "split",
    );
    expect(screen.getByTestId("tokenization-unit-scene-state")).toHaveAttribute(
      "data-narrative",
      "true",
    );
    expect(screen.queryByRole("button", { name: "다시 나누기" })).toBeNull();
    expect(screen.getByRole("button", { name: "현재 byte" })).toBeVisible();
  });

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
