import { type Part2ChapterContent, part2Authorship } from "./glossary";

const TAKEAWAY =
  "Token Embedding은 token ID를 모델이 계산할 수 있는 연속적인 숫자 vector로 바꿉니다.";

export const embeddingChapterContent = {
  page: {
    id: "decoder.curriculum.guide.2.1",
    routeId: "decoder.root",
    title: "Token Embedding",
    learningGoal:
      "Learned table의 row lookup이 token ID sequence를 계산 가능한 vector sequence로 바꾸는 과정을 shape와 연결한다.",
    introduction: [
      {
        id: "intro",
        kind: "paragraph",
        text: "Part 2의 도식과 본문에서는 읽기 편하도록 batch가 하나인 B=1 축을 한 번 생략합니다. 실제 모델 경계는 batch 축을 보존합니다.",
      },
      {
        id: "figure.token-embedding",
        kind: "figure",
        figureId: "decoder.diagram.representation.embedding",
        size: "wide",
        caption:
          "Token ID는 embedding table의 행을 찾고, 조회된 row가 각 token의 초기 vector가 됩니다.",
        alt: "Token ID sequence가 embedding table row를 조회해 vector가 되는 흐름",
      },
    ],
    sections: [
      {
        id: "decoder.curriculum.guide.2.1.section",
        title: "주소를 vector로 읽기",
        primaryNodeId: "decoder.root.token-embedding",
        blocks: [
          {
            id: "p.address",
            kind: "paragraph",
            text: "Token ID는 vocabulary 안에서 한 행을 지정하는 주소입니다. 주소 숫자 자체가 언어적 특징을 계산하는 vector는 아닙니다.",
          },
          {
            id: "p.table",
            kind: "paragraph",
            text: "Token embedding은 학습 과정에서 값이 정해진 lookup table입니다. Vocabulary의 각 token 주소마다 channel C 길이의 행 하나가 있습니다.",
          },
          {
            id: "p.example",
            kind: "paragraph",
            text: "예시 ‘the cat’을 token ID sequence [T]로 두면, 각 ID는 W_E에서 서로 대응하는 행을 symbolic하게 조회합니다.",
          },
          {
            id: "p.sequence",
            kind: "paragraph",
            text: "조회한 행을 원래 token 순서대로 놓으면 sequence vectors [T,C]가 됩니다. Table 전체와 이번 sequence의 출력은 서로 다른 대상입니다.",
          },
          {
            id: "p.shape-explanation",
            kind: "paragraph",
            text: "따라서 embedding table의 첫 축은 입력 길이 T가 아니라 가능한 token 주소 Vocab이고, 둘째 축은 표현 폭 C입니다.",
          },
          {
            id: "embedding-table-formula",
            kind: "formula",
            formulaId: "fundamentals-embedding-table-shape",
          },
          {
            id: "p.lookup-notation",
            kind: "paragraph",
            text: "한 위치의 ID로 table row를 고르는 연산을 E_tok lookup으로 표기하면, 같은 규칙이 T개 위치에 독립적으로 적용됩니다.",
          },
          {
            id: "token-embedding-formula",
            kind: "formula",
            formulaId: "token-embedding",
          },
          {
            id: "lookup-flow",
            kind: "steps",
            items: [
              {
                id: "token-addresses",
                title: "Token IDs [T]",
                explanation: "순서가 있는 vocabulary 주소",
              },
              {
                id: "embedding-table",
                title: "Embedding table [Vocab,C]",
                explanation: "모든 주소의 learned rows",
              },
              {
                id: "row-lookup",
                title: "Row lookup",
                explanation: "각 주소와 같은 행 선택",
              },
              {
                id: "sequence-vectors",
                title: "Sequence vectors [T,C]",
                explanation: "원래 순서로 모은 vectors",
              },
            ],
          },
          {
            id: "current-model.embedding",
            kind: "callout",
            tone: "important",
            title: "현재 모델 값",
            text: "현재 nanoGPT Edu도 token ID로 embedding table의 한 행을 찾습니다. Vocabulary 크기와 vector 폭은 모델 설정에 따라 달라집니다.",
          },
          {
            id: "misconception.id-vector",
            kind: "callout",
            tone: "warning",
            title: "오개념: ID가 곧 semantic vector다",
            text: "ID는 행 주소이고 계산 입력은 그 주소로 조회한 learned vector입니다.",
          },
          {
            id: "misconception.coordinate",
            kind: "callout",
            tone: "warning",
            title: "오개념: 각 channel에는 고정된 인간 개념이 있다",
            text: "개별 channel을 사람이 정한 단어 뜻표처럼 읽을 수 없습니다.",
          },
          {
            id: "misconception.table-shape",
            kind: "callout",
            tone: "warning",
            title: "오개념: table shape는 [T,C]다",
            text: "[T,C]는 이번 sequence의 lookup 결과이고 table 전체의 첫 축은 Vocab입니다.",
          },
          { id: "term.embedding", kind: "term", termId: "embedding" },
          { id: "term.lookup", kind: "term", termId: "lookup-table" },
          { id: "term.vocab", kind: "term", termId: "vocab" },
          { id: "term.channel", kind: "term", termId: "channel" },
        ],
      },
    ],
    outlineSectionIds: ["decoder.curriculum.guide.2.1.section"],
    keyTakeaway: [{ id: "takeaway", kind: "paragraph", text: TAKEAWAY }],
    glossary: ["embedding", "lookup-table", "vocab", "channel"],
  },
  currentModelCalloutId: "current-model.embedding",
  runtimeFactsAdapterId: "current-model.embedding",
  primaryDiagramId: "decoder.diagram.representation.embedding",
  referenceIds: ["ref.tistory.23", "ref.repo.model", "ref.nanogpt-pinned"],
  misconceptionIds: ["id-vector", "coordinate", "table-shape"],
  authorship: part2Authorship,
} as const satisfies Part2ChapterContent;
