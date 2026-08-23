import type { WorkerRequest, WorkerResponse } from "../generated/schema";

export type ActiveRequest =
  | { readonly kind: "run" }
  | { readonly kind: "generate"; readonly runId: number | null }
  | {
      readonly kind: "inspect-generation-step";
      readonly generationRunId: number;
      readonly stepIndex: number;
    }
  | {
      readonly kind: "inspect-block";
      readonly runId: number;
      readonly layer: number;
    }
  | {
      readonly kind: "inspect-attention-head";
      readonly runId: number;
      readonly layer: number;
      readonly head: number;
    }
  | {
      readonly kind: "inspect-token";
      readonly runId: number;
      readonly layer: number;
      readonly head: number;
      readonly token: number;
    };

export interface CorrelationResult {
  readonly accepted: boolean;
  readonly terminal: boolean;
  readonly active: ActiveRequest;
}

export function activeRequestFor(request: WorkerRequest): ActiveRequest {
  switch (request.type) {
    case "run":
      return { kind: "run" };
    case "generate":
      return { kind: "generate", runId: null };
    case "inspect_generation_step":
      return {
        kind: "inspect-generation-step",
        generationRunId: request.generation_run_id,
        stepIndex: request.step_index,
      };
    case "inspect_block":
      return {
        kind: "inspect-block",
        runId: request.run_id,
        layer: request.layer,
      };
    case "inspect_attention_head":
      return {
        kind: "inspect-attention-head",
        runId: request.run_id,
        layer: request.layer,
        head: request.head,
      };
    case "inspect_token":
      return {
        kind: "inspect-token",
        runId: request.run_id,
        layer: request.layer,
        head: request.head,
        token: request.token,
      };
    case "initialize":
    case "continue_generation":
    case "stop_generation":
    case "cancel":
      throw new Error(`${request.type} does not allocate a request ID`);
  }
}

export function correlateResponse(
  active: ActiveRequest,
  response: WorkerResponse,
): CorrelationResult {
  if (response.type === "error")
    return { accepted: true, terminal: true, active };
  if (active.kind === "run")
    return result(active, response.type === "run_complete", true);
  if (active.kind === "generate") return correlateGeneration(active, response);
  if (active.kind === "inspect-generation-step")
    return result(
      active,
      response.type === "generation_step_trace" &&
        response.generation_run_id === active.generationRunId &&
        response.step_index === active.stepIndex,
      true,
    );
  if (active.kind === "inspect-block")
    return result(
      active,
      response.type === "block_trace" &&
        response.run_id === active.runId &&
        response.trace.layer === active.layer,
      true,
    );
  if (active.kind === "inspect-attention-head")
    return result(
      active,
      response.type === "attention_head_trace" &&
        response.run_id === active.runId &&
        response.trace.layer === active.layer &&
        response.trace.head === active.head,
      true,
    );
  return result(
    active,
    response.type === "token_trace" &&
      response.run_id === active.runId &&
      response.trace.layer === active.layer &&
      response.trace.head === active.head &&
      response.trace.token === active.token,
    true,
  );
}

function correlateGeneration(
  active: Extract<ActiveRequest, { readonly kind: "generate" }>,
  response: WorkerResponse,
): CorrelationResult {
  if (response.type === "generation_started" && active.runId === null)
    return {
      accepted: true,
      terminal: false,
      active: { kind: "generate", runId: response.run_id },
    };
  const matchingRun =
    active.runId !== null &&
    (response.type === "token_generated" ||
      response.type === "generation_finished") &&
    response.run_id === active.runId;
  return result(
    active,
    matchingRun,
    matchingRun && response.type === "generation_finished",
  );
}

function result(
  active: ActiveRequest,
  accepted: boolean,
  terminal: boolean,
): CorrelationResult {
  return { accepted, terminal: accepted && terminal, active };
}
