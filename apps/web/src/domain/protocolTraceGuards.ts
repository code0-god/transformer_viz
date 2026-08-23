import {
  field,
  isArray,
  isBoolean,
  isFiniteNumber,
  isOneOf,
  isRecord,
  isSafeId,
} from "./protocolPrimitives";
import {
  isLogits,
  isSnapshot,
  isSource,
  isStats,
  isToken,
} from "./protocolValueGuards";

const operationIds = new Set([
  "embedding",
  "attention_layer_norm",
  "query_key_value",
  "attention",
  "attention_residual",
  "mlp_layer_norm",
  "mlp",
  "mlp_residual",
  "final_layer_norm",
  "logits",
]);

function isLayerSummary(value: unknown): boolean {
  return (
    isRecord(value) &&
    isSafeId(field(value, "layer")) &&
    isStats(field(value, "input")) &&
    isStats(field(value, "attention")) &&
    isStats(field(value, "mlp")) &&
    isStats(field(value, "output"))
  );
}

function isEmbeddings(value: unknown): boolean {
  return (
    isRecord(value) &&
    isSnapshot(field(value, "token")) &&
    isSnapshot(field(value, "position")) &&
    isSnapshot(field(value, "sum")) &&
    isSource(field(value, "source"))
  );
}

export function isSummary(value: unknown): boolean {
  return (
    isRecord(value) &&
    field(value, "schema_version") === "1.1.0" &&
    isSafeId(field(value, "run_id")) &&
    isArray(field(value, "tokens"), isToken) &&
    isArray(field(value, "layers"), isLayerSummary) &&
    isFiniteNumber(field(value, "duration_ms")) &&
    isEmbeddings(field(value, "embeddings")) &&
    isSnapshot(field(value, "final_layer_norm")) &&
    isLogits(field(value, "logits"))
  );
}

function isOperation(value: unknown): boolean {
  return (
    isRecord(value) &&
    isOneOf(field(value, "operation"), operationIds) &&
    isSource(field(value, "source")) &&
    isSnapshot(field(value, "tensor")) &&
    isStats(field(value, "output"))
  );
}

function isMlp(value: unknown): boolean {
  return (
    isRecord(value) &&
    isSafeId(field(value, "layer")) &&
    isSnapshot(field(value, "input")) &&
    isSnapshot(field(value, "hidden")) &&
    isSnapshot(field(value, "activated")) &&
    isSnapshot(field(value, "output")) &&
    isSource(field(value, "source"))
  );
}

export function isBlock(value: unknown): boolean {
  return (
    isRecord(value) &&
    field(value, "schema_version") === "1.1.0" &&
    isSafeId(field(value, "run_id")) &&
    isSafeId(field(value, "layer")) &&
    isArray(field(value, "operations"), isOperation) &&
    isSnapshot(field(value, "attention_residual")) &&
    isMlp(field(value, "mlp")) &&
    isSnapshot(field(value, "output"))
  );
}

function isMask(value: unknown): boolean {
  return (
    isRecord(value) &&
    isSafeId(field(value, "rows")) &&
    isSafeId(field(value, "cols")) &&
    isArray(field(value, "allowed"), isBoolean)
  );
}

export function isAttention(value: unknown): boolean {
  return (
    isRecord(value) &&
    isSafeId(field(value, "layer")) &&
    isSafeId(field(value, "head")) &&
    isSnapshot(field(value, "query")) &&
    isSnapshot(field(value, "key")) &&
    isSnapshot(field(value, "value")) &&
    isSnapshot(field(value, "raw_scores")) &&
    isSnapshot(field(value, "scaled_scores")) &&
    isMask(field(value, "mask")) &&
    isSnapshot(field(value, "probabilities")) &&
    isSnapshot(field(value, "output")) &&
    isSource(field(value, "source"))
  );
}

export function isTokenTrace(value: unknown): boolean {
  return (
    isRecord(value) &&
    field(value, "schema_version") === "1.1.0" &&
    isSafeId(field(value, "run_id")) &&
    isSafeId(field(value, "layer")) &&
    isSafeId(field(value, "head")) &&
    isSafeId(field(value, "token")) &&
    isToken(field(value, "token_info")) &&
    isSnapshot(field(value, "input")) &&
    isSnapshot(field(value, "attention")) &&
    isSnapshot(field(value, "mlp")) &&
    isLogits(field(value, "logits"))
  );
}

export function hasMatchingRun(
  value: unknown,
  runId: unknown,
  validate: (entry: unknown) => boolean,
): boolean {
  return (
    isSafeId(runId) &&
    validate(value) &&
    isRecord(value) &&
    field(value, "run_id") === runId
  );
}
