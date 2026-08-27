import type { ScoreMatrixModel } from "./scoreMatrixModel";

export type ScoreMatrixContext = {
  readonly generationRunId: number;
  readonly replayRunId: number;
  readonly layer: number;
  readonly head: number;
};

export type ScoreMatrixProvenance = {
  readonly requestId: number;
  readonly generationRunId: number;
  readonly runId: number;
  readonly layer: number;
  readonly head: number;
};

export type ScoreMatrixInspectionState =
  | { readonly status: "idle" }
  | {
      readonly status: "loading";
      readonly provenance: ScoreMatrixProvenance;
    }
  | {
      readonly status: "ready";
      readonly provenance: ScoreMatrixProvenance;
      readonly model: ScoreMatrixModel;
    }
  | {
      readonly status: "error";
      readonly provenance: ScoreMatrixProvenance;
      readonly message: string;
    };

export type ScoreMatrixInspectionRequest = ScoreMatrixContext & {
  readonly requestId: number;
};

export type ScoreMatrixInspectionResponse =
  | {
      readonly type: "succeeded";
      readonly requestId: number;
      readonly runId: number;
      readonly layer: number;
      readonly head: number;
      readonly model: ScoreMatrixModel;
    }
  | {
      readonly type: "failed";
      readonly requestId: number;
      readonly runId: number;
      readonly layer: number;
      readonly head: number;
      readonly message: string;
    };

export function createScoreMatrixInspectionState(): ScoreMatrixInspectionState {
  return { status: "idle" };
}

function isSafeId(value: number): boolean {
  return Number.isSafeInteger(value) && value >= 0;
}

export function beginScoreMatrixInspection(
  state: ScoreMatrixInspectionState,
  request: ScoreMatrixInspectionRequest,
): ScoreMatrixInspectionState {
  if (
    !isSafeId(request.requestId) ||
    !isSafeId(request.generationRunId) ||
    !isSafeId(request.replayRunId) ||
    !isSafeId(request.layer) ||
    !isSafeId(request.head)
  ) {
    return state;
  }
  return {
    status: "loading",
    provenance: {
      requestId: request.requestId,
      generationRunId: request.generationRunId,
      runId: request.replayRunId,
      layer: request.layer,
      head: request.head,
    },
  };
}

export function reduceScoreMatrixInspectionResponse(
  state: ScoreMatrixInspectionState,
  response: ScoreMatrixInspectionResponse,
): ScoreMatrixInspectionState {
  switch (state.status) {
    case "idle":
    case "ready":
    case "error":
      return state;
    case "loading": {
      const provenance = state.provenance;
      if (
        provenance.requestId !== response.requestId ||
        provenance.runId !== response.runId ||
        provenance.layer !== response.layer ||
        provenance.head !== response.head
      ) {
        return state;
      }
      switch (response.type) {
        case "succeeded":
          return {
            status: "ready",
            provenance,
            model: response.model,
          };
        case "failed":
          return {
            status: "error",
            provenance,
            message: response.message,
          };
      }
    }
  }
}

export function invalidateScoreMatrixInspection(
  state: ScoreMatrixInspectionState,
  context: ScoreMatrixContext,
): ScoreMatrixInspectionState {
  switch (state.status) {
    case "idle":
      return state;
    case "loading":
    case "ready":
    case "error": {
      const provenance = state.provenance;
      return provenance.generationRunId === context.generationRunId &&
        provenance.runId === context.replayRunId &&
        provenance.layer === context.layer &&
        provenance.head === context.head
        ? state
        : createScoreMatrixInspectionState();
    }
  }
}
