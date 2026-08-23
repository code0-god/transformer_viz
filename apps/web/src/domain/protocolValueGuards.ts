import {
  field,
  isArray,
  isBoolean,
  isFiniteNumber,
  isNullableId,
  isOneOf,
  isRecord,
  isSafeId,
  isString,
} from "./protocolPrimitives";

const tokenKinds = new Set(["bos", "byte", "eos", "unknown"]);
const samplingModes = new Set(["greedy", "sample"]);

export function isStats(value: unknown): boolean {
  return (
    isRecord(value) &&
    isFiniteNumber(field(value, "min")) &&
    isFiniteNumber(field(value, "max")) &&
    isFiniteNumber(field(value, "mean")) &&
    isFiniteNumber(field(value, "std")) &&
    isFiniteNumber(field(value, "l2_norm"))
  );
}

export function isSource(value: unknown): boolean {
  return (
    isRecord(value) &&
    isString(field(value, "file")) &&
    isString(field(value, "symbol")) &&
    isSafeId(field(value, "start_line")) &&
    isSafeId(field(value, "end_line"))
  );
}

export function isSnapshot(value: unknown): boolean {
  return (
    isRecord(value) &&
    isString(field(value, "id")) &&
    isString(field(value, "label")) &&
    isArray(field(value, "shape"), isSafeId) &&
    isArray(field(value, "values"), isFiniteNumber) &&
    isStats(field(value, "stats"))
  );
}

export function isToken(value: unknown): boolean {
  return (
    isRecord(value) &&
    isSafeId(field(value, "id")) &&
    isString(field(value, "display")) &&
    isArray(field(value, "piece"), isSafeId) &&
    isNullableId(field(value, "byte_start")) &&
    isNullableId(field(value, "byte_end")) &&
    isOneOf(field(value, "kind"), tokenKinds)
  );
}

export function isCandidate(value: unknown): boolean {
  return (
    isRecord(value) &&
    isSafeId(field(value, "token_id")) &&
    isString(field(value, "display")) &&
    isFiniteNumber(field(value, "logit")) &&
    isFiniteNumber(field(value, "probability"))
  );
}

export function isLogits(value: unknown): boolean {
  return (
    isRecord(value) &&
    isSnapshot(field(value, "logits")) &&
    isArray(field(value, "top_k"), isCandidate) &&
    isSource(field(value, "source"))
  );
}

export function isGenerationConfig(value: unknown): boolean {
  return (
    isRecord(value) &&
    isSafeId(field(value, "max_new_tokens")) &&
    isFiniteNumber(field(value, "temperature")) &&
    isSafeId(field(value, "top_k")) &&
    isOneOf(field(value, "mode"), samplingModes) &&
    isSafeId(field(value, "seed"))
  );
}

function isInterval(value: unknown): boolean {
  return (
    value === null ||
    (isRecord(value) &&
      isFiniteNumber(field(value, "start")) &&
      isFiniteNumber(field(value, "end")))
  );
}

export function isStep(value: unknown): boolean {
  return (
    isRecord(value) &&
    isSafeId(field(value, "index")) &&
    isArray(field(value, "context_token_ids"), isSafeId) &&
    isToken(field(value, "generated_token")) &&
    isFiniteNumber(field(value, "selected_logit")) &&
    isFiniteNumber(field(value, "selected_probability")) &&
    isArray(field(value, "candidates"), isCandidate) &&
    (field(value, "random") === null ||
      isFiniteNumber(field(value, "random"))) &&
    isInterval(field(value, "selected_interval")) &&
    isFiniteNumber(field(value, "forward_ms")) &&
    isFiniteNumber(field(value, "sampling_ms")) &&
    isFiniteNumber(field(value, "total_ms"))
  );
}

export function isModel(value: unknown): boolean {
  if (!isRecord(value)) return false;
  const config = field(value, "config");
  if (!isRecord(config)) return false;
  return (
    isString(field(value, "name")) &&
    isString(field(value, "corpus")) &&
    isString(field(value, "nanogpt_commit")) &&
    isSafeId(field(value, "parameter_count")) &&
    isSafeId(field(config, "block_size")) &&
    isSafeId(field(config, "vocab_size")) &&
    isSafeId(field(config, "n_layer")) &&
    isSafeId(field(config, "n_head")) &&
    isSafeId(field(config, "n_embd")) &&
    isBoolean(field(config, "bias"))
  );
}
