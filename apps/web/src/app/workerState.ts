import type {
  ModelMetadata,
  RunSummary,
  WorkerRequest,
  WorkerResponse,
} from "../generated/schema";

export type WorkerStatus =
  | Readonly<{ type: "loading"; phase: string }>
  | Readonly<{ type: "ready" }>
  | Readonly<{ type: "running"; detail: string }>
  | Readonly<{ type: "complete" }>
  | Readonly<{ type: "error"; message: string }>;

export type WorkerState = Readonly<{
  status: WorkerStatus;
  model: Readonly<ModelMetadata> | null;
  pendingRunRequestId: number | null;
  runSummary: Readonly<RunSummary> | null;
}>;

export function createWorkerState(): WorkerState {
  return {
    status: { type: "loading", phase: "Worker starting" },
    model: null,
    pendingRunRequestId: null,
    runSummary: null,
  };
}

export function registerWorkerRequest(
  state: WorkerState,
  request: Readonly<WorkerRequest>,
): WorkerState {
  switch (request.type) {
    case "run":
      return {
        ...state,
        status: { type: "running", detail: "Running prompt" },
        pendingRunRequestId: request.request_id,
      };
    case "generate":
      return {
        ...state,
        status: { type: "running", detail: "Starting generation" },
      };
    case "inspect_generation_step":
      return {
        ...state,
        status: { type: "running", detail: "Loading generation step" },
      };
    case "initialize":
      return { ...state, status: { type: "loading", phase: "Loading model" } };
    case "stop_generation":
    case "continue_generation":
    case "inspect_block":
    case "inspect_attention_head":
    case "inspect_token":
    case "cancel":
      return state;
  }
}

export function reduceWorkerResponse(
  state: WorkerState,
  response: WorkerResponse,
): WorkerState {
  switch (response.type) {
    case "initializing":
      return { ...state, status: { type: "loading", phase: response.phase } };
    case "ready":
      return { ...state, model: response.model, status: { type: "ready" } };
    case "generation_started":
    case "token_generated":
      return {
        ...state,
        status: { type: "running", detail: "Generating tokens" },
      };
    case "generation_finished":
      return { ...state, status: { type: "complete" } };
    case "generation_step_trace":
      return {
        ...state,
        status: { type: "running", detail: "Generation step selected" },
      };
    case "run_complete":
      return state.pendingRunRequestId === response.request_id
        ? {
            ...state,
            status: { type: "complete" },
            pendingRunRequestId: null,
            runSummary: response.summary,
          }
        : state;
    case "error":
      return response.request_id === null
        ? { ...state, status: { type: "error", message: response.message } }
        : state;
    case "block_trace":
    case "attention_head_trace":
    case "token_trace":
      return state;
  }
}
