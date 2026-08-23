import type { WorkerResponse } from "../generated/schema";
import { generationStep } from "../test/workerFixtures";
import { activeRequestFor, correlateResponse } from "./requestCorrelation";

test("retains generation run correlation until the matching finish", () => {
  const active = activeRequestFor({
    type: "generate",
    request_id: 3,
    text: "the cat",
    config: {
      max_new_tokens: 2,
      temperature: 1,
      top_k: 4,
      mode: "sample",
      seed: 7,
    },
  });
  const started = correlateResponse(active, {
    type: "generation_started",
    request_id: 3,
    run_id: 9,
    prompt_tokens: [],
    config: {
      max_new_tokens: 2,
      temperature: 1,
      top_k: 4,
      mode: "sample",
      seed: 7,
    },
    context_limit: 24,
  });
  expect(started).toMatchObject({ accepted: true, terminal: false });

  const wrongRun: WorkerResponse = {
    type: "token_generated",
    request_id: 3,
    run_id: 10,
    step: generationStep(0),
  };
  expect(correlateResponse(started.active, wrongRun).accepted).toBe(false);

  const finished = correlateResponse(started.active, {
    type: "generation_finished",
    request_id: 3,
    run_id: 9,
    reason: "user_stopped",
  });
  expect(finished).toMatchObject({ accepted: true, terminal: true });
});

test("records inspect selectors with the allocated request", () => {
  expect(
    activeRequestFor({
      type: "inspect_attention_head",
      request_id: 5,
      run_id: 8,
      layer: 1,
      head: 3,
    }),
  ).toEqual({
    kind: "inspect-attention-head",
    runId: 8,
    layer: 1,
    head: 3,
  });
});
