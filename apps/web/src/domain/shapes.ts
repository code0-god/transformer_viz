import type { ArchitectureNodeId } from "../architecture/catalog";

export interface AttentionShapeConfig {
  readonly modelWidth: number;
  readonly headCount: number;
}

export interface CurrentAttentionShapes {
  readonly modelWidth: number;
  readonly headCount: number;
  readonly headDimension: number;
  readonly qkvWidth: number;
  readonly sequenceLength: number | null;
  readonly scaleFactor: number;
  readonly headTensor: string | null;
  readonly fullHeadTensor: string | null;
  readonly scoreMatMul: string | null;
  readonly valueMatMul: string | null;
  readonly currentShape: (id: ArchitectureNodeId) => string | null;
}

function tracedShape(
  sequenceLength: number | null,
  make: (length: number) => string,
): string | null {
  return sequenceLength === null ? null : make(sequenceLength);
}

export function currentAttentionShapes(
  config: AttentionShapeConfig,
  traceSequenceLength: number | null = null,
): CurrentAttentionShapes | null {
  const { modelWidth, headCount } = config;
  if (
    modelWidth <= 0 ||
    headCount <= 0 ||
    !Number.isInteger(modelWidth) ||
    !Number.isInteger(headCount)
  )
    return null;
  if (modelWidth % headCount !== 0) return null;
  const headDimension = modelWidth / headCount;
  const sequenceLength =
    traceSequenceLength !== null && traceSequenceLength >= 0
      ? Math.trunc(traceSequenceLength)
      : null;
  const scoreMatMul = tracedShape(
    sequenceLength,
    (t) => `[${t}, ${headDimension}] @ [${headDimension}, ${t}] → [${t}, ${t}]`,
  );
  const valueMatMul = tracedShape(
    sequenceLength,
    (t) => `[${t}, ${t}] @ [${t}, ${headDimension}] → [${t}, ${headDimension}]`,
  );

  function currentShape(id: ArchitectureNodeId): string | null {
    if (sequenceLength === null) return null;
    const t = sequenceLength;
    switch (id) {
      case "attention-qkv-projection":
        return `[${t}, ${modelWidth}] → [${t}, ${modelWidth * 3}]`;
      case "attention-query":
      case "attention-key":
      case "attention-value":
        return `[${t}, ${modelWidth}]`;
      case "attention-scores":
        return scoreMatMul;
      case "attention-scale":
      case "attention-causal-mask":
      case "attention-softmax":
        return `[${t}, ${t}] → [${t}, ${t}]`;
      case "attention-value-aggregation":
        return valueMatMul;
      case "attention-merge-heads":
        return `[${headCount}, ${t}, ${headDimension}] → [${t}, ${modelWidth}]`;
      case "attention-output-projection":
      case "self-attention":
        return `[${t}, ${modelWidth}] → [${t}, ${modelWidth}]`;
      case "root":
      case "input-context":
      case "token-embedding":
      case "position-embedding":
      case "embedding-add":
      case "hidden-state":
      case "transformer-block":
      case "layer-norm-1":
      case "residual-1":
      case "layer-norm-2":
      case "mlp":
      case "residual-2":
      case "final-layer-norm":
      case "lm-head":
      case "logits":
      case "token-selection":
      case "generated-token":
      case "append-context":
        return null;
    }
  }

  return {
    modelWidth,
    headCount,
    headDimension,
    qkvWidth: modelWidth * 3,
    sequenceLength,
    scaleFactor: 1 / Math.sqrt(headDimension),
    headTensor: tracedShape(
      sequenceLength,
      (t) => `[${headCount}, ${t}, ${headDimension}]`,
    ),
    fullHeadTensor: tracedShape(
      sequenceLength,
      (t) => `[1, ${headCount}, ${t}, ${headDimension}]`,
    ),
    scoreMatMul,
    valueMatMul,
    currentShape,
  };
}
