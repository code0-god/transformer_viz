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
        title: "언어로 해결할 수 있는 문제",
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
                label: "사람의 언어",
                stage: "language",
                text: "우리는 문장을 읽고 뜻을 이해할 수 있습니다.",
              },
              {
                id: "numeric",
                label: "숫자 표현",
                stage: "numeric",
                text: "하지만 모델이 계산하려면 언어를 숫자로 표현해야 합니다. 문장의 각 부분과 연결된 작은 셀들이 여러 숫자가 모인 계산 가능한 표현을 보여줍니다.",
              },
              {
                id: "transform",
                label: "표현 변화",
                stage: "transform",
                text: "이 숫자 표현은 모델 안에서 여러 계산을 거칩니다. 모델이라는 상자를 통과하는 것이 아니라 같은 표현의 내부 관계와 강조가 바뀝니다.",
              },
              {
                id: "result",
                label: "활용 결과",
                stage: "result",
                text: "계산 결과는 다시 사람이 사용할 수 있는 형태로 연결됩니다. 분류, 질문 답변, 번역, 글 생성처럼 문제에 따라 결과의 모습은 달라집니다.",
              },
              {
                id: "token-preview",
                label: "다음 질문",
                stage: "token-preview",
                text: "그렇다면 이 문장을 숫자로 바꾸는 첫 단계는 무엇일까요? 먼저 모델이 다룰 수 있는 작은 단위로 나눕니다. 다음 Chapter에서 그 단위를 살펴봅니다.",
              },
            ],
            figure: {
              id: "figure.nlp-process",
              kind: "figure",
              figureId: "decoder.diagram.intro.nlp",
              size: "full",
              caption:
                "같은 문장이 숫자 표현과 계산 변화를 거쳐 사람이 활용하는 결과로 이어집니다.",
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
