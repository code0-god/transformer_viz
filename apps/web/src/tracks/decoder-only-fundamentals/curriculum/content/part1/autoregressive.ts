import { type Part1ChapterContent, part1Authorship } from "./glossary";

const TAKEAWAY =
  "Autoregressive generation은 다음 token을 하나 예측하고, 그 token을 context에 추가한 뒤, 업데이트된 context로 다시 예측하는 과정을 반복합니다.";

export const autoregressiveChapterContent = {
  page: {
    id: "decoder.curriculum.guide.1.4",
    routeId: "decoder.root",
    title: "Autoregressive Generation",
    learningGoal:
      "한 번의 next-token prediction과 generation loop를 구분하고, 선택한 token이 context에 추가되는 반복과 중지 조건을 설명한다.",
    introduction: [
      {
        id: "intro.plain-loop",
        kind: "paragraph",
        text: "한 token을 골랐다고 generation이 끝나는 것은 아닙니다. 선택한 token을 현재 context 뒤에 붙이고, 길어진 context로 다음 token을 다시 예측하면서 sequence를 한 단계씩 늘립니다.",
      },
      {
        id: "intro.term",
        kind: "paragraph",
        text: "이처럼 이전에 만든 결과를 다음 예측의 입력에 포함하는 방식을 자동회귀(autoregressive)라고 합니다. 핵심은 문장 전체를 한 번에 만드는 것이 아니라, one-step prediction을 반복하는 데 있습니다.",
      },
    ],
    sections: [
      {
        id: "decoder.curriculum.guide.1.4.section",
        title: "한 token씩 늘어나는 context",
        primaryNodeId: "decoder.root.append-context",
        blocks: [
          {
            id: "p.one-step-model",
            kind: "paragraph",
            text: "모델의 한 번 계산은 현재 context에서 다음 token 후보의 logits를 만드는 one-step prediction입니다. 이 계산 자체는 남은 continuation 전체를 완성하지 않습니다.",
          },
          {
            id: "p.generation-loop",
            kind: "paragraph",
            text: "Generation loop는 모델을 호출하고, sampler가 token 하나를 선택하게 한 뒤, 그 token을 context에 붙여 모델을 다시 호출합니다. Model과 loop는 서로 다른 책임입니다.",
          },
          {
            id: "figure.autoregressive-loop",
            kind: "figure",
            figureId: "decoder.diagram.language-model.autoregressive",
            size: "wide",
            caption:
              "선택한 token은 context 끝에 추가되고, 업데이트된 context가 다음 one-step prediction의 입력이 됩니다.",
            alt: "현재 context에서 token 하나를 생성해 다시 context에 붙이고 예측을 반복하는 과정",
          },
          {
            id: "p.example",
            kind: "paragraph",
            text: "설명을 위해 context가 ‘The cat’이고 다음 token으로 ‘s’가 선택되었다고 가정해 보겠습니다. 새 context는 ‘The cats’에 해당하는 token sequence가 되며, 이 예시는 실제 nanoGPT Edu 출력이나 실제 token 경계를 재현한 값이 아닙니다.",
          },
          {
            id: "p.append",
            kind: "paragraph",
            text: "방금 생성한 token은 다음 step에서 입력 context의 일부가 됩니다. Context가 달라졌으므로 다음 위치의 후보 logits도 새로 계산해야 합니다.",
          },
          {
            id: "p.repeat",
            kind: "paragraph",
            text: "Predict, select, append 단계는 중지 조건에 닿을 때까지 반복됩니다. 따라서 autoregressive generation은 one-step prediction을 시간 순서로 연결한 과정이라고 볼 수 있습니다.",
          },
          {
            id: "p.stop-conditions",
            kind: "paragraph",
            text: "Generation은 무한히 계속되지 않습니다. 설정한 생성 길이, EOS token, context 공간, 사용자 중지, 실행 오류처럼 더 진행할 수 없거나 진행하지 않기로 한 조건에서 끝납니다.",
          },
          {
            id: "generation-loop",
            kind: "steps",
            items: [
              {
                id: "predict",
                title: "Predict",
                explanation: "현재 context로 model 호출",
              },
              {
                id: "select",
                title: "Select",
                explanation: "Sampler가 token 하나 선택",
              },
              {
                id: "append",
                title: "Append",
                explanation: "선택한 token을 context 뒤에 추가",
              },
              {
                id: "repeat",
                title: "Repeat",
                explanation: "중지 조건 전까지 다시 predict",
              },
            ],
          },
          {
            id: "terminal-reasons",
            kind: "steps",
            items: [
              {
                id: "max-new-tokens",
                title: "Max new tokens",
                explanation: "설정한 생성 token 수에 도달",
              },
              {
                id: "end-of-sequence",
                title: "EOS",
                explanation: "EOS token이 선택됨",
              },
              {
                id: "context-limit",
                title: "Context limit",
                explanation: "다음 forward를 위한 공간이 없음",
              },
              {
                id: "user-stopped",
                title: "User stop",
                explanation: "사용자가 생성을 중지",
              },
              {
                id: "error",
                title: "Error",
                explanation: "생성 중 오류가 발생",
              },
            ],
          },
          {
            id: "current-model.full-context-recalculation",
            kind: "paragraph",
            text: "현재 nanoGPT Edu는 KV cache를 사용하지 않습니다. 새 token을 붙인 다음 step마다 현재 context 전체를 다시 모델에 넣어 계산합니다.",
          },
          {
            id: "current-model.context-includes-selection",
            kind: "paragraph",
            text: "이 설명은 현재 교육용 모델의 동작입니다. 다른 GPT 구현은 KV cache를 사용할 수 있으므로, 모든 autoregressive model이 context 전체를 항상 다시 계산한다고 일반화하면 안 됩니다.",
          },
          {
            id: "p.next-question",
            kind: "paragraph",
            text: "지금까지는 token sequence가 어떻게 예측되고 이어지는지 살펴보았습니다. Part 2에서는 Token ID가 Transformer가 계산할 수 있는 숫자 vector로 어떻게 바뀌는지 살펴봅니다.",
          },
          {
            id: "current-model.autoregressive",
            kind: "callout",
            tone: "important",
            title: "현재 generation 경계",
            text: "현재 nanoGPT Edu는 KV cache 없이 매 step마다 늘어난 context 전체를 다시 계산합니다. 이 특성은 현재 모델에만 해당합니다.",
          },
          {
            id: "misconception.single-forward",
            kind: "callout",
            tone: "warning",
            title: "오개념: 한 번의 forward로 전체 생성이 끝난다",
            text: "한 step은 다음 token 하나를 만들고, generation loop가 context를 늘려 다음 step을 시작합니다.",
          },
          {
            id: "misconception.generated-context",
            kind: "callout",
            tone: "warning",
            title: "오개념: 생성한 token은 다음 입력과 무관하다",
            text: "선택한 token은 바로 다음 step의 context에 포함됩니다.",
          },
          {
            id: "misconception.sampler-inside",
            kind: "callout",
            tone: "warning",
            title: "오개념: sampler는 Transformer Block 내부 연산이다",
            text: "Transformer model은 logits를 만들고, generation loop의 sampler가 token을 선택합니다.",
          },
          {
            id: "misconception.kv-universal",
            kind: "callout",
            tone: "warning",
            title: "오개념: 모든 GPT는 context 전체를 다시 계산한다",
            text: "No-KV-cache는 현재 nanoGPT Edu의 특성이며 다른 구현은 cache를 사용할 수 있습니다.",
          },
          { id: "term.autoregressive", kind: "term", termId: "autoregressive" },
          {
            id: "term.generation-step",
            kind: "term",
            termId: "generation-step",
          },
          {
            id: "term.context-limit",
            kind: "term",
            termId: "generation-context-length",
          },
          {
            id: "term.stop-condition",
            kind: "term",
            termId: "stop-condition",
          },
        ],
      },
    ],
    outlineSectionIds: ["decoder.curriculum.guide.1.4.section"],
    keyTakeaway: [{ id: "takeaway", kind: "paragraph", text: TAKEAWAY }],
    glossary: [
      "autoregressive",
      "generation-step",
      "generation-context-length",
      "stop-condition",
    ],
  },
  currentModelCalloutId: "current-model.autoregressive",
  primaryDiagramId: "decoder.diagram.language-model.autoregressive",
  referenceIds: ["ref.tistory.23", "ref.repo.generation", "ref.nanogpt-pinned"],
  misconceptionIds: [
    "single-forward",
    "generated-context",
    "sampler-inside",
    "kv-universal",
  ],
  chapterRole: "repeat",
  figureQuestion: "선택한 token은 어떻게 다음 예측을 시작하는가?",
  authorship: part1Authorship,
} as const satisfies Part1ChapterContent;
