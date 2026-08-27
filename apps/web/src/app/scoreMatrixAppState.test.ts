import type { AttentionHeadTrace, TensorSnapshot } from "../generated/schema";
import {
  generationConfig,
  generationStep,
  runSummary,
  token,
} from "../test/workerFixtures";
import { appReducer, createAppState } from "./appReducer";

const stats = { min: 0, max: 15, mean: 7.5, std: 1, l2_norm: 10 };
const source = {
  file: "model.py",
  symbol: "CausalSelfAttention.forward",
  start_line: 1,
  end_line: 1,
};

function tensor(
  id: string,
  shape: number[] = [1],
  values: number[] = [0],
): TensorSnapshot {
  return { id, label: id, shape, values, stats };
}

function attentionTrace(): AttentionHeadTrace {
  const rawValues = [4, 5, 6, 7];
  return {
    layer: 0,
    head: 1,
    query: tensor("query"),
    key: tensor("key"),
    value: tensor("value"),
    raw_scores: tensor("raw_scores", [1, 1, 2, 2], rawValues),
    scaled_scores: tensor("scaled_scores"),
    mask: { rows: 2, cols: 2, allowed: [true, false, true, true] },
    probabilities: tensor("probabilities"),
    output: tensor("output"),
    source,
  };
}

function replayedState() {
  const step = generationStep(0);
  let state = appReducer(createAppState(), {
    type: "generation-requested",
    requestId: 1,
    prompt: "the cat",
    config: generationConfig,
  });
  state = appReducer(state, {
    type: "worker-response",
    response: {
      type: "generation_started",
      request_id: 1,
      run_id: 7,
      prompt_tokens: [token(1, "the"), token(2, "cat")],
      config: generationConfig,
      context_limit: 32,
    },
  });
  state = appReducer(state, {
    type: "worker-response",
    response: {
      type: "token_generated",
      request_id: 1,
      run_id: 7,
      step,
    },
  });
  state = appReducer(state, {
    type: "replay-requested",
    requestId: 2,
    stepIndex: 0,
  });
  return appReducer(state, {
    type: "worker-response",
    response: {
      type: "generation_step_trace",
      request_id: 2,
      generation_run_id: 7,
      step_index: 0,
      step,
      summary: runSummary(20, 2),
    },
  });
}

describe("App Score Matrix inspection state", () => {
  test("accepts only correlated actual attention trace values", () => {
    const replayed = replayedState();
    const loading = appReducer(replayed, {
      type: "score-matrix-requested",
      requestId: 3,
      generationRunId: 7,
      replayRunId: 20,
      layer: 0,
      head: 1,
    });

    expect(loading.scoreMatrix.status).toBe("loading");

    const ready = appReducer(loading, {
      type: "worker-response",
      response: {
        type: "attention_head_trace",
        request_id: 3,
        run_id: 20,
        trace: attentionTrace(),
      },
    });

    expect(ready.scoreMatrix).toMatchObject({
      status: "ready",
      model: { layer: 0, head: 1, size: 2 },
    });
    if (ready.scoreMatrix.status !== "ready")
      throw new Error("Expected ready Score Matrix");
    expect(ready.scoreMatrix.model.cells.map(({ value }) => value)).toEqual([
      4, 5, 6, 7,
    ]);
  });

  test("invalidates loaded evidence when selected head changes", () => {
    const loading = appReducer(replayedState(), {
      type: "score-matrix-requested",
      requestId: 3,
      generationRunId: 7,
      replayRunId: 20,
      layer: 0,
      head: 1,
    });
    const ready = appReducer(loading, {
      type: "worker-response",
      response: {
        type: "attention_head_trace",
        request_id: 3,
        run_id: 20,
        trace: attentionTrace(),
      },
    });

    const changed = appReducer(ready, {
      type: "architecture",
      action: { type: "select-head", head: 2, headCount: 4 },
    });

    expect(changed.scoreMatrix).toEqual({ status: "idle" });
  });
});
