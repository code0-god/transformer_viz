import type { ScoreMatrixModel } from "./scoreMatrixModel";
import {
  beginScoreMatrixInspection,
  createScoreMatrixInspectionState,
  invalidateScoreMatrixInspection,
  reduceScoreMatrixInspectionResponse,
  type ScoreMatrixContext,
} from "./scoreMatrixState";

const model: ScoreMatrixModel = {
  layer: 2,
  head: 1,
  size: 1,
  queryTokenLabels: ["A"],
  keyTokenLabels: ["A"],
  cells: [
    {
      queryIndex: 0,
      keyIndex: 0,
      queryTokenLabel: "A",
      keyTokenLabel: "A",
      value: 1.25,
      allowed: true,
      blockedByLaterCausalMask: false,
    },
  ],
};

const context: ScoreMatrixContext = {
  generationRunId: 40,
  replayRunId: 70,
  layer: 2,
  head: 1,
};

describe("Score Matrix inspection state", () => {
  test("transitions idle to loading to ready with exact provenance", () => {
    // Given: a replay, layer, and head selected for an inspection request.
    const idle = createScoreMatrixInspectionState();
    const loading = beginScoreMatrixInspection(idle, {
      requestId: 9,
      ...context,
    });

    // When: the exactly correlated response succeeds.
    const ready = reduceScoreMatrixInspectionResponse(loading, {
      type: "succeeded",
      requestId: 9,
      runId: 70,
      layer: 2,
      head: 1,
      model,
    });

    // Then: ready retains only the view model and its provenance.
    expect(ready).toEqual({
      status: "ready",
      provenance: {
        requestId: 9,
        generationRunId: 40,
        runId: 70,
        layer: 2,
        head: 1,
      },
      model,
    });
    expect(ready).not.toHaveProperty("trace");
    expect(ready).not.toHaveProperty("query");
    expect(ready).not.toHaveProperty("key");
    expect(ready).not.toHaveProperty("value");
    expect(ready).not.toHaveProperty("output");
  });

  test.each([
    ["request", { requestId: 10 }],
    ["run", { runId: 71 }],
    ["layer", { layer: 3 }],
    ["head", { head: 0 }],
  ] as const)("ignores a stale %s response", (_name, mismatch) => {
    // Given: one exact inspection is loading.
    const loading = beginScoreMatrixInspection(
      createScoreMatrixInspectionState(),
      { requestId: 9, ...context },
    );
    const response = {
      type: "succeeded" as const,
      requestId: 9,
      runId: 70,
      layer: 2,
      head: 1,
      model,
      ...mismatch,
    };

    // When: one correlation coordinate differs.
    const stale = reduceScoreMatrixInspectionResponse(loading, response);

    // Then: the active loading state is returned unchanged.
    expect(stale).toBe(loading);
  });

  test("stores a correlated failure without discarding provenance", () => {
    // Given: an active inspection request.
    const loading = beginScoreMatrixInspection(
      createScoreMatrixInspectionState(),
      { requestId: 9, ...context },
    );

    // When: its exactly correlated response fails.
    const failed = reduceScoreMatrixInspectionResponse(loading, {
      type: "failed",
      requestId: 9,
      runId: 70,
      layer: 2,
      head: 1,
      message: "invalid score tensor",
    });

    // Then: error is local and carries the same provenance.
    expect(failed).toEqual({
      status: "error",
      provenance: {
        requestId: 9,
        generationRunId: 40,
        runId: 70,
        layer: 2,
        head: 1,
      },
      message: "invalid score tensor",
    });
  });

  test.each([
    ["generation", { generationRunId: 41 }],
    ["replay", { replayRunId: 71 }],
    ["layer", { layer: 3 }],
    ["head", { head: 0 }],
  ] as const)("invalidates ready data after a %s change", (_name, change) => {
    // Given: a ready model for the current generation/replay selection.
    const loading = beginScoreMatrixInspection(
      createScoreMatrixInspectionState(),
      { requestId: 9, ...context },
    );
    const ready = reduceScoreMatrixInspectionResponse(loading, {
      type: "succeeded",
      requestId: 9,
      runId: 70,
      layer: 2,
      head: 1,
      model,
    });

    // When: any provenance-bearing selection changes.
    const invalidated = invalidateScoreMatrixInspection(ready, {
      ...context,
      ...change,
    });

    // Then: stale inspection data returns to idle.
    expect(invalidated).toEqual({ status: "idle" });
  });

  test("preserves state when invalidation context is unchanged", () => {
    // Given: a loading request for the current context.
    const loading = beginScoreMatrixInspection(
      createScoreMatrixInspectionState(),
      { requestId: 9, ...context },
    );

    // When: the context remains exactly the same.
    const unchanged = invalidateScoreMatrixInspection(loading, context);

    // Then: the same state object remains active.
    expect(unchanged).toBe(loading);
  });
});
