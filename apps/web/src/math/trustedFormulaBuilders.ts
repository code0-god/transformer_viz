import type { FormulaDefinition, RuntimeFormulaId } from "./formulaCatalog";

const parameterDefinitions = {
  "root-model-width-value": {
    tex: "d_{\\mathrm{model}}",
    plainText: "d_model",
    accessibleLabel: "Model dimension",
  },
  "block-layer-count-value": {
    tex: "n_{\\mathrm{layer}}",
    plainText: "n_layer",
    accessibleLabel: "Model layer count",
  },
} as const;

type IntegerParameterFormulaId = keyof typeof parameterDefinitions;

export function integerParameterFormula(
  id: IntegerParameterFormulaId,
  value: number,
): FormulaDefinition {
  if (!Number.isSafeInteger(value) || value < 0)
    throw new Error(`Invalid trusted integer formula value: ${id}`);
  const definition = parameterDefinitions[id];
  return {
    id,
    tex: `${definition.tex} = ${value}`,
    plainText: `${definition.plainText} = ${value}`,
    accessibleLabel: `${definition.accessibleLabel} ${value}`,
  };
}

const SAFE_SHAPE =
  /^\[[A-Za-z0-9]+(?:,\s*[A-Za-z0-9]+)*\](?:\s*(?:@|→|\+)\s*\[[A-Za-z0-9]+(?:,\s*[A-Za-z0-9]+)*\])*$/;

export function shapeFormula(
  id: Extract<
    RuntimeFormulaId,
    | "attention-symbolic-shape"
    | "attention-current-shape"
    | "attention-head-shape"
    | "attention-full-head-shape"
  >,
  plainText: string,
  accessibleLabel: string,
): FormulaDefinition {
  if (!SAFE_SHAPE.test(plainText))
    throw new Error(`Invalid trusted shape formula: ${plainText}`);
  return {
    id,
    tex: plainText
      .replaceAll(/\s+/g, "")
      .replaceAll("@", "\\mathbin{@}")
      .replaceAll("→", "\\to"),
    plainText,
    accessibleLabel,
  };
}
