import type { ArchitectureNodeId } from "../architecture/catalog";
import { ATTENTION_SUMMARY, notationCatalog } from "../domain/notation";

export type FormulaId = ArchitectureNodeId | "attention-summary";

export interface FormulaDefinition {
  readonly id: FormulaId;
  readonly tex: string;
  readonly plainText: string;
  readonly accessibleLabel: string;
}

function formula(id: ArchitectureNodeId): FormulaDefinition {
  const notation = notationCatalog[id];
  return {
    id,
    tex: notation.tex,
    plainText: notation.plainText,
    accessibleLabel: notation.accessibleName,
  };
}

export const FORMULA_IDS: readonly FormulaId[] = [
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
  "attention-summary",
];

export const formulaCatalog: Readonly<Record<FormulaId, FormulaDefinition>> = {
  root: formula("root"),
  "input-context": formula("input-context"),
  "token-embedding": formula("token-embedding"),
  "position-embedding": formula("position-embedding"),
  "embedding-add": formula("embedding-add"),
  "hidden-state": formula("hidden-state"),
  "transformer-block": formula("transformer-block"),
  "layer-norm-1": formula("layer-norm-1"),
  "self-attention": formula("self-attention"),
  "residual-1": formula("residual-1"),
  "layer-norm-2": formula("layer-norm-2"),
  mlp: formula("mlp"),
  "residual-2": formula("residual-2"),
  "final-layer-norm": formula("final-layer-norm"),
  "lm-head": formula("lm-head"),
  logits: formula("logits"),
  "token-selection": formula("token-selection"),
  "generated-token": formula("generated-token"),
  "append-context": formula("append-context"),
  "attention-qkv-projection": formula("attention-qkv-projection"),
  "attention-query": formula("attention-query"),
  "attention-key": formula("attention-key"),
  "attention-value": formula("attention-value"),
  "attention-scores": formula("attention-scores"),
  "attention-scale": formula("attention-scale"),
  "attention-causal-mask": formula("attention-causal-mask"),
  "attention-softmax": formula("attention-softmax"),
  "attention-value-aggregation": formula("attention-value-aggregation"),
  "attention-merge-heads": formula("attention-merge-heads"),
  "attention-output-projection": formula("attention-output-projection"),
  "attention-summary": {
    id: "attention-summary",
    tex: "Y_h = \\operatorname{softmax}\\!\\left(\\operatorname{CausalMask}\\!\\left(\\frac{Q_h K_h^{\\mathsf T}}{\\sqrt D}\\right)\\right)V_h",
    plainText: ATTENTION_SUMMARY,
    accessibleLabel: "Self-Attention summary",
  },
};
