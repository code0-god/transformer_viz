import { type Part0ChapterContent, part0Authorship } from "./glossary";

export const vocabularyChapterContent = {
  page: {
    id: "decoder.curriculum.guide.0.3",
    routeId: "decoder.root",
    title: "Vocabulary와 Token ID",
    learningGoal:
      "vocabulary 주소와 embedding에서 시작하는 의미 계산을 분리한다.",
    outline: "hidden",
    introduction: [
      {
        id: "intro",
        kind: "paragraph",
        text: "Vocabulary는 token 표기와 정수 ID를 연결하는 주소록입니다. 주소를 안다는 것과 그 token의 의미를 계산한다는 것은 서로 다른 단계입니다.",
      },
      {
        id: "figure.vocabulary-address",
        kind: "figure",
        figureId: "decoder.diagram.tokenization.vocabulary",
        size: "wide",
        caption:
          "Token ID는 의미값이 아니라 vocabulary와 embedding row를 찾는 주소입니다.",
        alt: "Vocabulary의 token 표기와 정수 ID 주소 관계",
      },
    ],
    sections: [
      {
        id: "decoder.curriculum.guide.0.3.section",
        title: "주소, 순서, 의미",
        primaryNodeId: "decoder.root.token-embedding",
        blocks: [
          {
            id: "p.address",
            kind: "paragraph",
            text: "Token ID는 vocabulary의 한 행을 찾기 위한 정수 주소입니다. 숫자의 크기나 두 ID 사이의 차이는 의미의 크기나 유사도를 나타내지 않습니다.",
          },
          {
            id: "p.embedding",
            kind: "paragraph",
            text: "모델의 의미 계산은 ID를 embedding table의 행으로 조회하면서 시작됩니다. 같은 ID는 같은 행을 가리키지만, ID 자체는 그 행의 vector가 아닙니다.",
          },
          {
            id: "misconception.id-magnitude",
            kind: "callout",
            tone: "warning",
            title: "오개념: ID가 크면 의미도 크다",
            text: "ID는 주소일 뿐이며 의미 계산은 조회된 embedding vector에서 시작합니다.",
          },
          {
            id: "misconception.id-distance",
            kind: "callout",
            tone: "warning",
            title: "오개념: ID 사이 거리가 의미 거리다",
            text: "연속된 정수 주소가 비슷한 의미를 보장하지 않습니다.",
          },
          { id: "term.vocabulary", kind: "term", termId: "vocabulary" },
          { id: "term.token-id", kind: "term", termId: "token-id" },
        ],
      },
    ],
    outlineSectionIds: ["decoder.curriculum.guide.0.3.section"],
    keyTakeaway: [
      {
        id: "takeaway",
        kind: "paragraph",
        text: "Token ID는 vocabulary에서 token을 찾기 위한 주소이며, 실제 의미 계산은 embedding vector에서 시작됩니다.",
      },
    ],
    glossary: ["vocabulary", "token-id"],
  },
  primaryDiagramId: "decoder.diagram.tokenization.vocabulary",
  referenceIds: ["ref.tistory.22", "ref.repo.tokenizer", "ref.rfc3629"],
  misconceptionIds: ["id-magnitude", "id-distance"],
  authorship: part0Authorship("symbolic"),
} as const satisfies Part0ChapterContent;
