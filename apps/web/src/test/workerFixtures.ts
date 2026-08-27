import type {
  AttentionHeadTrace,
  GenerationConfig,
  GenerationStepSummary,
  ModelMetadata,
  RunSummary,
  TensorSnapshot,
  TokenInfo,
  WorkerRequest,
} from "../generated/schema";
import type {
  WorkerTransport,
  WorkerTransportEventMap,
  WorkerTransportListener,
} from "../worker/WorkerClient";

export class TestWorker implements WorkerTransport {
  readonly posted: WorkerRequest[] = [];
  readonly listeners = new Set<(event: MessageEvent<unknown>) => void>();
  readonly errorListeners = new Set<(event: Event) => void>();
  terminations = 0;

  postMessage(message: WorkerRequest): void {
    this.posted.push(message);
  }
  addEventListener<Type extends keyof WorkerTransportEventMap>(
    type: Type,
    listener: WorkerTransportListener<Type>,
  ): void {
    if (type === "message")
      this.listeners.add(listener as WorkerTransportListener<"message">);
    else this.errorListeners.add(listener as WorkerTransportListener<"error">);
  }
  removeEventListener<Type extends keyof WorkerTransportEventMap>(
    type: Type,
    listener: WorkerTransportListener<Type>,
  ): void {
    if (type === "message")
      this.listeners.delete(listener as WorkerTransportListener<"message">);
    else
      this.errorListeners.delete(listener as WorkerTransportListener<"error">);
  }
  terminate(): void {
    this.terminations += 1;
  }
  emit(data: unknown): void {
    for (const listener of this.listeners)
      listener(new MessageEvent("message", { data }));
  }
  emitError(message = ""): void {
    for (const listener of this.errorListeners)
      listener(
        message ? new ErrorEvent("error", { message }) : new Event("error"),
      );
  }
}

export const generationConfig: GenerationConfig = {
  max_new_tokens: 24,
  temperature: 1,
  top_k: 20,
  mode: "sample",
  seed: 42,
};

export const model: ModelMetadata = {
  model_id: "nanogpt-edu",
  name: "Education GPT",
  corpus: "test corpus",
  nanogpt_commit: "abc123",
  parameter_count: 1000,
  architecture: {
    architecture_id: "nanogpt-decoder-v1",
    family: "decoder_only",
    normalization: "layer_norm",
    norm_placement: "pre_norm",
    position_encoding: "learned_absolute",
    attention: {
      self_attention: "causal_multi_head",
      cross_attention: false,
    },
    feed_forward: { kind: "gelu_mlp" },
    generation: {
      kind: "autoregressive",
      kv_cache: false,
    },
    lm_head: {
      tied_token_embedding: true,
      bias: false,
    },
    dropout: 0,
  },
  config: {
    block_size: 32,
    vocab_size: 64,
    n_layer: 3,
    n_head: 4,
    n_embd: 16,
    bias: true,
    dropout: 0,
  },
};

export function token(id: number, display: string): TokenInfo {
  return {
    id,
    display,
    piece: [...new TextEncoder().encode(display)],
    byte_start: 0,
    byte_end: 1,
    kind: "byte",
  };
}

export function generationStep(
  index: number,
  display = "!",
): GenerationStepSummary {
  return {
    index,
    context_token_ids: [1],
    generated_token: token(index + 2, display),
    selected_logit: 2,
    selected_probability: 0.75,
    candidates: [],
    random: null,
    selected_interval: null,
    forward_ms: 1,
    sampling_ms: 0.5,
    total_ms: 1.5,
  };
}

const stats = { min: 0, max: 0, mean: 0, std: 0, l2_norm: 0 };
const source = {
  file: "model.py",
  symbol: "model",
  start_line: 1,
  end_line: 1,
};

function tensor(id: string, shape: number[] = [1]): TensorSnapshot {
  return { id, label: id, shape, values: [0], stats };
}

export function runSummary(runId: number, sequenceLength = 2): RunSummary {
  return {
    schema_version: "1.1.0",
    run_id: runId,
    tokens: Array.from({ length: sequenceLength }, (_, index) =>
      token(index + 1, String(index)),
    ),
    layers: [],
    duration_ms: 1,
    embeddings: {
      token: tensor("token"),
      position: tensor("position"),
      sum: tensor("sum"),
      source,
    },
    final_layer_norm: tensor("final"),
    logits: { logits: tensor("logits"), top_k: [], source },
  };
}

export function attentionHeadTrace(
  layer = 0,
  head = 0,
  sequenceLength = 2,
): AttentionHeadTrace {
  const matrixSize = sequenceLength * sequenceLength;
  const values = Array.from(
    { length: matrixSize },
    (_, index) => (index - Math.floor(matrixSize / 2)) / 10,
  );
  return {
    layer,
    head,
    query: tensor("query"),
    key: tensor("key"),
    value: tensor("value"),
    raw_scores: {
      id: "raw_scores",
      label: "Raw attention scores",
      shape: [1, 1, sequenceLength, sequenceLength],
      values,
      stats,
    },
    scaled_scores: tensor("scaled_scores"),
    mask: {
      rows: sequenceLength,
      cols: sequenceLength,
      allowed: Array.from(
        { length: matrixSize },
        (_, index) =>
          index % sequenceLength <= Math.floor(index / sequenceLength),
      ),
    },
    probabilities: tensor("probabilities"),
    output: tensor("output"),
    source,
  };
}
