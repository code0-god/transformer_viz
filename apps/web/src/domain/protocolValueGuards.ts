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
const transformerFamilies = new Set(["decoder_only", "encoder_decoder"]);
const normalizationKinds = new Set(["layer_norm", "rms_norm"]);
const normPlacements = new Set(["pre_norm", "post_norm"]);
const positionEncodingKinds = new Set([
  "learned_absolute",
  "sinusoidal",
  "rotary",
]);
const selfAttentionKinds = new Set([
  "causal_multi_head",
  "bidirectional_multi_head",
]);
const feedForwardKinds = new Set(["gelu_mlp", "relu_ffn", "swi_glu"]);
const generationKinds = new Set(["autoregressive"]);

function isProbability(value: unknown): value is number {
  return isFiniteNumber(value) && value >= 0 && value <= 1;
}

function isNonNegativeNumber(value: unknown): value is number {
  return isFiniteNumber(value) && value >= 0;
}

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
  if (!isRecord(value)) return false;
  const shape = field(value, "shape");
  const values = field(value, "values");
  if (
    !Array.isArray(shape) ||
    !shape.every(isSafeId) ||
    !Array.isArray(values) ||
    !values.every(isFiniteNumber)
  ) {
    return false;
  }
  const expectedValues = shape.reduce(
    (product, dimension) => product * dimension,
    1,
  );
  return (
    isString(field(value, "id")) &&
    isString(field(value, "label")) &&
    values.length > 0 &&
    values.length === expectedValues &&
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
    isProbability(field(value, "probability"))
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
  if (!isRecord(value)) return false;
  const temperature = field(value, "temperature");
  const topK = field(value, "top_k");
  return (
    isSafeId(field(value, "max_new_tokens")) &&
    isFiniteNumber(temperature) &&
    temperature > 0 &&
    isSafeId(topK) &&
    topK > 0 &&
    isOneOf(field(value, "mode"), samplingModes) &&
    isSafeId(field(value, "seed"))
  );
}

function isInterval(value: unknown): boolean {
  if (value === null) return true;
  if (!isRecord(value)) return false;
  const start = field(value, "start");
  const end = field(value, "end");
  return isProbability(start) && isProbability(end) && start < end;
}

export function isStep(value: unknown): boolean {
  return (
    isRecord(value) &&
    isSafeId(field(value, "index")) &&
    isArray(field(value, "context_token_ids"), isSafeId) &&
    isToken(field(value, "generated_token")) &&
    isFiniteNumber(field(value, "selected_logit")) &&
    isProbability(field(value, "selected_probability")) &&
    isArray(field(value, "candidates"), isCandidate) &&
    (field(value, "random") === null ||
      isFiniteNumber(field(value, "random"))) &&
    isInterval(field(value, "selected_interval")) &&
    isNonNegativeNumber(field(value, "forward_ms")) &&
    isNonNegativeNumber(field(value, "sampling_ms")) &&
    isNonNegativeNumber(field(value, "total_ms"))
  );
}

function isArchitecture(value: unknown): boolean {
  if (!isRecord(value)) return false;
  const attention = field(value, "attention");
  const feedForward = field(value, "feed_forward");
  const generation = field(value, "generation");
  const lmHead = field(value, "lm_head");
  const dropout = field(value, "dropout");
  return (
    isRecord(attention) &&
    isRecord(feedForward) &&
    isRecord(generation) &&
    isRecord(lmHead) &&
    isString(field(value, "architecture_id")) &&
    isOneOf(field(value, "family"), transformerFamilies) &&
    isOneOf(field(value, "normalization"), normalizationKinds) &&
    isOneOf(field(value, "norm_placement"), normPlacements) &&
    isOneOf(field(value, "position_encoding"), positionEncodingKinds) &&
    isOneOf(field(attention, "self_attention"), selfAttentionKinds) &&
    isBoolean(field(attention, "cross_attention")) &&
    isOneOf(field(feedForward, "kind"), feedForwardKinds) &&
    isOneOf(field(generation, "kind"), generationKinds) &&
    isBoolean(field(generation, "kv_cache")) &&
    isBoolean(field(lmHead, "tied_token_embedding")) &&
    isBoolean(field(lmHead, "bias")) &&
    isFiniteNumber(dropout) &&
    dropout >= 0 &&
    dropout <= 1
  );
}

export function isModel(value: unknown): boolean {
  if (!isRecord(value)) return false;
  const config = field(value, "config");
  if (!isRecord(config)) return false;
  const blockSize = field(config, "block_size");
  const vocabSize = field(config, "vocab_size");
  const layerCount = field(config, "n_layer");
  const headCount = field(config, "n_head");
  const embeddingSize = field(config, "n_embd");
  const dropout = field(config, "dropout");
  return (
    isString(field(value, "model_id")) &&
    isString(field(value, "name")) &&
    isString(field(value, "corpus")) &&
    isString(field(value, "nanogpt_commit")) &&
    isSafeId(field(value, "parameter_count")) &&
    isSafeId(blockSize) &&
    blockSize > 0 &&
    isSafeId(vocabSize) &&
    vocabSize > 0 &&
    isSafeId(layerCount) &&
    layerCount > 0 &&
    isSafeId(headCount) &&
    headCount > 0 &&
    isSafeId(embeddingSize) &&
    embeddingSize > 0 &&
    embeddingSize % headCount === 0 &&
    isBoolean(field(config, "bias")) &&
    isFiniteNumber(dropout) &&
    dropout >= 0 &&
    dropout <= 1 &&
    isArchitecture(field(value, "architecture"))
  );
}
