import type {
  GenerationStepSummary,
  TokenInfo,
  WorkerResponse,
} from "../generated/schema";
import { reduceGenerationResponse } from "./appReducer";
import {
  beginGeneration,
  createGenerationState,
  inspectGenerationStep,
  parseGenerationForm,
} from "./generationState";

const token = (id: number, display: string): TokenInfo => ({
  id,
  display,
  piece: [id],
  byte_start: 0,
  byte_end: 1,
  kind: "byte",
});

const step = (index: number): GenerationStepSummary => ({
  index,
  context_token_ids: [1],
  generated_token: token(index + 2, `${index}`),
  selected_logit: 1,
  selected_probability: 0.5,
  candidates: [],
  random: null,
  selected_interval: null,
  forward_ms: 1,
  sampling_ms: 1,
  total_ms: 2,
});

const parsedConfig = parseGenerationForm(
  {
    maxNewTokens: "24",
    temperature: "1.0",
    topK: "20",
    mode: "sample",
    seed: "42",
  },
  { blockSize: 32, vocabSize: 64 },
).config;

function started(requestId: number, runId: number): WorkerResponse {
  return {
    type: "generation_started",
    request_id: requestId,
    run_id: runId,
    prompt_tokens: [token(1, "a")],
    config: parsedConfig,
    context_limit: 32,
  };
}

function runningGeneration() {
  const begun = beginGeneration(createGenerationState(), 7, "a");
  return reduceGenerationResponse(begun, started(7, 40));
}

describe("generation state Rust seam parity", () => {
  test("uses Rust defaults and clamps browser form values", () => {
    const parsed = parseGenerationForm(
      {
        maxNewTokens: "999",
        temperature: "0",
        topK: "0",
        mode: "greedy",
        seed: "18446744073709551615",
      },
      { blockSize: 8, vocabSize: 12 },
    );
    expect(parsed.config).toEqual({
      max_new_tokens: 8,
      temperature: 0.1,
      top_k: 1,
      mode: "greedy",
      seed: Number.MAX_SAFE_INTEGER,
    });
    expect(
      parseGenerationForm(
        {
          maxNewTokens: "bad",
          temperature: "NaN",
          topK: "bad",
          mode: "sample",
          seed: "-1",
        },
        { blockSize: 100, vocabSize: 100 },
      ).config,
    ).toEqual(parsedConfig);
  });

  test("accepts only exact, contiguous stream events", () => {
    const running = runningGeneration();
    const rejected = [
      { request_id: 6, run_id: 40, step: step(0) },
      { request_id: 7, run_id: 41, step: step(0) },
      { request_id: 7, run_id: 40, step: step(1) },
    ].reduce(
      (state, event) =>
        reduceGenerationResponse(state, { type: "token_generated", ...event }),
      running,
    );
    expect(rejected.steps).toHaveLength(0);

    const accepted = reduceGenerationResponse(rejected, {
      type: "token_generated",
      request_id: 7,
      run_id: 40,
      step: step(0),
    });
    expect(accepted.steps).toHaveLength(1);
    const duplicate = reduceGenerationResponse(accepted, {
      type: "token_generated",
      request_id: 7,
      run_id: 40,
      step: step(0),
    });
    expect(duplicate).toBe(accepted);
  });

  test("correlates finish and preserves selected step while streaming", () => {
    const first = reduceGenerationResponse(runningGeneration(), {
      type: "token_generated",
      request_id: 7,
      run_id: 40,
      step: step(0),
    });
    const replay = inspectGenerationStep(first, 8, 0);
    const second = reduceGenerationResponse(replay, {
      type: "token_generated",
      request_id: 7,
      run_id: 40,
      step: step(1),
    });
    expect(second.selectedStep).toBe(0);
    expect(second.steps).toHaveLength(2);

    const staleFinish = reduceGenerationResponse(second, {
      type: "generation_finished",
      request_id: 7,
      run_id: 99,
      reason: "error",
    });
    expect(staleFinish.phase).toBe("running");
    const finished = reduceGenerationResponse(second, {
      type: "generation_finished",
      request_id: 7,
      run_id: 40,
      reason: "max_new_tokens",
    });
    expect(finished.phase).toBe("complete");
    expect(finished.stopReason).toBe("max_new_tokens");
  });

  test("rejects stale correlated errors without clearing replay", () => {
    const streamed = reduceGenerationResponse(runningGeneration(), {
      type: "token_generated",
      request_id: 7,
      run_id: 40,
      step: step(0),
    });
    const replay = inspectGenerationStep(streamed, 8, 0);
    const stale = reduceGenerationResponse(replay, {
      type: "error",
      request_id: 99,
      code: "inference",
      message: "stale",
    });
    expect(stale).toBe(replay);
  });
});
