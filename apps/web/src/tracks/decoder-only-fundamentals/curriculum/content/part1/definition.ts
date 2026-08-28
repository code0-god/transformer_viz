import { type Part1ChapterContent, part1Authorship } from "./glossary";

const TAKEAWAY =
  "Decoder-only 언어 모델은 이전 토큰들이 주어졌을 때 다음 토큰 후보들의 점수를 계산합니다.";

export const definitionChapterContent = {
  page: {
    id: "decoder.curriculum.guide.1.1",
    routeId: "decoder.root",
    title: "언어 모델이란?",
    learningGoal:
      "Decoder-only 모델을 다음-token scorer로 정의하고 위치별 logits와 마지막 위치의 후보 점수를 구분한다.",
    introduction: [
      {
        id: "intro",
        kind: "paragraph",
        text: "언어 모델을 문장 완성 장치로만 보면 내부의 한 단계를 놓치기 쉽습니다. 이 Chapter에서는 현재 context를 받아 다음 token 후보를 점수화하는 계산으로 범위를 좁힙니다.",
      },
      {
        id: "figure.language-model-definition",
        kind: "figure",
        figureId: "decoder.diagram.language-model.definition",
        size: "wide",
        caption:
          "언어 모델은 context의 각 위치에 다음 token 후보 점수를 만들고, 마지막 위치의 점수를 생성에 사용합니다.",
        alt: "Context의 위치별 logit과 마지막 위치의 다음 token 후보",
      },
    ],
    sections: [
      {
        id: "decoder.curriculum.guide.1.1.section",
        title: "위치별 점수에서 다음 후보까지",
        primaryNodeId: "decoder.root.logits",
        blocks: [
          {
            id: "p.definition",
            kind: "paragraph",
            text: "Decoder-only 언어 모델은 왼쪽에 놓인 token들만 조건으로 삼아 각 위치에서 뒤따를 token 후보들의 raw logit을 계산합니다.",
          },
          {
            id: "p.context",
            kind: "paragraph",
            text: "예시 context ‘the cat sat on the’는 순서를 가진 token prefix입니다. 모델은 이 prefix를 한 번의 forward 입력으로 읽습니다.",
          },
          {
            id: "p.all-positions",
            kind: "paragraph",
            text: "Forward의 LM head 출력은 모든 입력 위치와 vocabulary 후보를 함께 담으므로 shape가 [T,Vocab]입니다. 각 행은 그 위치까지 본 뒤의 후보 점수입니다.",
          },
          {
            id: "p.final-row",
            kind: "paragraph",
            text: "실제 다음 생성에는 [T,Vocab] 전체를 같은 비중으로 쓰지 않습니다. 마지막 위치의 [Vocab] 행만 다음 token 선택 단계로 전달됩니다.",
          },
          {
            id: "p.candidates",
            kind: "paragraph",
            text: "마지막 행에는 후보 A, 후보 B, 후보 C처럼 vocabulary 전체에 대응하는 symbolic raw logit이 있습니다. 이 Chapter는 golden fixture의 token이나 고정 수치를 학습 예시로 노출하지 않습니다.",
          },
          {
            id: "p.scope",
            kind: "paragraph",
            text: "따라서 모델의 역할은 완성 문장을 한꺼번에 내보내는 것이 아니라, 현재 prefix에 이어질 한 칸의 후보 점수를 준비하는 것입니다.",
          },
          {
            id: "shape-flow",
            kind: "steps",
            items: [
              {
                id: "context-strip",
                title: "Context strip",
                explanation: "T개의 token 위치",
              },
              {
                id: "all-position-logits",
                title: "All-position logits [T,Vocab]",
                explanation: "모든 위치의 후보 점수 행",
              },
              {
                id: "final-position-row",
                title: "Final row [Vocab]",
                explanation: "다음 생성에 쓰는 마지막 행",
              },
              {
                id: "symbolic-candidates",
                title: "Symbolic candidates",
                explanation: "수치가 없는 후보 점수",
              },
            ],
          },
          {
            id: "current-model.definition",
            kind: "callout",
            tone: "important",
            title: "현재 모델 경계",
            text: "현재 decoder는 모든 입력 위치의 [T,Vocab] logits를 만들고, generation은 마지막 위치의 [Vocab] 행을 읽습니다.",
          },
          {
            id: "misconception.whole-sentence",
            kind: "callout",
            tone: "warning",
            title: "오개념: 모델이 완성 문장을 한 번에 출력한다",
            text: "한 forward는 다음 token 하나를 고를 점수를 만들고, 문장은 이 단계를 반복해 이어집니다.",
          },
          {
            id: "misconception.all-rows",
            kind: "callout",
            tone: "warning",
            title: "오개념: 모든 위치의 logit이 다음 생성에 동일하게 사용된다",
            text: "다음 token 선택은 마지막 위치의 vocabulary 행을 사용합니다.",
          },
          {
            id: "misconception.encoder-decoder",
            kind: "callout",
            tone: "warning",
            title: "오개념: decoder-only와 encoder-decoder는 같다",
            text: "이 커리큘럼의 모델은 별도 encoder 출력 없이 causal prefix만 처리합니다.",
          },
          { id: "term.language-model", kind: "term", termId: "language-model" },
          { id: "term.context", kind: "term", termId: "context" },
          { id: "term.decoder-only", kind: "term", termId: "decoder-only" },
          { id: "term.lm-head", kind: "term", termId: "lm-head" },
          { id: "term.logit", kind: "term", termId: "logit" },
        ],
      },
    ],
    outlineSectionIds: ["decoder.curriculum.guide.1.1.section"],
    keyTakeaway: [{ id: "takeaway", kind: "paragraph", text: TAKEAWAY }],
    glossary: ["language-model", "context", "decoder-only", "lm-head", "logit"],
  },
  currentModelCalloutId: "current-model.definition",
  primaryDiagramId: "decoder.diagram.language-model.definition",
  referenceIds: ["ref.tistory.21", "ref.repo.model", "ref.nanogpt-pinned"],
  misconceptionIds: ["whole-sentence", "all-rows", "encoder-decoder"],
  authorship: part1Authorship,
} as const satisfies Part1ChapterContent;
