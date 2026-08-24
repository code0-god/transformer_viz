import { model } from "../test/workerFixtures";
import { isWorkerResponse } from "./protocolGuards";

describe("Worker response protocol guard", () => {
  test("accepts a complete known response", () => {
    expect(isWorkerResponse({ type: "ready", model })).toBe(true);
  });

  test.each([
    null,
    [],
    { type: "future_response" },
    { type: "ready" },
    {
      type: "ready",
      model: { ...model, parameter_count: Number.POSITIVE_INFINITY },
    },
    { type: "error", request_id: -1, code: "invalid_request", message: "bad" },
    {
      type: "error",
      request_id: Number.MAX_SAFE_INTEGER + 1,
      code: "invalid_request",
      message: "bad",
    },
  ])("rejects malformed response %#", (value: unknown) => {
    expect(isWorkerResponse(value)).toBe(false);
  });

  test("rejects a nested schema mismatch", () => {
    expect(
      isWorkerResponse({
        type: "run_complete",
        request_id: 1,
        summary: {
          schema_version: "1.0.0",
          run_id: 2,
          tokens: [],
          layers: [],
          duration_ms: 1,
          embeddings: {},
          final_layer_norm: {},
          logits: {},
        },
      }),
    ).toBe(false);
  });

  test("rejects inconsistent envelope and trace run IDs", () => {
    expect(
      isWorkerResponse({
        type: "block_trace",
        request_id: 1,
        run_id: 2,
        trace: {
          schema_version: "1.1.0",
          run_id: 3,
          layer: 0,
          operations: [],
          attention_residual: {},
          mlp: {},
          output: {},
        },
      }),
    ).toBe(false);
  });
});
