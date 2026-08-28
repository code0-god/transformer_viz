import { type Part1ChapterContent, part1Authorship } from "./glossary";

const TAKEAWAY =
  "다음 token 예측은 현재 문맥을 이용해 vocabulary 전체의 점수를 만든 뒤 한 token을 선택하는 과정입니다.";

export const nextTokenChapterContent = {
  page: {
    id: "decoder.curriculum.guide.1.2",
    routeId: "decoder.root",
    title: "다음 Token 예측",
    learningGoal:
      "모델 점수, 전체-vocabulary inspection 분포, sampler retained-set 분포, selected token을 서로 다른 단계로 추적한다.",
    introduction: [
      {
        id: "intro",
        kind: "paragraph",
        text: "다음 token 하나가 정해질 때에는 모델 계산과 생성 전략이 차례로 만납니다. 같은 ‘확률’이라는 말로 합치지 않고 각 값의 역할을 구분합니다.",
      },
      {
        id: "figure.next-token",
        kind: "figure",
        figureId: "decoder.diagram.language-model.next-token",
        size: "wide",
        caption:
          "LM Head의 logit은 후보 점수이며, 생성 설정을 적용한 sampler가 다음 token을 선택합니다.",
        alt: "Context에서 logit과 sampler를 거쳐 다음 token을 선택하는 단계",
      },
    ],
    sections: [
      {
        id: "decoder.curriculum.guide.1.2.section",
        title: "점수와 선택 사이의 경계",
        primaryNodeId: "decoder.root.token-selection",
        blocks: [
          {
            id: "p.context-transformer",
            kind: "paragraph",
            text: "Context ‘the cat sat on the’가 Transformer를 통과하면 각 위치의 hidden state가 만들어지고, 마지막 위치의 hidden state가 다음 후보 계산을 대표합니다.",
          },
          {
            id: "p.lm-head",
            kind: "paragraph",
            text: "LM head는 마지막 hidden state를 vocabulary 크기의 raw logits로 투영합니다. raw logit은 비교 가능한 점수이지 확률이 아닙니다.",
          },
          {
            id: "p.inspection",
            kind: "paragraph",
            text: "모델 forward가 반환한 full-vocabulary inspection probability는 temperature나 Top-K를 적용하기 전 모든 vocabulary 후보를 관찰하기 위한 분포입니다.",
          },
          {
            id: "p.softmax-explanation",
            kind: "paragraph",
            text: "Softmax는 각 raw logit의 지수값을 전체 후보 지수값의 합으로 나누어, 후보별 값이 0과 1 사이이고 전체 합이 1인 분포를 만듭니다.",
          },
          {
            id: "softmax-formula",
            kind: "formula",
            formulaId: "fundamentals-next-token-softmax",
          },
          {
            id: "p.sampler",
            kind: "paragraph",
            text: "Sampler는 별도로 temperature와 Top-K를 적용하고 retained set 안에서 다시 정규화한 probability를 사용합니다. 이 값은 full-vocabulary inspection probability와 같은 분포가 아닙니다.",
          },
          {
            id: "p.selected",
            kind: "paragraph",
            text: "마지막에는 sampler가 retained-set probability와 mode에 따라 selected token 하나를 정합니다.",
          },
          {
            id: "prediction-stages",
            kind: "steps",
            items: [
              { id: "context", title: "Context" },
              { id: "transformer", title: "Transformer" },
              { id: "last-hidden-state", title: "Last hidden state" },
              { id: "lm-head", title: "LM head" },
              { id: "raw-logit", title: "Raw logit" },
              {
                id: "full-vocabulary-inspection-probability",
                title: "Full-vocabulary inspection probability",
              },
              {
                id: "sampler-retained-set-probability",
                title:
                  "Sampler retained-set probability after Temperature / Top-K",
              },
              { id: "selected-token", title: "Selected token" },
            ],
          },
          {
            id: "current-model.next-token",
            kind: "callout",
            tone: "important",
            title: "현재 모델의 두 확률",
            text: "현재 nanoGPT Edu는 vocabulary 전체를 살펴보는 확률과 sampler가 실제 선택에 사용하는 retained-set probability를 구분합니다.",
          },
          {
            id: "misconception.logit-probability",
            kind: "callout",
            tone: "warning",
            title: "오개념: logit과 probability는 같다",
            text: "Raw logit은 정규화 전 모델 점수입니다.",
          },
          {
            id: "misconception.distribution-merge",
            kind: "callout",
            tone: "warning",
            title: "오개념: inspection 분포와 sampler 분포는 같다",
            text: "Sampler 분포는 temperature와 Top-K 이후 retained set에서 정의됩니다.",
          },
          {
            id: "misconception.argmax",
            kind: "callout",
            tone: "warning",
            title: "오개념: 가장 높은 token이 언제나 선택된다",
            text: "Sample mode에서는 seeded draw가 retained distribution에서 token을 고릅니다.",
          },
          { id: "term.softmax", kind: "term", termId: "softmax" },
          {
            id: "term.distribution",
            kind: "term",
            termId: "probability-distribution",
          },
          { id: "term.sampler", kind: "term", termId: "sampler" },
          { id: "term.selected-token", kind: "term", termId: "selected-token" },
        ],
      },
    ],
    outlineSectionIds: ["decoder.curriculum.guide.1.2.section"],
    keyTakeaway: [{ id: "takeaway", kind: "paragraph", text: TAKEAWAY }],
    glossary: [
      "softmax",
      "probability-distribution",
      "sampler",
      "selected-token",
    ],
  },
  currentModelCalloutId: "current-model.next-token",
  primaryDiagramId: "decoder.diagram.language-model.next-token",
  referenceIds: ["ref.tistory.21", "ref.repo.schema", "ref.nanogpt-pinned"],
  misconceptionIds: ["logit-probability", "distribution-merge", "argmax"],
  authorship: part1Authorship,
} as const satisfies Part1ChapterContent;
