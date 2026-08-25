import { type Part1ChapterContent, part1Authorship } from "./glossary";

const TAKEAWAY =
  "전체 sequence의 확률은 이전 토큰들이 주어졌을 때 다음 토큰이 나타날 확률들을 이어 곱한 것으로 볼 수 있습니다.";

export const conditionalProbabilityChapterContent = {
  page: {
    id: "decoder.curriculum.guide.1.3",
    routeId: "decoder.root",
    title: "조건부 확률",
    learningGoal:
      "A, B, C의 prefix 조건에서 sequence joint probability의 chain rule을 구성한다.",
    introduction: [
      {
        id: "intro",
        kind: "paragraph",
        text: "Autoregressive 모델의 각 예측은 앞선 선택과 분리되어 있지 않습니다. A에서 B로, 다시 C로 이어지는 조건을 순서대로 적어 봅니다.",
      },
    ],
    sections: [
      {
        id: "decoder.curriculum.guide.1.3.section",
        title: "Prefix가 조건이 되는 확률",
        primaryNodeId: "decoder.root.logits",
        blocks: [
          {
            id: "p.first",
            kind: "paragraph",
            text: "첫 token A의 확률은 아직 앞선 token이 없는 시작 조건에서 정해집니다. 여기서는 특정 숫자 대신 symbolic branch만 사용합니다.",
          },
          {
            id: "p.second",
            kind: "paragraph",
            text: "둘째 token B의 확률은 A가 이미 prefix로 주어진 조건에서 읽습니다. 따라서 B의 선택은 A와 독립이라고 가정하지 않습니다.",
          },
          {
            id: "p.third",
            kind: "paragraph",
            text: "셋째 token C의 조건에는 A와 B가 모두 들어갑니다. 아직 선택하지 않은 미래 token은 이 조건에 포함되지 않습니다.",
          },
          {
            id: "p.three-token-explanation",
            kind: "paragraph",
            text: "A, B, C가 한 sequence로 나타날 joint probability는 첫 token의 확률과 이후 두 prefix 조건부 확률을 차례로 곱해 얻습니다.",
          },
          {
            id: "three-token-formula",
            kind: "formula",
            formulaId: "fundamentals-chain-rule-three-token",
          },
          {
            id: "p.sequence-explanation",
            kind: "paragraph",
            text: "같은 분해를 n개 token으로 늘리면 각 위치 t에서 직전까지의 모든 prefix를 조건으로 둔 항들의 곱이 됩니다.",
          },
          {
            id: "sequence-formula",
            kind: "formula",
            formulaId: "fundamentals-chain-rule-sequence",
          },
          {
            id: "p.sampler-boundary",
            kind: "paragraph",
            text: "Chain rule은 확률 분해의 구조를 설명합니다. 실제 generation run의 수치는 temperature, Top-K, mode 같은 sampler 설정과 어떤 분포를 측정하는지에 따라 달라질 수 있습니다.",
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
                explanation: "A → B → C sequence의 joint probability",
              },
            ],
          },
          {
            id: "current-model.conditional-probability",
            kind: "callout",
            tone: "important",
            title: "현재 decoder의 조건",
            text: "현재 decoder의 각 위치는 미래 token 없이 causal prefix만 조건으로 사용합니다. 이 Chapter의 chain-rule 항은 그 경계를 symbolic하게 나타냅니다.",
          },
          {
            id: "misconception.independent",
            kind: "callout",
            tone: "warning",
            title: "오개념: token 확률은 서로 독립이다",
            text: "각 항은 앞선 prefix를 조건으로 갖습니다.",
          },
          {
            id: "misconception.future-condition",
            kind: "callout",
            tone: "warning",
            title: "오개념: 미래 token이 현재 조건에 들어간다",
            text: "Causal 예측의 조건에는 현재보다 앞선 token만 들어갑니다.",
          },
          {
            id: "misconception.sampler-universal",
            kind: "callout",
            tone: "warning",
            title: "오개념: chain rule 수치는 sampler 설정과 무관한 보편값이다",
            text: "확률의 provenance와 sampler 설정을 함께 밝혀야 실제 수치를 비교할 수 있습니다.",
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
  referenceIds: ["ref.tistory.21", "ref.repo.model", "ref.transformer-paper"],
  misconceptionIds: ["independent", "future-condition", "sampler-universal"],
  authorship: part1Authorship,
} as const satisfies Part1ChapterContent;
