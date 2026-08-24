import type { GuideBlock, LearningNodeId } from "../types";

export const rootAssociatedNodeIds: readonly LearningNodeId[] = [
  "decoder.root.input-context",
  "decoder.root.token-embedding",
  "decoder.root.position-embedding",
  "decoder.root.embedding-add",
  "decoder.root.hidden-state",
  "decoder.root.transformer-block",
  "decoder.root.final-layer-norm",
  "decoder.root.lm-head",
  "decoder.root.logits",
  "decoder.root.token-selection",
  "decoder.root.generated-token",
  "decoder.root.append-context",
];

export const attentionOperationNodeIds: readonly LearningNodeId[] = [
  "decoder.attention.qkv-projection",
  "decoder.attention.score-matmul",
  "decoder.attention.scale",
  "decoder.attention.causal-mask",
  "decoder.attention.softmax",
  "decoder.attention.value-matmul",
  "decoder.attention.merge-heads",
  "decoder.attention.output-projection",
];

export const rootKeyTakeaway: readonly GuideBlock[] = [
  {
    id: "root-key-takeaway",
    kind: "paragraph",
    text: "입력 문맥은 다음 token 예측을 거쳐 한 token씩 확장됩니다.",
  },
];

export const blockKeyTakeaway: readonly GuideBlock[] = [
  {
    id: "block-key-takeaway",
    kind: "paragraph",
    text: "각 Block은 attention과 MLP를 residual 경로에 순서대로 더합니다.",
  },
];

export const attentionKeyTakeaway: readonly GuideBlock[] = [
  {
    id: "attention-key-takeaway",
    kind: "paragraph",
    text: "Causal Self-Attention은 현재 위치까지의 정보만 가중합합니다.",
  },
];
