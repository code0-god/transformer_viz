import type { ArchitectureNodeId } from "../architecture/catalog";
import {
  decoderAttentionSummary,
  decoderNotationEntries,
} from "../tracks/decoder-only-fundamentals/notation";
import {
  INLINE_FORMULA_IDS,
  type InlineFormulaId,
  inlineFormulaCatalog,
} from "./inlineFormulaCatalog";

export type FormulaId =
  | ArchitectureNodeId
  | InlineFormulaId
  | "attention-summary"
  | "block-input-state"
  | "attention-input-state"
  | "attention-query-heads"
  | "attention-key-heads"
  | "attention-value-heads"
  | "attention-head-outputs"
  | "attention-output-state";

export type RuntimeFormulaId =
  | "root-model-width-value"
  | "block-layer-count-value"
  | "attention-symbolic-shape"
  | "attention-current-shape"
  | "attention-head-shape"
  | "attention-full-head-shape";

export interface FormulaDefinition<Id extends string = string> {
  readonly id: Id;
  readonly tex: string;
  readonly plainText: string;
  readonly accessibleLabel: string;
}

function formula(
  id: ArchitectureNodeId,
): FormulaDefinition<ArchitectureNodeId> {
  const notation = decoderNotationEntries[id];
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
  "block-input-state",
  "attention-input-state",
  "attention-query-heads",
  "attention-key-heads",
  "attention-value-heads",
  "attention-head-outputs",
  "attention-output-state",
  ...INLINE_FORMULA_IDS,
];

export const formulaCatalog: Readonly<
  Record<FormulaId, FormulaDefinition<FormulaId>>
> = {
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
    plainText: decoderAttentionSummary,
    accessibleLabel: "Self-Attention summary",
  },
  "block-input-state": {
    id: "block-input-state",
    tex: "X_{\\mathrm{in}}\\;[T,C]",
    plainText: "X_in [T, C]",
    accessibleLabel: "Block input tensor X in, shape T by C",
  },
  "attention-input-state": {
    id: "attention-input-state",
    tex: "X = X_{\\mathrm{LN1}}\\;[T,C]",
    plainText: "X = X_LN1 [T, C]",
    accessibleLabel: "Attention input X equals X LN1, shape T by C",
  },
  "attention-query-heads": {
    id: "attention-query-heads",
    tex: "Q\\colon [T,C] \\to [H,T,D]",
    plainText: "Q: [T, C] → [H, T, D]",
    accessibleLabel: "Query split into H heads, shape H by T by D",
  },
  "attention-key-heads": {
    id: "attention-key-heads",
    tex: "K\\colon [T,C] \\to [H,T,D]",
    plainText: "K: [T, C] → [H, T, D]",
    accessibleLabel: "Key split into H heads, shape H by T by D",
  },
  "attention-value-heads": {
    id: "attention-value-heads",
    tex: "V\\colon [T,C] \\to [H,T,D]",
    plainText: "V: [T, C] → [H, T, D]",
    accessibleLabel: "Value split into H heads, shape H by T by D",
  },
  "attention-head-outputs": {
    id: "attention-head-outputs",
    tex: "Y\\;[H,T,D]",
    plainText: "Y [H, T, D]",
    accessibleLabel: "Head output tensor Y, shape H by T by D",
  },
  "attention-output-state": {
    id: "attention-output-state",
    tex: "Y_{\\mathrm{attn}}\\;[T,C]",
    plainText: "Y_attn [T, C]",
    accessibleLabel: "Attention output tensor Y attention, shape T by C",
  },
  ...inlineFormulaCatalog,
};
