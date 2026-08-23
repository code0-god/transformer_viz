import type {
  GenerationConfig,
  GenerationStepSummary,
  ModelMetadata,
  RunSummary,
  TensorSnapshot,
  TokenInfo,
  WorkerRequest,
} from "../generated/schema";
import type { WorkerTransport } from "../worker/WorkerClient";

export class TestWorker implements WorkerTransport {
  readonly posted: WorkerRequest[] = [];
  readonly listeners = new Set<(event: MessageEvent<unknown>) => void>();
  terminations = 0;

  postMessage(message: WorkerRequest): void {
    this.posted.push(message);
  }
  addEventListener(
    _type: "message",
    listener: (event: MessageEvent<unknown>) => void,
  ): void {
    this.listeners.add(listener);
  }
  removeEventListener(
    _type: "message",
    listener: (event: MessageEvent<unknown>) => void,
  ): void {
    this.listeners.delete(listener);
  }
  terminate(): void {
    this.terminations += 1;
  }
  emit(data: unknown): void {
    for (const listener of this.listeners)
      listener(new MessageEvent("message", { data }));
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
  name: "Education GPT",
  corpus: "test corpus",
  nanogpt_commit: "abc123",
  parameter_count: 1000,
  config: {
    block_size: 32,
    vocab_size: 64,
    n_layer: 3,
    n_head: 4,
    n_embd: 16,
    bias: true,
  },
};

export function token(id: number, display: string): TokenInfo {
  return {
    id,
    display,
    piece: [id],
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
