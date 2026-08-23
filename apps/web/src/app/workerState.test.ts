import type { RunSummary, TensorSnapshot } from "../generated/schema";
import {
  createWorkerState,
  reduceWorkerResponse,
  registerWorkerRequest,
} from "./workerState";

const stats = { min: 0, max: 0, mean: 0, std: 0, l2_norm: 0 };
const source = {
  file: "model.py",
  symbol: "model",
  start_line: 1,
  end_line: 1,
};

function tensor(id: string): TensorSnapshot {
  return { id, label: id, shape: [1], values: [0], stats };
}

function summary(runId: number): RunSummary {
  return {
    schema_version: "1.1.0",
    run_id: runId,
    tokens: [],
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

describe("worker lifecycle correlation", () => {
  test("rejects stale RunComplete and accepts only the pending request", () => {
    const pending = registerWorkerRequest(createWorkerState(), {
      type: "run",
      request_id: 7,
      text: "a",
    });
    const stale = reduceWorkerResponse(pending, {
      type: "run_complete",
      request_id: 8,
      summary: summary(80),
    });
    expect(stale).toBe(pending);

    const accepted = reduceWorkerResponse(pending, {
      type: "run_complete",
      request_id: 7,
      summary: summary(70),
    });
    expect(accepted.status.type).toBe("complete");
    expect(accepted.runSummary?.run_id).toBe(70);
    expect(accepted.pendingRunRequestId).toBeNull();
  });

  test("promotes correlated and uncorrelated Worker errors globally", () => {
    const correlated = reduceWorkerResponse(createWorkerState(), {
      type: "error",
      request_id: 9,
      code: "inference",
      message: "request failed",
    });
    expect(correlated.status).toEqual({
      type: "error",
      message: "request failed",
    });

    const failed = reduceWorkerResponse(correlated, {
      type: "error",
      request_id: null,
      code: "asset_unavailable",
      message: "model unavailable",
    });
    expect(failed.status).toEqual({
      type: "error",
      message: "model unavailable",
    });
  });
});
