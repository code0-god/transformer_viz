import { type Part2ChapterContent, part2Authorship } from "./glossary";

const TAKEAWAY =
  "Position Embedding은 각 token이 sequence의 어느 위치에 있는지 나타내는 vector이며, Token Embedding에 더해집니다.";

export const positionChapterContent = {
  page: {
    id: "decoder.curriculum.guide.2.2",
    routeId: "decoder.root",
    title: "Position Embedding",
    learningGoal:
      "현재 모델의 learned absolute position row가 token embedding과 원소별로 더해져 X_0를 만드는 경계를 설명한다.",
    introduction: [
      {
        id: "intro",
        kind: "paragraph",
        text: "같은 token도 sequence에서 놓인 위치가 다르면 맡는 문맥 역할이 달라질 수 있습니다. Token 주소와 position 주소를 분리해 결합 방식을 살펴봅니다.",
      },
    ],
    sections: [
      {
        id: "decoder.curriculum.guide.2.2.section",
        title: "Token 정보와 위치 정보의 합",
        primaryNodeId: "decoder.root.position-embedding",
        blocks: [
          {
            id: "p.positions",
            kind: "paragraph",
            text: "예시 ‘the cat’의 token 위치에는 시작부터 차례로 0부터 T-1까지의 absolute position 주소가 대응합니다.",
          },
          {
            id: "p.learned",
            kind: "paragraph",
            text: "현재 모델은 position 주소마다 channel C 길이의 learned row를 조회합니다. 이 행은 고정 함수로 계산하지 않고 모델 파라미터로 학습됩니다.",
          },
          {
            id: "p.position-shape",
            kind: "paragraph",
            text: "T개 위치에서 읽은 E_pos와 token lookup 결과 E_tok은 모두 [T,C]이므로 같은 위치와 channel을 맞춰 볼 수 있습니다.",
          },
          {
            id: "position-formula",
            kind: "formula",
            formulaId: "position-embedding",
          },
          {
            id: "p.addition",
            kind: "paragraph",
            text: "두 표현은 channel 축 뒤에 이어 붙이지 않습니다. 같은 shape의 대응 성분끼리 더해 첫 hidden state X_0를 만듭니다.",
          },
          {
            id: "embedding-add-formula",
            kind: "formula",
            formulaId: "embedding-add",
          },
          {
            id: "p.identity",
            kind: "paragraph",
            text: "더한 결과의 shape는 [T,C]로 유지되지만 각 위치의 값에는 token 주소와 absolute position 주소의 정보가 함께 들어갑니다.",
          },
          {
            id: "p.order",
            kind: "paragraph",
            text: "Token 순서를 바꾸면 같은 token이라도 다른 position row와 결합할 수 있으므로 입력 표현도 달라집니다.",
          },
          {
            id: "p.limit",
            kind: "paragraph",
            text: "Learned position table의 행 범위가 처리 가능한 위치 주소의 상한을 이룹니다. 현재 범위는 prose 숫자가 아니라 typed fact로 표시합니다.",
          },
          {
            id: "composition-flow",
            kind: "steps",
            items: [
              {
                id: "token-row",
                title: "E_tok [T,C]",
                explanation: "Token 주소로 조회",
              },
              {
                id: "position-row",
                title: "E_pos [T,C]",
                explanation: "Absolute position으로 조회",
              },
              {
                id: "element-wise-sum",
                title: "Element-wise +",
                explanation: "같은 위치와 channel끼리 합",
              },
              {
                id: "initial-hidden",
                title: "X_0 [T,C]",
                explanation: "Block에 들어갈 첫 표현",
              },
            ],
          },
          {
            id: "runtime.position",
            kind: "runtime-facts",
            adapterId: "current-model.position",
          },
          {
            id: "current-model.position",
            kind: "callout",
            tone: "important",
            title: "현재 모델 방식",
            text: "현재 source는 learned absolute position table을 조회한 뒤 token embedding에 broadcast addition합니다. Asset의 block_size와 C는 위 typed facts가 표시합니다.",
          },
          {
            id: "misconception.position-kind",
            kind: "callout",
            tone: "warning",
            title: "오개념: 현재 모델은 sinusoidal 또는 RoPE를 쓴다",
            text: "현재 source가 구현한 방식은 learned absolute position lookup입니다.",
          },
          {
            id: "misconception.concat",
            kind: "callout",
            tone: "warning",
            title: "오개념: position vector를 이어 붙인다",
            text: "두 vector는 같은 shape에서 원소별로 더해집니다.",
          },
          {
            id: "misconception.order",
            kind: "callout",
            tone: "warning",
            title: "오개념: token 순서를 바꿔도 표현이 같다",
            text: "위치 주소와의 조합이 바뀌므로 X_0도 달라질 수 있습니다.",
          },
          { id: "term.position", kind: "term", termId: "position-embedding" },
          {
            id: "term.learned",
            kind: "term",
            termId: "learned-absolute-position",
          },
          {
            id: "term.addition",
            kind: "term",
            termId: "element-wise-addition",
          },
          { id: "term.x-zero", kind: "term", termId: "x-zero" },
        ],
      },
    ],
    outlineSectionIds: ["decoder.curriculum.guide.2.2.section"],
    keyTakeaway: [{ id: "takeaway", kind: "paragraph", text: TAKEAWAY }],
    glossary: [
      "position-embedding",
      "learned-absolute-position",
      "element-wise-addition",
      "x-zero",
    ],
  },
  currentModelCalloutId: "current-model.position",
  runtimeFactsAdapterId: "current-model.position",
  primaryDiagramId: "decoder.diagram.representation.position",
  referenceIds: ["ref.tistory.23", "ref.repo.model", "ref.nanogpt-pinned"],
  misconceptionIds: ["position-kind", "concat", "order"],
  authorship: part2Authorship,
} as const satisfies Part2ChapterContent;
