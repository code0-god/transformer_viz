import { type Part1ChapterContent, part1Authorship } from "./glossary";

const TAKEAWAY =
  "전체 token sequence의 확률은 앞선 token들이 주어졌을 때 각 다음 token이 나타날 조건부 확률들을 이어 곱한 것으로 표현할 수 있습니다.";

export const conditionalProbabilityChapterContent = {
  page: {
    id: "decoder.curriculum.guide.1.3",
    routeId: "decoder.root",
    title: "조건부 확률",
    learningGoal:
      "설명을 위한 세 token sequence에서 조건부 확률의 기호를 읽고, 전체 sequence 확률을 next-token 확률의 연쇄로 설명한다.",
    introduction: [
      {
        id: "intro.three-token-story",
        kind: "paragraph",
        text: "설명을 위한 세 token sequence A, B, C를 생각해 보겠습니다. 먼저 A가 나타나고, A가 주어진 상태에서 B가 이어지며, A와 B가 주어진 상태에서 C가 이어집니다.",
      },
      {
        id: "intro.why",
        kind: "paragraph",
        text: "세 선택은 서로 떨어진 사건이 아닙니다. 뒤에 놓인 token일수록 앞에서 이미 정해진 token들을 조건으로 가지므로, sequence 전체의 확률도 이 순서를 반영해야 합니다.",
      },
    ],
    sections: [
      {
        id: "decoder.curriculum.guide.1.3.section",
        title: "앞선 token을 조건으로 읽기",
        primaryNodeId: "decoder.root.logits",
        blocks: [
          {
            id: "p.growing-prefix",
            kind: "paragraph",
            text: "뒤쪽 token의 확률 항일수록 조건에 놓이는 앞선 token이 많아집니다. w₂의 항은 w₁을 조건으로 보고, w₃의 항은 w₁과 w₂를 조건으로 봅니다.",
          },
          {
            id: "figure.conditional-probability",
            kind: "figure",
            figureId: "decoder.diagram.language-model.conditional-probability",
            size: "wide",
            caption:
              "세 token sequence의 확률은 시작 확률과, 점점 길어지는 prefix가 주어진 next-token 확률들의 곱으로 나뉩니다.",
            alt: "w1, w2, w3 sequence를 앞선 token 조건의 확률 세 항으로 분해한 연쇄",
          },
          {
            id: "p.bar-notation",
            kind: "paragraph",
            text: "조건부 확률(conditional probability)은 P(B | A)처럼 씁니다. 가운데 세로선 ‘|’는 나눗셈이 아니라 ‘A가 주어졌을 때 B가 나타날 확률’이라고 읽는 기호입니다.",
          },
          {
            id: "p.three-token-explanation",
            kind: "paragraph",
            text: "세 token w₁, w₂, w₃가 한 sequence로 나타날 확률은 세 항으로 나눌 수 있습니다. 첫 token의 확률, w₁이 주어졌을 때 w₂의 확률, w₁과 w₂가 주어졌을 때 w₃의 확률입니다.",
          },
          {
            id: "three-token-formula",
            kind: "formula",
            formulaId: "fundamentals-chain-rule-three-token",
          },
          {
            id: "p.three-token-reading",
            kind: "paragraph",
            text: "이 식은 세 사건을 동시에 한 번에 계산한다는 뜻이 아닙니다. 앞선 token이 정해질 때마다 다음 token의 조건부 확률을 읽고, 그 세 값을 이어 곱한다는 뜻입니다.",
          },
          {
            id: "p.sequence-explanation",
            kind: "paragraph",
            text: "같은 생각을 길이 T인 token sequence로 확장할 수 있습니다. 각 위치 t에서 현재 token w_t의 확률을 구하고, 그 위치보다 앞선 token 전체를 조건으로 둡니다.",
          },
          {
            id: "sequence-formula",
            kind: "formula",
            formulaId: "fundamentals-chain-rule-sequence",
          },
          {
            id: "p.sequence-reading",
            kind: "paragraph",
            text: "일반식에서 T는 sequence의 전체 token 수이고, w_{<t}는 현재 위치 t보다 앞에 있는 token 전체를 뜻합니다. 따라서 곱 기호는 첫 위치부터 마지막 위치까지 각 next-token 조건부 확률을 차례로 곱하라고 읽습니다.",
          },
          {
            id: "p.first-token",
            kind: "paragraph",
            text: "첫 token 앞에는 일반 token prefix가 없습니다. 모델에 따라 BOS처럼 sequence 시작을 나타내는 조건을 둘 수 있으며, 여기서는 시작 조건의 세부 구현까지 확장하지 않습니다.",
          },
          {
            id: "p.not-enumeration",
            kind: "paragraph",
            text: "언어 모델이 가능한 모든 문장을 미리 나열하는 것은 아닙니다. 각 위치에서 현재 context를 받아 next-token distribution을 계산하고, 확률 수학에서는 그 결과를 연쇄로 연결해 sequence 확률을 표현합니다.",
          },
          {
            id: "p.next-question",
            kind: "paragraph",
            text: "이 next-token 계산을 실제 생성에서는 어떻게 반복할까요? 다음 Chapter에서는 선택한 token을 context에 붙여 sequence를 한 단계씩 확장하는 과정을 살펴봅니다.",
          },
          {
            id: "prefix-branches",
            kind: "steps",
            items: [
              { id: "a", title: "A", explanation: "첫 token" },
              {
                id: "b-given-a",
                title: "B | A",
                explanation: "A가 주어진 둘째 token",
              },
              {
                id: "c-given-a-b",
                title: "C | A,B",
                explanation: "A와 B가 주어진 셋째 token",
              },
              {
                id: "product",
                title: "세 항의 곱",
                explanation: "A → B → C sequence 확률",
              },
            ],
          },
          {
            id: "current-model.conditional-probability",
            kind: "callout",
            tone: "important",
            title: "현재 decoder의 조건",
            text: "현재 nanoGPT Edu의 각 위치는 미래 token 없이 causal prefix만 조건으로 사용합니다. 이 Chapter의 확률 연쇄는 그 방향을 symbolic하게 나타냅니다.",
          },
          {
            id: "misconception.one-shot",
            kind: "callout",
            tone: "warning",
            title: "오개념: sequence 확률을 한 번에 직접 출력한다",
            text: "모델은 매 위치의 next-token distribution을 계산하고, 수학적으로 그 조건부 확률들을 연결합니다.",
          },
          {
            id: "misconception.independent",
            kind: "callout",
            tone: "warning",
            title: "오개념: 다음 token 확률은 서로 독립이다",
            text: "각 항은 앞에서 이미 주어진 token sequence를 조건으로 갖습니다.",
          },
          {
            id: "misconception.bar",
            kind: "callout",
            tone: "warning",
            title: "오개념: ‘|’는 나눗셈 기호다",
            text: "‘|’는 오른쪽 정보가 주어졌을 때 왼쪽 사건의 확률이라고 읽습니다.",
          },
          {
            id: "misconception.token-sequence",
            kind: "callout",
            tone: "warning",
            title: "오개념: 단어 sequence에만 적용된다",
            text: "이 Chapter의 확률 연쇄는 tokenizer가 만든 token sequence를 기준으로 합니다.",
          },
          {
            id: "term.conditional",
            kind: "term",
            termId: "conditional-probability",
          },
          { id: "term.joint", kind: "term", termId: "joint-probability" },
          { id: "term.chain", kind: "term", termId: "chain-rule" },
          { id: "term.prefix", kind: "term", termId: "prefix" },
        ],
      },
    ],
    outlineSectionIds: ["decoder.curriculum.guide.1.3.section"],
    keyTakeaway: [{ id: "takeaway", kind: "paragraph", text: TAKEAWAY }],
    glossary: [
      "conditional-probability",
      "joint-probability",
      "chain-rule",
      "prefix",
    ],
  },
  currentModelCalloutId: "current-model.conditional-probability",
  primaryDiagramId: "decoder.diagram.language-model.conditional-probability",
  referenceIds: ["ref.tistory.23", "ref.repo.model", "ref.nanogpt-pinned"],
  misconceptionIds: ["one-shot", "independent", "bar", "token-sequence"],
  chapterRole: "probability",
  figureQuestion: "Sequence 확률은 어떤 next-token 확률의 연쇄인가?",
  authorship: part1Authorship,
} as const satisfies Part1ChapterContent;
