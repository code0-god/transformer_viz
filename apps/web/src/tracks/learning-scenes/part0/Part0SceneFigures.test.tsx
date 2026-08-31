import { fireEvent, render, screen } from "@testing-library/react";

import { nlpChapterContent } from "../../decoder-only-fundamentals/curriculum/content/part0/nlp";
import { curriculumLearningFigures } from "../../decoder-only-fundamentals/curriculum/learningFigureRegistry";
import type { GuideBlock, GuideVisualNarrativeBlock } from "../../guideTypes";
import { VisualNarrative } from "../../VisualNarrative";
import {
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

  test("keeps one NLP object tree through all five narrative states", () => {
    const blocks: readonly GuideBlock<string>[] =
      nlpChapterContent.page.sections.flatMap(({ blocks: sectionBlocks }) => [
        ...sectionBlocks,
      ]);
    const narrative = blocks.find((block) => block.kind === "visual-narrative");
    if (narrative?.kind !== "visual-narrative") {
      throw new Error("Golden NLP narrative missing");
    }
    render(
      <VisualNarrative
        block={narrative}
        registry={curriculumLearningFigures}
      />,
    );
    const sentence = screen.getByTestId("nlp-golden-sentence");
    const numericStrip = screen.getByTestId("nlp-golden-numeric-strip");
    const visual = screen.getByTestId("nlp-golden-visual");

    expect(visual).toHaveAttribute("data-nlp-stage", "language");
    for (const [label, stage] of [
      ["2단계: 계산 가능한 표현", "numeric"],
      ["3단계: 모델 계산", "transform"],
      ["4단계: 결과", "result"],
      ["5단계: 다음 질문", "token-preview"],
    ] as const) {
      fireEvent.click(screen.getByRole("button", { name: label }));
      expect(visual).toHaveAttribute("data-nlp-stage", stage);
      expect(
        document.querySelector(`[data-nlp-fallback-stage="${stage}"]`),
      ).toHaveAttribute("aria-current", "step");
      expect(screen.getByTestId("nlp-golden-sentence")).toBe(sentence);
      expect(screen.getByTestId("nlp-golden-numeric-strip")).toBe(numericStrip);
    }
    expect(
      screen.getByRole("link", { name: "다음: Token이란?" }),
    ).toHaveAttribute("data-next-chapter", "decoder.chapter.0.2");
    expect(screen.queryByRole("button", { name: "처음부터 보기" })).toBeNull();
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

  test("registers Golden NLP as static and later Part 0 Figures as scenes", () => {
    const expected = [
      "decoder.diagram.intro.nlp",
      "decoder.diagram.tokenization.token",
      "decoder.diagram.tokenization.vocabulary",
      "decoder.diagram.tokenization.methods",
    ] as const;

    expect(curriculumLearningFigures.metadata(expected[0])).toEqual({
      preferredWidth: 960,
      renderer: "static",
    });
    for (const figureId of expected.slice(1)) {
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
      screen.getByRole("img", { name: "자연어 처리 연속 설명" }),
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
