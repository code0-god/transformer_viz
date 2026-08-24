import type { LearningGuideSection } from "../types";

export const decoderRootFlowSections: readonly LearningGuideSection[] = [
  {
    id: "root-generation-overview",
    title: "텍스트 생성의 전체 흐름",
    blocks: [
      {
        id: "root-generation-overview-copy",
        kind: "paragraph",
        text: "Decoder-only Transformer는 현재 context 전체를 읽고 다음 token 하나의 후보 점수를 만듭니다. 선택된 token을 context 뒤에 붙인 뒤 같은 흐름을 다시 실행하면서 문장을 이어 갑니다.",
      },
      {
        id: "root-generation-steps",
        kind: "steps",
        items: [
          { id: "root-step-read", title: "현재 context를 읽기" },
          { id: "root-step-transform", title: "표현을 차례로 갱신하기" },
          { id: "root-step-predict", title: "다음 token 후보를 점수화하기" },
          { id: "root-step-repeat", title: "선택한 token을 붙이고 반복하기" },
        ],
      },
    ],
  },
  {
    id: "root-token-context",
    title: "Token과 Context",
    primaryNodeId: "decoder.root.input-context",
    associatedNodeIds: ["decoder.root.input-context"],
    blocks: [
      {
        id: "root-token-context-copy",
        kind: "rich-paragraph",
        content: [
          { kind: "term-ref", termId: "token" },
          { kind: "text", text: "은 모델이 처리하는 단위이고, " },
          { kind: "term-ref", termId: "context" },
          { kind: "text", text: "는 지금 예측에 사용되는 token 순서입니다." },
        ],
      },
      {
        id: "root-byte-token-example",
        kind: "example",
        title: "byte token으로 보기",
        lines: ["the cat → t h e ␠ c a t", "␠ = 공백 byte"],
      },
      {
        id: "root-token-boundary-note",
        kind: "callout",
        tone: "important",
        title: "단어 경계와 token 경계는 다릅니다",
        text: "이 예시에서는 각 문자가 byte token으로 보이지만, token이 항상 단어 하나를 뜻하는 것은 아닙니다.",
      },
    ],
  },
  {
    id: "root-embeddings",
    title: "Token과 위치를 숫자 표현으로 바꾸기",
    primaryNodeId: "decoder.root.token-embedding",
    associatedNodeIds: [
      "decoder.root.token-embedding",
      "decoder.root.position-embedding",
      "decoder.root.embedding-add",
    ],
    blocks: [
      {
        id: "root-embedding-copy",
        kind: "paragraph",
        text: "Token Embedding은 token ID에 대응하는 벡터를 찾고, Position Embedding은 context 안의 위치에 대응하는 벡터를 찾습니다. 두 벡터를 원소별로 더하면 각 위치의 token 종류와 순서를 함께 담은 초기 표현이 됩니다.",
      },
      {
        id: "root-embedding-roles",
        kind: "comparison",
        columns: [
          {
            id: "root-token-embedding-role",
            title: "Token Embedding",
            items: ["무엇이 들어왔는지 표현"],
          },
          {
            id: "root-position-embedding-role",
            title: "Position Embedding",
            items: ["어디에 있는지 표현"],
          },
        ],
      },
    ],
  },
  {
    id: "root-hidden-state",
    title: "Hidden State가 갱신되는 방식",
    associatedNodeIds: ["decoder.root.hidden-state"],
    blocks: [
      {
        id: "root-hidden-state-definition",
        kind: "paragraph",
        text: "Hidden state는 각 token 위치에 대해 모델이 현재까지 계산한 숫자 표현입니다. 초기 embedding 합이 X₀가 되고, 각 Transformer Block이 이전 hidden state를 받아 다음 hidden state로 갱신합니다.",
      },
      {
        id: "root-hidden-state-chain",
        kind: "example",
        title: "업데이트 사슬",
        lines: ["embedding 합 → X₀", "X₀ → Block → X₁ → … → Xₙ"],
      },
    ],
  },
  {
    id: "root-transformer-block",
    title: "Transformer Block의 역할",
    primaryNodeId: "decoder.root.transformer-block",
    associatedNodeIds: ["decoder.root.transformer-block"],
    blocks: [
      {
        id: "root-transformer-block-copy",
        kind: "paragraph",
        text: "각 Transformer Block은 token들이 이전 위치의 정보를 참고하게 하고, 각 위치의 표현을 다시 계산해 hidden state를 정교하게 만듭니다. Block들은 같은 구조를 반복하지만 서로 다른 학습 가중치를 사용합니다.",
      },
      {
        id: "root-transformer-block-next",
        kind: "callout",
        tone: "note",
        text: "다음 학습 단계에서 한 Block 안의 Self-Attention, MLP, residual 흐름을 자세히 살펴봅니다.",
      },
    ],
  },
  {
    id: "root-prediction",
    title: "Logit에서 다음 Token 선택까지",
    primaryNodeId: "decoder.root.logits",
    associatedNodeIds: [
      "decoder.root.final-layer-norm",
      "decoder.root.lm-head",
      "decoder.root.logits",
      "decoder.root.token-selection",
    ],
    blocks: [
      {
        id: "root-prediction-copy",
        kind: "paragraph",
        text: "마지막 hidden state는 Final LayerNorm과 LM Head를 지나 vocabulary의 모든 후보에 대한 logit이 됩니다. logit은 아직 확률이 아니며, Temperature와 Top-K 같은 생성 설정을 적용한 뒤 Greedy 또는 Sample 방식으로 다음 token을 선택합니다.",
      },
      {
        id: "root-model-vs-sampling",
        kind: "comparison",
        columns: [
          {
            id: "root-model-output",
            title: "모델 예측",
            items: ["Vocabulary 후보별 logit 출력"],
          },
          {
            id: "root-generation-strategy",
            title: "생성 전략",
            items: ["설정을 적용해 다음 token 선택"],
          },
        ],
      },
    ],
  },
  {
    id: "root-append-repeat",
    title: "붙이고 다시 계산하기",
    primaryNodeId: "decoder.root.append-context",
    associatedNodeIds: [
      "decoder.root.generated-token",
      "decoder.root.append-context",
    ],
    blocks: [
      {
        id: "root-append-repeat-copy",
        kind: "paragraph",
        text: "선택된 token은 context의 맨 뒤에 붙습니다. 다음 생성 단계에서는 길어진 context 전체가 다시 embedding과 모든 Transformer Block을 통과합니다.",
      },
      {
        id: "root-no-kv-cache",
        kind: "callout",
        tone: "important",
        title: "이 교육용 runtime에는 KV cache가 없습니다",
        text: "이전 단계의 Key와 Value를 재사용하지 않으므로, 새 token이 붙을 때마다 현재 context 전체를 완전히 다시 계산합니다.",
      },
    ],
  },
];
