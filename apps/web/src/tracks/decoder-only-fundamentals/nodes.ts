import type { ArchitectureNodeId } from "../../architecture";
import type { LearningNodeId } from "../types";

export const decoderNodeMap = {
  "decoder.root.architecture": "root",
  "decoder.root.input-context": "input-context",
  "decoder.root.token-embedding": "token-embedding",
  "decoder.root.position-embedding": "position-embedding",
  "decoder.root.embedding-add": "embedding-add",
  "decoder.root.hidden-state": "hidden-state",
  "decoder.root.transformer-block": "transformer-block",
  "decoder.block.layer-norm-1": "layer-norm-1",
  "decoder.block.self-attention": "self-attention",
  "decoder.block.residual-1": "residual-1",
  "decoder.block.layer-norm-2": "layer-norm-2",
  "decoder.block.mlp": "mlp",
  "decoder.block.residual-2": "residual-2",
  "decoder.root.final-layer-norm": "final-layer-norm",
  "decoder.root.lm-head": "lm-head",
  "decoder.root.logits": "logits",
  "decoder.root.token-selection": "token-selection",
  "decoder.root.generated-token": "generated-token",
  "decoder.root.append-context": "append-context",
  "decoder.attention.qkv-projection": "attention-qkv-projection",
  "decoder.attention.query": "attention-query",
  "decoder.attention.key": "attention-key",
  "decoder.attention.value": "attention-value",
  "decoder.attention.score-matmul": "attention-scores",
  "decoder.attention.scale": "attention-scale",
  "decoder.attention.causal-mask": "attention-causal-mask",
  "decoder.attention.softmax": "attention-softmax",
  "decoder.attention.value-matmul": "attention-value-aggregation",
  "decoder.attention.merge-heads": "attention-merge-heads",
  "decoder.attention.output-projection": "attention-output-projection",
} as const satisfies Readonly<
  Partial<Record<LearningNodeId, ArchitectureNodeId>>
>;

export type DecoderNodeId = keyof typeof decoderNodeMap;
