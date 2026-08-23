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
  if (request.type !== "run") return state;
  return {
    ...state,
    status: { type: "running", detail: "Running prompt" },
    pendingRunRequestId: request.request_id,
  };
}

export function registerGenerationRequest(state: WorkerState): WorkerState {
  return {
    ...state,
    status: { type: "running", detail: "Starting generation" },
  };
}

export function registerReplayRequest(state: WorkerState): WorkerState {
  return {
    ...state,
    status: { type: "running", detail: "Loading generation step" },
  };
}

export function rejectWorkerPayload(
  state: WorkerState,
  message = "Worker returned an invalid response",
): WorkerState {
  return { ...state, status: { type: "error", message } };
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
      return { ...state, status: { type: "complete" } };
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
