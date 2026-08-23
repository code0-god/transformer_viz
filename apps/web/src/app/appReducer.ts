import type {
  GenerationConfig,
  GenerationStepSummary,
  WorkerRequest,
  WorkerResponse,
} from "../generated/schema";
import {
  beginGeneration,
  createGenerationState,
  type GenerationResult,
  type GenerationState,
  inspectGenerationStep,
  safeId,
  stopGeneration,
} from "./generationState";
import {
  createWorkerState,
  reduceWorkerResponse,
  registerWorkerRequest,
  type WorkerState,
} from "./workerState";

export type AppState = Readonly<{
  worker: WorkerState;
  generation: GenerationState;
  nextRequestId: number;
}>;
export type AppAction =
  | Readonly<{ type: "generate"; prompt: string; config: GenerationConfig }>
  | Readonly<{ type: "stop" }>
  | Readonly<{ type: "select_generation_step"; stepIndex: number }>
  | Readonly<{ type: "request"; request: Readonly<WorkerRequest> }>
  | Readonly<{ type: "response"; response: WorkerResponse }>;
export type AppResult = Readonly<{
  state: AppState;
  requests: ReadonlyArray<Readonly<WorkerRequest>>;
}>;

export function createAppState(): AppState {
  return {
    worker: createWorkerState(),
    generation: createGenerationState(),
    nextRequestId: 1,
  };
}

function withRequests(
  state: AppState,
  requests: ReadonlyArray<Readonly<WorkerRequest>>,
): AppResult {
  return {
    state: {
      ...state,
      worker: requests.reduce(registerWorkerRequest, state.worker),
    },
    requests,
  };
}

function exactActive(state: GenerationState, requestId: number, runId: number) {
  return (
    state.active?.requestId.value === requestId &&
    state.active.runId.value === runId
  );
}

function sameStep(
  left: Readonly<GenerationStepSummary>,
  right: GenerationStepSummary,
) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function generationError(
  state: GenerationState,
  requestId: number | null,
  message: string,
): GenerationResult {
  if (requestId === null) return { state, requests: [] };
  if (state.pending?.requestId.value === requestId) {
    const next: GenerationState =
      state.phase === "running" && state.active !== null
        ? { ...state, pending: null, error: message }
        : { ...createGenerationState(), phase: "error", error: message };
    return { state: next, requests: [] };
  }
  if (state.active?.requestId.value === requestId)
    return {
      state: { ...state, phase: "error", error: message, stopReason: "error" },
      requests: [],
    };
  if (state.pendingReplay?.requestId.value === requestId)
    return {
      state: { ...state, pendingReplay: null, error: message },
      requests: [],
    };
  return { state, requests: [] };
}

export function reduceGenerationResponse(
  state: GenerationState,
  response: WorkerResponse,
): GenerationResult {
  const unchanged = (): GenerationResult => ({ state, requests: [] });
  switch (response.type) {
    case "generation_started": {
      const requestId = safeId(response.request_id);
      const runId = safeId(response.run_id);
      if (
        requestId === null ||
        runId === null ||
        state.pending?.requestId.value !== requestId.value
      )
        return unchanged();
      return {
        state: {
          ...createGenerationState(),
          phase: "running",
          active: { requestId, runId },
          promptText: state.pending.prompt,
          promptTokens: response.prompt_tokens,
          config: response.config,
          contextLimit: response.context_limit,
        },
        requests: [],
      };
    }
    case "token_generated":
      if (
        state.phase !== "running" ||
        !exactActive(state, response.request_id, response.run_id) ||
        response.step.index !== state.steps.length
      )
        return unchanged();
      return {
        state: { ...state, steps: [...state.steps, response.step] },
        requests: [
          {
            type: "continue_generation",
            request_id: response.request_id,
            run_id: response.run_id,
            step_index: response.step.index,
          },
        ],
      };
    case "generation_finished":
      return state.phase === "running" &&
        exactActive(state, response.request_id, response.run_id)
        ? {
            state: { ...state, phase: "complete", stopReason: response.reason },
            requests: [],
          }
        : unchanged();
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
        return unchanged();
      return {
        state: {
          ...state,
          pendingReplay: null,
          selectedStep: response.step_index,
          replaySummary: response.summary,
          error: null,
        },
        requests: [],
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
      return unchanged();
  }
}

export function appReducer(state: AppState, action: AppAction): AppResult {
  switch (action.type) {
    case "generate": {
      const result = beginGeneration(
        state.generation,
        state.nextRequestId,
        action.prompt,
        action.config,
      );
      return withRequests(
        {
          ...state,
          generation: result.state,
          nextRequestId: state.nextRequestId + 1,
        },
        result.requests,
      );
    }
    case "stop": {
      const request = stopGeneration(state.generation);
      return request === null
        ? { state, requests: [] }
        : withRequests(state, [request]);
    }
    case "select_generation_step": {
      const result = inspectGenerationStep(
        state.generation,
        state.nextRequestId,
        action.stepIndex,
      );
      const nextRequestId =
        result.requests.length === 0
          ? state.nextRequestId
          : state.nextRequestId + 1;
      return withRequests(
        { ...state, generation: result.state, nextRequestId },
        result.requests,
      );
    }
    case "request":
      return withRequests(state, [action.request]);
    case "response": {
      const generation = reduceGenerationResponse(
        state.generation,
        action.response,
      );
      const worker = reduceWorkerResponse(state.worker, action.response);
      return withRequests(
        { ...state, generation: generation.state, worker },
        generation.requests,
      );
    }
  }
}
