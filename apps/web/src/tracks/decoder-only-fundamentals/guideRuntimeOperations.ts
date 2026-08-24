import type { ArchitectureNodeId } from "../../architecture";
import { symbolicShape } from "../../domain/notation";
import { currentAttentionShapes } from "../../domain/shapes";
import { shapeFormula } from "../../math/trustedFormulaBuilders";
import type {
  ArchitectureRenderContext,
  RuntimeFactPresentation,
  SelectedOperationPresentation,
} from "../types";
import { decoderNotationEntries } from "./notation";

const rootOperationIds: readonly ArchitectureNodeId[] = [
  "input-context",
  "token-embedding",
  "position-embedding",
  "final-layer-norm",
  "lm-head",
  "logits",
  "token-selection",
  "generated-token",
  "append-context",
];

const blockOperationIds: readonly ArchitectureNodeId[] = [
  "layer-norm-1",
  "residual-1",
  "layer-norm-2",
  "mlp",
  "residual-2",
];

const attentionOperationIds: readonly ArchitectureNodeId[] = [
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

function selectedOperationId(
  context: ArchitectureRenderContext,
): ArchitectureNodeId | null {
  const selectedNodeId = context.state.selectedNodeId;
  if (selectedNodeId === null) return null;
  switch (context.state.view) {
    case "root":
      return rootOperationIds.includes(selectedNodeId) ? selectedNodeId : null;
    case "transformer-block":
      return blockOperationIds.includes(selectedNodeId) ? selectedNodeId : null;
    case "self-attention":
      return attentionOperationIds.includes(selectedNodeId)
        ? selectedNodeId
        : null;
  }
}

function currentShapeFact(
  context: ArchitectureRenderContext,
  operationId: ArchitectureNodeId,
): RuntimeFactPresentation {
  if (!attentionOperationIds.includes(operationId)) {
    return {
      id: "decoder.operation.current-shape",
      label: "Current shape",
      value: "실행 후 표시",
      status: "pending",
    };
  }
  const config = context.model.config;
  const shapes = currentAttentionShapes(
    { modelWidth: config.n_embd, headCount: config.n_head },
    context.replaySequenceLength,
  );
  const currentShape = shapes?.currentShape(operationId) ?? null;
  return currentShape === null
    ? {
        id: "decoder.operation.current-shape",
        label: "Current shape",
        value: "실행 후 표시",
        status: "pending",
      }
    : {
        id: "decoder.operation.current-shape",
        label: "Current shape",
        value: shapeFormula(
          "attention-current-shape",
          currentShape,
          "Selected operation current shape",
        ).plainText,
        status: "ready",
        detail: "Derived shape only; tensor values are unavailable.",
      };
}

export function resolveSelectedOperation(
  context: ArchitectureRenderContext,
): SelectedOperationPresentation | null {
  const operationId = selectedOperationId(context);
  if (operationId === null) return null;
  const notation = decoderNotationEntries[operationId];
  return {
    id: `decoder.operation.${operationId}`,
    title: notation.title,
    summary: notation.description,
    formulaIds: [operationId],
    facts: [
      {
        id: "decoder.operation.notation",
        label: "Notation",
        value: notation.plainText,
        status: "ready",
      },
      {
        id: "decoder.operation.symbolic-shape",
        label: "Symbolic shape",
        value: shapeFormula(
          "attention-symbolic-shape",
          symbolicShape(notation),
          `${notation.title} symbolic shape`,
        ).plainText,
        status: "ready",
      },
      currentShapeFact(context, operationId),
    ],
  };
}
