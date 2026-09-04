import { fireEvent, render, screen } from "@testing-library/react";

import { nlpChapterContent } from "../../decoder-only-fundamentals/curriculum/content/part0/nlp";
import { tokenChapterContent } from "../../decoder-only-fundamentals/curriculum/content/part0/token";
import { curriculumLearningFigures } from "../../decoder-only-fundamentals/curriculum/learningFigureRegistry";
import type { GuideBlock } from "../../guideTypes";
import { VisualNarrative } from "../../VisualNarrative";
import {
  TokenizationMethodsSceneFigure,
  TokenSegmentationSceneFigure,
  VocabularyAddressSceneFigure,
} from "./Part0SceneFigures";

describe("Part 0 Learning Scenes", () => {
  test("lets Golden prose drive static token segmentation", () => {
    const blocks: readonly GuideBlock<string>[] =
      tokenChapterContent.page.sections.flatMap(({ blocks: sectionBlocks }) => [
        ...sectionBlocks,
      ]);
    const narrative = blocks.find((block) => block.kind === "visual-narrative");
    if (narrative?.kind !== "visual-narrative") {
      throw new Error("Golden Token narrative missing");
    }

    render(
      <VisualNarrative
        block={narrative}
        registry={curriculumLearningFigures}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "2단계: Token" }));

    expect(
      screen.getByRole("img", { name: "Token 분절 연속 설명" }),
    ).toHaveAttribute("data-token-stage", "token-units");
    expect(screen.queryByTestId("tokenization-unit-scene-state")).toBeNull();
    expect(screen.queryByRole("button", { name: "다시 나누기" })).toBeNull();
    expect(screen.queryByRole("button", { name: "현재 byte" })).toBeNull();
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
    expect(screen.queryByRole("link", { name: "다음: Token이란?" })).toBeNull();
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

  test("registers Golden narratives as static and later Figures as scenes", () => {
    const expected = [
      "decoder.diagram.intro.nlp",
      "decoder.diagram.tokenization.token",
      "decoder.diagram.tokenization.vocabulary",
      "decoder.diagram.tokenization.methods",
    ] as const;

    for (const figureId of expected.slice(0, 2)) {
      expect(curriculumLearningFigures.metadata(figureId)).toEqual({
        preferredWidth: 960,
        renderer: "static",
      });
    }
    for (const figureId of expected.slice(2)) {
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
      screen.getByRole("img", { name: "Token 분절 연속 설명" }),
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
