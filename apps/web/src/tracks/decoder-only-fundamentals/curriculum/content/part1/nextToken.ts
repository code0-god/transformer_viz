import { type Part1ChapterContent, part1Authorship } from "./glossary";

const TAKEAWAY =
  "모델은 vocabulary 각 token의 logit을 만들고, sampler는 generation 설정과 Softmax로 선택 분포를 만든 뒤 다음 token을 고릅니다.";

export const nextTokenChapterContent = {
  page: {
    id: "decoder.curriculum.guide.1.2",
    routeId: "decoder.root",
    title: "다음 Token 예측",
    learningGoal:
      "Vocabulary 전체의 logit, Softmax 확률 분포, sampler의 선택을 구분하고 한 번의 next-token prediction을 설명한다.",
    introduction: [
      {
        id: "intro.one-step",
        kind: "paragraph",
        text: "앞 Chapter에서는 언어 모델이 현재 context를 보고 다음 token 후보를 평가한다고 설명했습니다. 이제 ‘The cat sat on the’라는 context가 token 하나의 선택으로 이어지는 한 단계를 자세히 살펴봅니다.",
      },
      {
        id: "intro.boundary",
        kind: "paragraph",
        text: "이 과정에는 서로 다른 두 책임이 있습니다. 모델은 후보별 점수를 만들고, sampler는 generation 설정에 따라 실제 다음 token을 선택합니다.",
      },
    ],
    sections: [
      {
        id: "decoder.curriculum.guide.1.2.section",
        title: "Vocabulary 점수에서 token 하나까지",
        primaryNodeId: "decoder.root.token-selection",
        blocks: [
          {
            id: "p.input",
            kind: "paragraph",
            text: "입력은 현재 context입니다. 모델은 이 token sequence를 한 번 계산해 바로 다음 위치에 필요한 출력 값을 만듭니다.",
          },
          {
            id: "p.vocabulary",
            kind: "paragraph",
            text: "후보 집합은 사람이 생각한 몇 개의 단어가 아니라 vocabulary에 등록된 모든 token입니다. Part 0에서 본 것처럼 현재 tokenizer는 byte 기반이므로 token과 단어를 같은 단위로 볼 수 없습니다.",
          },
          {
            id: "p.logit",
            kind: "paragraph",
            text: "모델은 vocabulary의 각 token에 logit을 만듭니다. Logit은 Softmax 이전의 raw score이며, 음수일 수도 있고 전체 합이 1일 필요도 없습니다. 아직 확률이 아닙니다.",
          },
          {
            id: "figure.next-token",
            kind: "figure",
            figureId: "decoder.diagram.language-model.next-token",
            size: "wide",
            caption:
              "한 context는 vocabulary logit, generation 설정과 Softmax, sampler를 차례로 거쳐 다음 token 하나로 이어집니다.",
            alt: "Vocabulary 전체의 logit에서 선택 분포와 sampler를 거쳐 다음 token 하나가 되는 과정",
          },
          {
            id: "p.softmax-explanation",
            kind: "paragraph",
            text: "Softmax는 주어진 logit들을 0과 1 사이의 값으로 바꾸고 전체 합이 1인 확률 분포를 만듭니다. 점수의 순서는 유지하면서 후보를 서로 비교할 수 있는 비율로 바꾸는 연산입니다.",
          },
          {
            id: "softmax-formula",
            kind: "formula",
            formulaId: "fundamentals-next-token-softmax",
          },
          {
            id: "p.formula-reading",
            kind: "paragraph",
            text: "수식에서 z_i는 후보 i의 logit이고 P_i는 Softmax로 변환한 확률입니다. 분자는 후보 i의 지수값, 분모는 모든 후보의 지수값 합이므로 P_i를 모두 더하면 1이 됩니다.",
          },
          {
            id: "p.selection-settings",
            kind: "paragraph",
            text: "실제 generation에서는 sampler가 Temperature로 점수 차이의 선명도를 조절하고, Top-K로 상위 K개 후보만 남길 수 있습니다. 그 후보들에 Softmax를 적용해 선택에 사용할 분포를 만듭니다.",
          },
          {
            id: "p.model-sampler",
            kind: "paragraph",
            text: "Model의 책임은 logits 계산까지이고 sampler의 책임은 설정을 적용해 token 하나를 고르는 것입니다. 어떤 선택 규칙을 쓰더라도 이 책임의 경계는 바뀌지 않습니다.",
          },
          {
            id: "p.lab",
            kind: "paragraph",
            text: "모델 실험실에서는 같은 prompt로 Temperature와 Top-K를 바꾸며 선택 방식의 차이를 확인할 수 있습니다. 이 설정은 Transformer Block 내부 연산이 아니라 generation 단계에 속합니다.",
          },
          {
            id: "p.next-question",
            kind: "paragraph",
            text: "다음 token 확률을 매 위치에서 이어 계산한다면 전체 sequence의 확률은 어떻게 표현할 수 있을까요? 다음 Chapter에서는 이 연결을 조건부 확률로 읽습니다.",
          },
          {
            id: "prediction-stages",
            kind: "steps",
            items: [
              { id: "context", title: "Context" },
              {
                id: "vocabulary-logits",
                title: "Vocabulary logits",
                explanation: "모든 token 후보의 raw score",
              },
              {
                id: "selection-distribution",
                title: "Selection distribution",
                explanation: "Temperature · Top-K · Softmax",
              },
              {
                id: "sampler",
                title: "Sampler",
                explanation: "선택 규칙 실행",
              },
              { id: "next-token", title: "Next token" },
            ],
          },
          {
            id: "current-model.next-token",
            kind: "callout",
            tone: "important",
            title: "현재 nanoGPT Edu의 한 단계",
            text: "현재 모델은 vocabulary 전체의 raw logits를 만들고, generation sampler는 mode, Temperature, Top-K를 적용해 다음 token 하나를 선택합니다.",
          },
          {
            id: "misconception.logit-probability",
            kind: "callout",
            tone: "warning",
            title: "오개념: logit과 probability는 같다",
            text: "Logit은 정규화 전 raw score이고 probability는 Softmax를 거친 분포의 값입니다.",
          },
          {
            id: "misconception.argmax",
            kind: "callout",
            tone: "warning",
            title: "오개념: 가장 큰 값이 언제나 선택된다",
            text: "Greedy mode는 가장 큰 logit을 고르지만 Sample mode는 설정이 적용된 분포에서 token을 뽑습니다.",
          },
          {
            id: "misconception.model-sampler",
            kind: "callout",
            tone: "warning",
            title: "오개념: 모델과 sampler는 같은 계산이다",
            text: "모델은 logits를 만들고 sampler는 그 점수와 generation 설정으로 token을 선택합니다.",
          },
          {
            id: "misconception.word-candidates",
            kind: "callout",
            tone: "warning",
            title: "오개념: 후보는 사람이 떠올린 단어 목록이다",
            text: "후보는 current vocabulary의 모든 token이며, 한 token이 한 단어와 같지 않을 수 있습니다.",
          },
          { id: "term.logit", kind: "term", termId: "logit" },
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
  referenceIds: ["ref.tistory.23", "ref.repo.model", "ref.nanogpt-pinned"],
  misconceptionIds: [
    "logit-probability",
    "argmax",
    "model-sampler",
    "word-candidates",
  ],
  chapterRole: "one-step",
  figureQuestion: "한 context는 어떻게 다음 token 하나로 이어지는가?",
  authorship: part1Authorship,
} as const satisfies Part1ChapterContent;
