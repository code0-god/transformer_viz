import type { FormulaDefinition } from "./formulaCatalog";

export const INLINE_FORMULA_IDS = [
  "root-output-state",
  "attention-value-edge",
  "attention-input-definition",
  "attention-symbol-sequence-length",
  "attention-symbol-model-width",
  "attention-symbol-head-count",
  "attention-symbol-head-dimension",
  "attention-symbol-head-index",
  "attention-symbol-query-index",
  "attention-symbol-key-index",
  "attention-symbol-input",
  "attention-symbol-qkv",
  "attention-symbol-scores",
  "attention-symbol-probabilities",
  "attention-symbol-head-output",
  "attention-scale-factor",
  "attention-mask-keep",
  "attention-mask-block",
] as const;

export type InlineFormulaId = (typeof INLINE_FORMULA_IDS)[number];

function inlineFormula(
  id: InlineFormulaId,
  tex: string,
  plainText: string,
  accessibleLabel: string,
): FormulaDefinition {
  return { id, tex, plainText, accessibleLabel };
}

export const inlineFormulaCatalog: Readonly<
  Record<InlineFormulaId, FormulaDefinition>
> = {
  "root-output-state": inlineFormula(
    "root-output-state",
    "\\text{Hidden State }X_N\\;[T,C]",
    "Hidden State X_N [T, C]",
    "Hidden state X N, shape T by C",
  ),
  "attention-value-edge": inlineFormula(
    "attention-value-edge",
    "V_h\\;[T,D]",
    "V_h [T, D]",
    "Value tensor for the selected head, shape T by D",
  ),
  "attention-input-definition": inlineFormula(
    "attention-input-definition",
    "X = X_{\\mathrm{LN1}}",
    "X = X_LN1",
    "Attention input X equals LayerNorm 1 output X LN1",
  ),
  "attention-symbol-sequence-length": inlineFormula(
    "attention-symbol-sequence-length",
    "T",
    "T",
    "Sequence length T",
  ),
  "attention-symbol-model-width": inlineFormula(
    "attention-symbol-model-width",
    "C",
    "C",
    "Model dimension C",
  ),
  "attention-symbol-head-count": inlineFormula(
    "attention-symbol-head-count",
    "H",
    "H",
    "Attention head count H",
  ),
  "attention-symbol-head-dimension": inlineFormula(
    "attention-symbol-head-dimension",
    "D",
    "D",
    "Head dimension D",
  ),
  "attention-symbol-head-index": inlineFormula(
    "attention-symbol-head-index",
    "h",
    "h",
    "Selected head index h",
  ),
  "attention-symbol-query-index": inlineFormula(
    "attention-symbol-query-index",
    "i",
    "i",
    "Query token index i",
  ),
  "attention-symbol-key-index": inlineFormula(
    "attention-symbol-key-index",
    "j",
    "j",
    "Key token index j",
  ),
  "attention-symbol-input": inlineFormula(
    "attention-symbol-input",
    "X",
    "X",
    "Attention input X",
  ),
  "attention-symbol-qkv": inlineFormula(
    "attention-symbol-qkv",
    "Q\\,/\\,K\\,/\\,V",
    "Q / K / V",
    "Query, Key, and Value tensors",
  ),
  "attention-symbol-scores": inlineFormula(
    "attention-symbol-scores",
    "S_h",
    "S_h",
    "Attention scores S h",
  ),
  "attention-symbol-probabilities": inlineFormula(
    "attention-symbol-probabilities",
    "A_h",
    "A_h",
    "Attention probabilities A h",
  ),
  "attention-symbol-head-output": inlineFormula(
    "attention-symbol-head-output",
    "Y_h",
    "Y_h",
    "Head output Y h",
  ),
  "attention-scale-factor": inlineFormula(
    "attention-scale-factor",
    "\\frac{1}{\\sqrt D}",
    "1 / sqrt(D)",
    "One divided by square root of head dimension D",
  ),
  "attention-mask-keep": inlineFormula(
    "attention-mask-keep",
    "j \\le i",
    "j <= i",
    "Key index j is less than or equal to query index i",
  ),
  "attention-mask-block": inlineFormula(
    "attention-mask-block",
    "j > i",
    "j > i",
    "Key index j is greater than query index i",
  ),
};
