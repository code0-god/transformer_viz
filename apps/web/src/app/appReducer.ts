import {
  type ArchitectureAction,
  type ArchitectureState,
  architectureReducer,
  initialArchitectureState,
} from "../architecture";
import type {
  GenerationConfig,
  GenerationStepSummary,
  WorkerResponse,
} from "../generated/schema";
import {
  beginScoreMatrixInspection,
  createScoreMatrixInspectionState,
  type ScoreMatrixInspectionState,
} from "../tracks/visualization/scoreMatrixState";
import {
  beginGeneration,
  createGenerationState,
  type GenerationState,
  inspectGenerationStep,
  safeId,
} from "./generationState";
import {
  invalidateScoreMatrixForContext,
  isScoreMatrixRequestError,
  reduceScoreMatrixWorkerResponse,
} from "./scoreMatrixAppReducer";
import {
  createWorkerState,
  reduceWorkerResponse,
  registerGenerationRequest,
  registerReplayRequest,
  rejectWorkerPayload,
  type WorkerState,
} from "./workerState";

export type AppState = Readonly<{
  worker: WorkerState;
  generation: GenerationState;
  architecture: ArchitectureState;
  scoreMatrix: ScoreMatrixInspectionState;
}>;

export type AppAction =
  | Readonly<{
      type: "generation-requested";
      requestId: number;
      prompt: string;
      config: GenerationConfig;
    }>
  | Readonly<{
      type: "replay-requested";
      requestId: number;
      stepIndex: number;
    }>
  | Readonly<{
      type: "score-matrix-requested";
      requestId: number;
      generationRunId: number;
      replayRunId: number;
      layer: number;
      head: number;
    }>
  | Readonly<{ type: "worker-response"; response: WorkerResponse }>
  | Readonly<{ type: "worker-payload-rejected" }>
  | Readonly<{ type: "client-error"; message: string }>
  | Readonly<{ type: "architecture"; action: ArchitectureAction }>;

export function createAppState(): AppState {
  return {
    worker: createWorkerState(),
    generation: createGenerationState(),
    architecture: initialArchitectureState,
    scoreMatrix: createScoreMatrixInspectionState(),
  };
}

function exactActive(
  state: GenerationState,
  requestId: number,
  runId: number,
): boolean {
  return (
    state.active?.requestId.value === requestId &&
    state.active.runId.value === runId
  );
}

function sameStep(
  left: Readonly<GenerationStepSummary>,
  right: GenerationStepSummary,
): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

function generationError(
  state: GenerationState,
  requestId: number | null,
  message: string,
): GenerationState {
  if (requestId === null) return state;
  if (state.pending?.requestId.value === requestId) {
    return state.phase === "running" && state.active !== null
      ? { ...state, pending: null, error: message }
      : { ...createGenerationState(), phase: "error", error: message };
  }
  if (state.active?.requestId.value === requestId) {
    return { ...state, phase: "error", error: message, stopReason: "error" };
  }
  if (state.pendingReplay?.requestId.value === requestId) {
    return { ...state, pendingReplay: null, error: message };
  }
  return state;
}

export function acceptsTokenResponse(
  state: GenerationState,
  response: Extract<WorkerResponse, { type: "token_generated" }>,
): boolean {
  return (
    state.phase === "running" &&
    exactActive(state, response.request_id, response.run_id) &&
    response.step.index === state.steps.length
  );
}

export function reduceGenerationResponse(
  state: GenerationState,
  response: WorkerResponse,
): GenerationState {
  switch (response.type) {
    case "generation_started": {
      const requestId = safeId(response.request_id);
      const runId = safeId(response.run_id);
      if (
        requestId === null ||
        runId === null ||
        state.pending?.requestId.value !== requestId.value
      )
        return state;
      return {
        ...createGenerationState(),
        phase: "running",
        active: { requestId, runId },
        promptText: state.pending.prompt,
        promptTokens: response.prompt_tokens,
        config: response.config,
        contextLimit: response.context_limit,
      };
    }
    case "token_generated":
      return acceptsTokenResponse(state, response)
        ? { ...state, steps: [...state.steps, response.step] }
        : state;
    case "generation_finished":
      return state.phase === "running" &&
        exactActive(state, response.request_id, response.run_id)
        ? { ...state, phase: "complete", stopReason: response.reason }
        : state;
    case "generation_step_trace": {
      const replay = state.pendingReplay;
      const historical = state.steps[response.step_index];
      if (
        replay === null ||
        historical === undefined ||
        replay.requestId.value !== response.request_id ||
        replay.generationRunId.value !== response.generation_run_id ||
        replay.stepIndex !== response.step_index ||
        !sameStep(historical, response.step)
      )
        return state;
      return {
        ...state,
        pendingReplay: null,
        selectedStep: response.step_index,
        replaySummary: response.summary,
        error: null,
      };
    }
    case "error":
      return generationError(state, response.request_id, response.message);
    case "initializing":
    case "ready":
    case "run_complete":
    case "block_trace":
    case "attention_head_trace":
    case "token_trace":
      return state;
  }
}

export function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case "generation-requested":
      return {
        ...state,
        worker: registerGenerationRequest(state.worker),
        generation: beginGeneration(
          state.generation,
          action.requestId,
          action.prompt,
        ),
        scoreMatrix: createScoreMatrixInspectionState(),
      };
    case "replay-requested":
      return {
        ...state,
        worker: registerReplayRequest(state.worker),
        generation: inspectGenerationStep(
          state.generation,
          action.requestId,
          action.stepIndex,
        ),
        scoreMatrix: createScoreMatrixInspectionState(),
      };
    case "score-matrix-requested":
      return {
        ...state,
        scoreMatrix: beginScoreMatrixInspection(state.scoreMatrix, action),
      };
    case "worker-response": {
      const generation = reduceGenerationResponse(
        state.generation,
        action.response,
      );
      const replayChanged =
        generation.replaySummary !== state.generation.replaySummary;
      return {
        ...state,
        worker: isScoreMatrixRequestError(state.scoreMatrix, action.response)
          ? state.worker
          : reduceWorkerResponse(state.worker, action.response),
        generation,
        scoreMatrix: replayChanged
          ? createScoreMatrixInspectionState()
          : reduceScoreMatrixWorkerResponse(
              state.scoreMatrix,
              action.response,
              generation,
            ),
      };
    }
    case "worker-payload-rejected":
      return { ...state, worker: rejectWorkerPayload(state.worker) };
    case "client-error":
      return {
        ...state,
        worker: rejectWorkerPayload(state.worker, action.message),
      };
    case "architecture": {
      const architecture = architectureReducer(
        state.architecture,
        action.action,
      );
      return {
        ...state,
        architecture,
        scoreMatrix: invalidateScoreMatrixForContext(
          state.scoreMatrix,
          state.generation,
          architecture,
        ),
      };
    }
  }
}
