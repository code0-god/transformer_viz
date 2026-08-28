import { type Part1ChapterContent, part1Authorship } from "./glossary";

const TAKEAWAY =
  "Autoregressive generation은 “다음 token 예측 → context에 추가 → 다시 예측”을 반복합니다.";

export const autoregressiveChapterContent = {
  page: {
    id: "decoder.curriculum.guide.1.4",
    routeId: "decoder.root",
    title: "Autoregressive Generation",
    learningGoal:
      "Predict, append, repeat loop에서 모델과 sampler의 책임을 나누고 현재 runtime의 종료 경계를 설명한다.",
    introduction: [
      {
        id: "intro",
        kind: "paragraph",
        text: "한 token을 골랐다고 generation이 끝나는 것은 아닙니다. 선택한 token을 context에 붙여 다음 단계의 입력으로 만드는 반복 구조를 살펴봅니다.",
      },
      {
        id: "figure.autoregressive-loop",
        kind: "figure",
        figureId: "decoder.diagram.language-model.autoregressive",
        size: "wide",
        caption:
          "Autoregressive generation은 token 하나를 예측해 context에 붙이고 같은 계산을 반복합니다.",
        alt: "다음 token 예측, 선택, context 추가, 반복 흐름",
      },
    ],
    sections: [
      {
        id: "decoder.curriculum.guide.1.4.section",
        title: "한 token씩 늘어나는 context",
        primaryNodeId: "decoder.root.append-context",
        blocks: [
          {
            id: "p.predict",
            kind: "paragraph",
            text: "Predict 단계에서 모델은 현재 accumulated prefix를 forward하고 마지막 위치의 raw logits를 반환합니다.",
          },
          {
            id: "p.sampler",
            kind: "paragraph",
            text: "Sampler는 generation config를 적용해 다음 token 하나를 고릅니다. Transformer가 sampling mode나 Top-K 선택을 대신 결정하지 않습니다.",
          },
          {
            id: "p.append",
            kind: "paragraph",
            text: "Append 단계는 selected token을 prefix 끝에 추가합니다. 새 token은 다음 generation step에서 모델 context의 일부가 됩니다.",
          },
          {
            id: "p.repeat",
            kind: "paragraph",
            text: "Repeat 단계에서는 길어진 prefix로 다시 predict를 시작합니다. 한 번의 forward가 남은 continuation 전체를 미리 만들지는 않습니다.",
          },
          {
            id: "current-runtime.full-prefix-reforward",
            kind: "paragraph",
            text: "현재 active generation은 block_size에 닿기 전까지 매 단계의 full accumulated prefix를 모델에 다시 forward합니다.",
          },
          {
            id: "current-runtime.no-persistent-generation-kv-cache",
            kind: "paragraph",
            text: "현재 runtime에는 persistent generation KV cache가 없습니다. Replay cache는 선택한 과거 step을 inspection하기 위한 경계이며 active generation 계산을 재사용하지 않습니다.",
          },
          {
            id: "generation-loop",
            kind: "steps",
            items: [
              {
                id: "predict",
                title: "Predict",
                explanation: "현재 full prefix를 forward",
              },
              {
                id: "select",
                title: "Sampler selects",
                explanation: "설정 적용 후 token 하나 선택",
              },
              {
                id: "append",
                title: "Append",
                explanation: "선택한 token을 context 뒤에 추가",
              },
              {
                id: "repeat",
                title: "Repeat",
                explanation: "종료 조건 전까지 다시 predict",
              },
            ],
          },
          {
            id: "terminal-reasons",
            kind: "steps",
            items: [
              {
                id: "max-new-tokens",
                title: "Max tokens",
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
                explanation: "사용자가 현재 run을 중지",
              },
              {
                id: "replaced",
                title: "Replacement",
                explanation: "새 generation이 기존 run을 대체",
              },
              {
                id: "error",
                title: "Error",
                explanation: "시작된 generation이 실패",
              },
            ],
          },
          {
            id: "current-model.autoregressive",
            kind: "callout",
            tone: "important",
            title: "현재 generation 경계",
            text: "현재 active generation은 block_size까지 full accumulated prefix를 매 step 다시 forward하며 persistent generation KV cache를 사용하지 않습니다.",
          },
          {
            id: "misconception.single-forward",
            kind: "callout",
            tone: "warning",
            title: "오개념: 한 번의 forward로 전체 생성이 끝난다",
            text: "한 step은 token 하나를 선택하고 context를 늘린 뒤 다시 forward합니다.",
          },
          {
            id: "misconception.kv-cache",
            kind: "callout",
            tone: "warning",
            title: "오개념: 현재 runtime이 KV cache를 사용한다",
            text: "Active generation은 매 step full prefix를 다시 계산합니다.",
          },
          {
            id: "misconception.stop-equivalence",
            kind: "callout",
            tone: "warning",
            title: "오개념: EOS와 user stop은 같은 종료 이유다",
            text: "하나는 모델 token 선택이고 다른 하나는 호출자의 명시적 중지입니다.",
          },
          { id: "term.autoregressive", kind: "term", termId: "autoregressive" },
          {
            id: "term.generation-step",
            kind: "term",
            termId: "generation-step",
          },
          { id: "term.context-limit", kind: "term", termId: "context-length" },
          { id: "term.kv-cache", kind: "term", termId: "kv-cache" },
          {
            id: "term.terminal-reason",
            kind: "term",
            termId: "terminal-reason",
          },
        ],
      },
    ],
    outlineSectionIds: ["decoder.curriculum.guide.1.4.section"],
    keyTakeaway: [{ id: "takeaway", kind: "paragraph", text: TAKEAWAY }],
    glossary: [
      "autoregressive",
      "generation-step",
      "context-length",
      "kv-cache",
      "terminal-reason",
    ],
  },
  currentModelCalloutId: "current-model.autoregressive",
  primaryDiagramId: "decoder.diagram.language-model.autoregressive",
  referenceIds: ["ref.tistory.21", "ref.repo.generation", "ref.nanogpt-pinned"],
  misconceptionIds: ["single-forward", "kv-cache", "stop-equivalence"],
  authorship: part1Authorship,
} as const satisfies Part1ChapterContent;
