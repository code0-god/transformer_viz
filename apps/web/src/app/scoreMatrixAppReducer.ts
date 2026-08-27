import type { ArchitectureState } from "../architecture";
import type { WorkerResponse } from "../generated/schema";
import { buildScoreMatrixModel } from "../tracks/visualization/scoreMatrixModel";
import {
  createScoreMatrixInspectionState,
  invalidateScoreMatrixInspection,
  reduceScoreMatrixInspectionResponse,
  type ScoreMatrixInspectionState,
} from "../tracks/visualization/scoreMatrixState";
import type { GenerationState } from "./generationState";

export function isScoreMatrixRequestError(
  state: ScoreMatrixInspectionState,
  response: WorkerResponse,
): boolean {
  return (
    state.status === "loading" &&
    response.type === "error" &&
    response.request_id === state.provenance.requestId
  );
}

export function reduceScoreMatrixWorkerResponse(
  state: ScoreMatrixInspectionState,
  response: WorkerResponse,
  generation: GenerationState,
): ScoreMatrixInspectionState {
  if (state.status !== "loading") return state;
  const provenance = state.provenance;

  if (
    response.type === "error" &&
    response.request_id === provenance.requestId
  ) {
    return reduceScoreMatrixInspectionResponse(state, {
      type: "failed",
      requestId: provenance.requestId,
      runId: provenance.runId,
      layer: provenance.layer,
      head: provenance.head,
      message: response.message,
    });
  }
  if (response.type !== "attention_head_trace") return state;

  const replay = generation.replaySummary;
  if (replay === null || replay.run_id !== provenance.runId) return state;
  const model = buildScoreMatrixModel({
    trace: response.trace,
    replayTokens: replay.tokens,
    layer: provenance.layer,
    head: provenance.head,
  });
  return reduceScoreMatrixInspectionResponse(
    state,
    model.ok
      ? {
          type: "succeeded",
          requestId: response.request_id,
          runId: response.run_id,
          layer: response.trace.layer,
          head: response.trace.head,
          model: model.value,
        }
      : {
          type: "failed",
          requestId: response.request_id,
          runId: response.run_id,
          layer: response.trace.layer,
          head: response.trace.head,
          message: model.error.message,
        },
  );
}

export function invalidateScoreMatrixForContext(
  state: ScoreMatrixInspectionState,
  generation: GenerationState,
  architecture: ArchitectureState,
): ScoreMatrixInspectionState {
  const active = generation.active;
  const replay = generation.replaySummary;
  if (active === null || replay === null)
    return createScoreMatrixInspectionState();

  return invalidateScoreMatrixInspection(state, {
    generationRunId: active.runId.value,
    replayRunId: replay.run_id,
    layer: architecture.selectedLayer,
    head: architecture.selectedHead,
  });
}
