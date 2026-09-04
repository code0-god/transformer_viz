import { type Part0ChapterContent, part0Authorship } from "./glossary";

export const tokenChapterContent = {
  page: {
    id: "decoder.curriculum.guide.0.2",
    routeId: "decoder.root",
    title: "Token이란?",
    learningGoal:
      "Token이 모델의 처리 단위임을 이해하고, 경계를 정하는 토크나이저와 Token ID의 역할을 구분합니다.",
    outline: "hidden",
    introduction: [
      {
        id: "intro",
        kind: "paragraph",
        text: "문장을 숫자로 바꾸기 전에, 먼저 입력을 어떤 단위로 나눌지 정해야 합니다. 방금 보았던 문장의 경계를 따라가 볼까요?",
      },
    ],
    sections: [
      {
        id: "token-question",
        title: "",
        primaryNodeId: "decoder.root.input-context",
        blocks: [
          {
            id: "narrative.token-golden",
            kind: "visual-narrative",
            layout: "golden",
            label: "문장이 Token 단위로 나뉘는 과정",
            beats: [
              {
                id: "why-split",
                label: "문장을 나누기",
                stage: "why-split",
                text: "모델은 긴 문장을 하나의 텍스트 덩어리로 다루지 않습니다. 먼저 입력을 순서를 가진 작은 단위들로 나눕니다. 각 단위는 첫 번째, 두 번째처럼 순서열의 한 위치가 됩니다.",
              },
              {
                id: "token-units",
                label: "Token",
                stage: "token-units",
                text: "토크나이저가 입력을 나누면 순서를 가진 작은 단위들이 만들어집니다. 모델이 순서열의 한 칸으로 다루는 각각의 텍스트 단위를 Token이라고 합니다.",
              },
              {
                id: "not-word",
                label: "단어와 Token",
                stage: "not-word",
                text: "Token은 사람이 세는 단어와 항상 같지 않습니다. 한 단어가 여러 Token으로 나뉠 수도 있으며, 경계는 토크나이저가 정합니다.",
              },
              {
                id: "current-byte",
                label: "현재 모델",
                stage: "current-byte",
                text: "현재 nanoGPT Edu는 text를 byte 단위로 처리합니다. ASCII의 ‘cat’은 c, a, t로 나뉘지만, 모든 언어에서 글자 하나와 byte 하나가 같지는 않습니다.",
              },
              {
                id: "next-token-id",
                label: "다음 질문",
                stage: "next-token-id",
                text: "Token을 나눈 뒤에는 각 Token을 구분할 숫자가 필요합니다. 그 숫자가 어디에서 정해지고 무엇을 뜻하는지는 다음 Chapter에서 살펴봅니다.",
              },
            ],
            figure: {
              id: "figure.token-process",
              kind: "figure",
              figureId: "decoder.diagram.tokenization.token",
              size: "full",
              caption:
                "문장이 순서 있는 Token 단위로 나뉘고 현재 모델의 byte 단위로 이어집니다.",
              alt: "Token 분절 연속 설명",
            },
          },
        ],
      },
    ],
    outlineSectionIds: ["token-question"],
    keyTakeaway: [
      {
        id: "takeaway",
        kind: "paragraph",
        text: "Token은 모델이 순서열의 한 칸으로 다루는 텍스트 단위이며, 경계는 토크나이저가 정합니다. 경계는 단어와 항상 같지 않고, 현재 nanoGPT Edu는 byte 단위를 사용합니다.",
      },
    ],
    glossary: ["token", "tokenizer", "token-id"],
  },
  primaryDiagramId: "decoder.diagram.tokenization.token",
  referenceIds: ["ref.tistory.22", "ref.repo.tokenizer", "ref.rfc3629"],
  misconceptionIds: ["word-equals-token", "token-equals-id"],
  authorship: part0Authorship("rust-generated-fixture"),
} as const satisfies Part0ChapterContent;
