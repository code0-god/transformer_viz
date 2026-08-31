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
                text: "사람은 문장을 읽고 그 뜻과 분위기를 자연스럽게 받아들입니다. 예를 들어 이 문장을 보면 긍정적인 느낌을 쉽게 알아차릴 수 있습니다.",
              },
              {
                id: "numeric",
                label: "계산 가능한 표현",
                stage: "numeric",
                text: "컴퓨터는 ‘재미있다’라는 뜻 자체를 계산하지 않습니다. 덧셈과 곱셈을 하려면 문장을 숫자로 이루어진 표현으로 바꿔야 합니다.",
              },
              {
                id: "transform",
                label: "모델 계산",
                stage: "transform",
                text: "모델 안에서는 이 숫자들을 이용한 계산이 여러 번 이어집니다. 계산을 거칠 때마다 값이 달라지고, 바뀐 값은 다음 계산의 입력이 됩니다.",
              },
              {
                id: "result",
                label: "결과",
                stage: "result",
                text: "계산된 숫자 표현을 문제의 목적에 맞는 결과로 읽어냅니다. 이 예에서는 문장의 분위기를 ‘긍정’으로 분류하며, 답변과 번역, 글 생성은 다른 문제의 예입니다.",
              },
              {
                id: "token-preview",
                label: "다음 질문",
                stage: "token-preview",
                text: "문장을 숫자로 바꾸려면 먼저 작은 단위로 나눠야 합니다. 어디에서 나눌지는 토크나이저에 따라 달라지며, 그 단위는 다음 Chapter에서 살펴봅니다.",
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
