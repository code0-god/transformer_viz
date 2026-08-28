import type { LearningGuideSection } from "../types";

export const blockOperationSections: readonly LearningGuideSection[] = [
  {
    id: "block-layer-norm-1",
    title: "LayerNorm 1과 Pre-LN",
    primaryNodeId: "decoder.block.layer-norm-1",
    associatedNodeIds: ["decoder.block.layer-norm-1"],
    blocks: [
      {
        id: "block-ln1-explanation",
        kind: "paragraph",
        text: "LayerNorm 1은 attention 전에 각 token 위치 안의 feature를 따로 정규화합니다. 이 단계 자체는 token 위치 사이의 정보를 섞지 않으며, 하위 연산 앞에 놓여 Pre-LN이라 부릅니다.",
      },
    ],
  },
  {
    id: "block-self-attention",
    title: "Self-Attention",
    primaryNodeId: "decoder.block.self-attention",
    associatedNodeIds: ["decoder.block.self-attention"],
    visualActionLabel: "Self-Attention 흐름 보기",
    blocks: [
      {
        id: "block-attention-role",
        kind: "paragraph",
        text: "Causal Self-Attention은 각 위치가 현재 위치까지의 문맥을 참고해 위치 사이의 정보를 모으도록 합니다. 구체적인 Q, K, V 계산은 다음 학습 단계에서 내려다봅니다.",
      },
    ],
  },
  {
    id: "block-residual-1",
    title: "Residual 1",
    primaryNodeId: "decoder.block.residual-1",
    associatedNodeIds: ["decoder.block.residual-1"],
    blocks: [
      {
        id: "block-residual1-explanation",
        kind: "paragraph",
        text: "첫 residual 덧셈은 attention 출력과 Block 입력을 원소별로 더합니다. 이 연결은 입력 경로를 제공하지만, 입력 정보가 변하지 않거나 항상 더 강하게 남는다고 보장하지 않습니다.",
      },
    ],
  },
  {
    id: "block-layer-norm-2",
    title: "LayerNorm 2",
    primaryNodeId: "decoder.block.layer-norm-2",
    associatedNodeIds: ["decoder.block.layer-norm-2"],
    blocks: [
      {
        id: "block-ln2-explanation",
        kind: "paragraph",
        text: "LayerNorm 2는 첫 residual 결과를 MLP 전에 위치별로 정규화합니다. 따라서 두 번째 하위 연산도 Pre‑LN 순서를 따릅니다.",
      },
    ],
  },
  {
    id: "block-mlp",
    title: "Token-local MLP",
    primaryNodeId: "decoder.block.mlp",
    associatedNodeIds: ["decoder.block.mlp"],
    blocks: [
      {
        id: "block-mlp-explanation",
        kind: "paragraph",
        text: "MLP는 한 위치의 feature를 변환하지만 token 위치끼리 섞지는 않습니다. 같은 Block의 모든 위치에 동일한 MLP 가중치가 적용됩니다.",
      },
    ],
  },
  {
    id: "block-residual-2",
    title: "Residual 2와 출력",
    primaryNodeId: "decoder.block.residual-2",
    associatedNodeIds: ["decoder.block.residual-2"],
    blocks: [
      {
        id: "block-residual2-explanation",
        kind: "paragraph",
        text: "두 번째 residual 덧셈은 MLP 출력과 첫 residual 결과를 더해 Block 출력을 만듭니다. 이 출력은 다음 Block의 hidden state 입력이 됩니다.",
      },
    ],
  },
];
