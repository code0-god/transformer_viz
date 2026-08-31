import { type Part0ChapterContent, part0Authorship } from "./glossary";

const TAKEAWAY =
  "자연어 처리는 사람의 언어를 계산 가능한 표현으로 바꾸고, 그 계산을 사람이 사용할 수 있는 결과와 연결합니다.";

export const nlpChapterContent = {
  page: {
    id: "decoder.curriculum.guide.0.1",
    routeId: "decoder.root",
    title: "자연어 처리란?",
    learningGoal:
      "한 문장이 계산 가능한 표현으로 바뀌고 다시 의미 있는 결과로 이어지는 과정을 살펴봅니다.",
    outline: "hidden",
    introduction: [
      {
        id: "intro",
        kind: "paragraph",
        text: "사람은 언어로 생각을 나누지만 컴퓨터는 숫자를 계산합니다. 자연어 처리는 이 둘 사이를 어떻게 연결할까요?",
      },
    ],
    sections: [
      {
        id: "everyday-question",
        title: "",
        primaryNodeId: "decoder.root.input-context",
        blocks: [
          {
            id: "narrative.nlp-golden",
            kind: "visual-narrative",
            layout: "golden",
            label: "한 문장이 계산 가능한 표현과 결과로 이어지는 과정",
            beats: [
              {
                id: "language",
                label: "사람이 읽는 언어",
                stage: "language",
                text: "사람은 문장을 읽고 뜻을 이해할 수 있습니다. 우리는 이 문장을 보고 자연스럽게 의미와 분위기를 받아들입니다.",
              },
              {
                id: "numeric",
                label: "계산 가능한 표현",
                stage: "numeric",
                text: "하지만 컴퓨터는 문장의 뜻을 그대로 계산하지 않습니다. 모델이 계산하려면 언어를 숫자로 표현해야 합니다.",
              },
              {
                id: "transform",
                label: "모델 계산",
                stage: "transform",
                text: "이 숫자 표현은 모델 안에서 여러 계산을 거칩니다. 중요한 것은 검은 상자를 통과한다는 그림이 아니라 숫자 표현 자체가 계산을 통해 달라진다는 점입니다.",
              },
              {
                id: "result",
                label: "결과",
                stage: "result",
                text: "계산 결과는 다시 사람이 사용할 수 있는 형태로 연결됩니다. 분류, 질문 답변, 번역, 글 생성처럼 문제에 따라 결과의 모습은 달라집니다.",
              },
              {
                id: "token-preview",
                label: "다음 질문",
                stage: "token-preview",
                text: "그렇다면 이 문장을 숫자로 바꾸는 첫 단계는 무엇일까요? 먼저 모델이 다룰 수 있는 작은 단위로 나눠야 합니다. 그 단위를 다음 Chapter에서 살펴봅니다.",
              },
            ],
            figure: {
              id: "figure.nlp-process",
              kind: "figure",
              figureId: "decoder.diagram.intro.nlp",
              size: "full",
              caption:
                "문장이 숫자 표현으로 바뀌고 계산을 거쳐 사람이 활용하는 결과로 이어집니다.",
              alt: "자연어 처리 연속 설명",
            },
          },
        ],
      },
    ],
    outlineSectionIds: ["everyday-question"],
    keyTakeaway: [{ id: "remember", kind: "paragraph", text: TAKEAWAY }],
    glossary: ["natural-language"],
  },
  primaryDiagramId: "decoder.diagram.intro.nlp",
  referenceIds: [
    "ref.tistory.21",
    "ref.repo.generation",
    "ref.transformer-paper",
  ],
  misconceptionIds: [],
  authorship: part0Authorship("symbolic"),
} as const satisfies Part0ChapterContent;
