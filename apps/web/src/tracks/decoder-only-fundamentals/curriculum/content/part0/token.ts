import { type Part0ChapterContent, part0Authorship } from "./glossary";

export const tokenChapterContent = {
  page: {
    id: "decoder.curriculum.guide.0.2",
    routeId: "decoder.root",
    title: "Token이란?",
    learningGoal:
      "모델이 텍스트를 어떤 단위로 나누고 처리하는지, 토큰과 토큰 ID의 차이를 익힙니다.",
    outline: "hidden",
    introduction: [
      {
        id: "intro",
        kind: "paragraph",
        text: "모델은 문장을 그대로 한 덩어리로 계산하지 않습니다. 먼저 텍스트를 순서대로 다룰 수 있는 작은 단위로 나누어야 합니다.",
      },
    ],
    sections: [
      {
        id: "token-unit",
        title: "왜 문장을 나눌까요?",
        primaryNodeId: "decoder.root.input-context",
        blocks: [
          {
            id: "p.why-split",
            kind: "paragraph",
            text: "문장은 길이가 제각각이고 단어와 기호가 이어져 있습니다. 모델이 앞뒤 순서를 따라 계산하려면, 먼저 입력을 셀 수 있는 칸으로 나누는 일이 필요합니다.",
          },
          {
            id: "p.token-definition",
            kind: "paragraph",
            text: "이때 만들어지는 각 칸이 토큰(token)입니다. 토큰은 모델이 순서열의 한 칸으로 처리하는 텍스트 단위입니다.",
          },
          {
            id: "p.token-not-word",
            kind: "paragraph",
            text: "토큰은 사람이 세는 단어와 항상 같지 않습니다. 한 단어가 여러 토큰으로 나뉠 수도 있고, 여러 글자나 기호가 한 토큰에 함께 들어갈 수도 있습니다.",
          },
          {
            id: "p.boundary",
            kind: "paragraph",
            text: "어디에서 나눌지는 토크나이저(tokenizer)가 정합니다. 그래서 같은 문장도 어떤 토크나이저를 쓰느냐에 따라 토큰의 경계와 개수가 달라질 수 있습니다.",
          },
          {
            id: "figure.token-boundary",
            kind: "figure",
            figureId: "decoder.diagram.tokenization.token",
            size: "wide",
            caption:
              "Token의 경계는 사용하는 tokenizer에 따라 달라질 수 있습니다.",
            alt: "The cats are sleeping 문장이 다섯 token으로 나뉜 경계",
          },
        ],
      },
      {
        id: "token-id-bridge",
        title: "Token과 Token ID는 다릅니다",
        primaryNodeId: "decoder.root.token-embedding",
        blocks: [
          {
            id: "p.token-and-id",
            kind: "paragraph",
            text: "토큰은 나눈 텍스트 단위이고, 토큰 ID는 그 단위를 vocabulary에서 찾기 위한 숫자 주소입니다. 텍스트 조각과 주소는 같은 것이 아닙니다.",
          },
          {
            id: "p.current-nanogpt",
            kind: "paragraph",
            text: "현재 nanoGPT Edu는 텍스트를 매우 작은 바이트(byte) 기반 단위로 처리합니다. 그래서 화면에 보이는 글자 하나가 항상 토큰 하나와 같지는 않습니다. 다음 Chapter에서는 토큰과 ID가 어떻게 연결되는지 자세히 봅니다.",
          },
          {
            id: "misconception.word-equals-token",
            kind: "callout",
            tone: "warning",
            title: "오개념: 한 단어는 항상 한 token",
            text: "Token boundary는 tokenizer 규약이 정하므로 단어 경계와 일치할 필요가 없습니다.",
          },
          {
            id: "misconception.token-equals-id",
            kind: "callout",
            tone: "warning",
            title: "오개념: token과 Token ID는 같은 것",
            text: "Token은 텍스트 단위이고 Token ID는 vocabulary에서 그 단위를 가리키는 숫자 주소입니다.",
          },
          { id: "term.token", kind: "term", termId: "token" },
          { id: "term.token-boundary", kind: "term", termId: "token-boundary" },
          { id: "term.token-id", kind: "term", termId: "token-id" },
        ],
      },
    ],
    outlineSectionIds: ["token-unit", "token-id-bridge"],
    keyTakeaway: [
      {
        id: "takeaway",
        kind: "paragraph",
        text: "Token은 모델이 순서대로 처리하는 텍스트 단위이며, Token ID는 그 token을 찾는 숫자 주소입니다.",
      },
    ],
    glossary: ["token", "token-boundary", "token-id"],
  },
  primaryDiagramId: "decoder.diagram.tokenization.token",
  referenceIds: ["ref.tistory.22", "ref.repo.tokenizer", "ref.rfc3629"],
  misconceptionIds: ["word-equals-token", "token-equals-id"],
  authorship: part0Authorship("rust-generated-fixture"),
} as const satisfies Part0ChapterContent;
