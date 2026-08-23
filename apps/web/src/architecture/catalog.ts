export type ArchitectureNodeId =
  | "root"
  | "input-context"
  | "token-embedding"
  | "position-embedding"
  | "embedding-add"
  | "hidden-state"
  | "transformer-block"
  | "layer-norm-1"
  | "self-attention"
  | "residual-1"
  | "layer-norm-2"
  | "mlp"
  | "residual-2"
  | "final-layer-norm"
  | "lm-head"
  | "logits"
  | "token-selection"
  | "generated-token"
  | "append-context"
  | "attention-qkv-projection"
  | "attention-query"
  | "attention-key"
  | "attention-value"
  | "attention-scores"
  | "attention-scale"
  | "attention-causal-mask"
  | "attention-softmax"
  | "attention-value-aggregation"
  | "attention-merge-heads"
  | "attention-output-projection";

export type ArchitectureNodeCapability = "static" | "selectable" | "drill-down";

export interface ArchitectureNodeDefinition {
  readonly id: ArchitectureNodeId;
  readonly capability: ArchitectureNodeCapability;
  readonly accessibleName: string;
}

export const ARCHITECTURE_NODE_IDS: readonly ArchitectureNodeId[] = [
  "root",
  "input-context",
  "token-embedding",
  "position-embedding",
  "embedding-add",
  "hidden-state",
  "transformer-block",
  "layer-norm-1",
  "self-attention",
  "residual-1",
  "layer-norm-2",
  "mlp",
  "residual-2",
  "final-layer-norm",
  "lm-head",
  "logits",
  "token-selection",
  "generated-token",
  "append-context",
  "attention-qkv-projection",
  "attention-query",
  "attention-key",
  "attention-value",
  "attention-scores",
  "attention-scale",
  "attention-causal-mask",
  "attention-softmax",
  "attention-value-aggregation",
  "attention-merge-heads",
  "attention-output-projection",
];

function node(
  id: ArchitectureNodeId,
  capability: ArchitectureNodeCapability,
  accessibleName: string,
): ArchitectureNodeDefinition {
  return { id, capability, accessibleName };
}

export const architectureNodeCatalog: Readonly<
  Record<ArchitectureNodeId, ArchitectureNodeDefinition>
> = {
  root: node("root", "static", "GPT Architecture"),
  "input-context": node(
    "input-context",
    "selectable",
    "현재 input token sequence",
  ),
  "token-embedding": node(
    "token-embedding",
    "selectable",
    "Token embedding lookup",
  ),
  "position-embedding": node(
    "position-embedding",
    "selectable",
    "Position embedding lookup",
  ),
  "embedding-add": node(
    "embedding-add",
    "static",
    "Token과 Position embedding의 원소별 덧셈",
  ),
  "hidden-state": node("hidden-state", "static", "초기 hidden state X zero"),
  "transformer-block": node(
    "transformer-block",
    "drill-down",
    "반복 Transformer Blocks",
  ),
  "layer-norm-1": node(
    "layer-norm-1",
    "selectable",
    "LayerNorm 1, Block 입력 정규화",
  ),
  "self-attention": node(
    "self-attention",
    "drill-down",
    "Causal Multi-Head Self-Attention",
  ),
  "residual-1": node("residual-1", "selectable", "첫 번째 residual 덧셈"),
  "layer-norm-2": node(
    "layer-norm-2",
    "selectable",
    "LayerNorm 2, 첫 residual 결과 정규화",
  ),
  mlp: node("mlp", "selectable", "MLP feed-forward network"),
  "residual-2": node("residual-2", "selectable", "두 번째 residual 덧셈"),
  "final-layer-norm": node("final-layer-norm", "selectable", "Final LayerNorm"),
  "lm-head": node("lm-head", "selectable", "LM Head Linear projection"),
  logits: node("logits", "selectable", "Vocabulary logits"),
  "token-selection": node("token-selection", "selectable", "다음 token 선택"),
  "generated-token": node("generated-token", "selectable", "생성된 token"),
  "append-context": node(
    "append-context",
    "selectable",
    "생성 token을 context에 추가",
  ),
  "attention-qkv-projection": node(
    "attention-qkv-projection",
    "selectable",
    "QKV Projection, 하나의 Linear layer",
  ),
  "attention-query": node("attention-query", "selectable", "Query tensor Q"),
  "attention-key": node("attention-key", "selectable", "Key tensor K"),
  "attention-value": node("attention-value", "selectable", "Value tensor V"),
  "attention-scores": node(
    "attention-scores",
    "selectable",
    "Score MatMul, Query와 전치된 Key의 행렬곱",
  ),
  "attention-scale": node(
    "attention-scale",
    "selectable",
    "Scale, score를 head dimension 제곱근으로 나누기",
  ),
  "attention-causal-mask": node(
    "attention-causal-mask",
    "selectable",
    "Causal Mask, 미래 token position 차단",
  ),
  "attention-softmax": node(
    "attention-softmax",
    "selectable",
    "Softmax, attention probability 정규화",
  ),
  "attention-value-aggregation": node(
    "attention-value-aggregation",
    "selectable",
    "Value MatMul, attention probability와 Value의 행렬곱",
  ),
  "attention-merge-heads": node(
    "attention-merge-heads",
    "selectable",
    "Merge Heads, head output 연결과 reshape",
  ),
  "attention-output-projection": node(
    "attention-output-projection",
    "selectable",
    "Output Projection, Linear C to C",
  ),
};
