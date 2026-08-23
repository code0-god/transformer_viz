import type { WorkerResponse } from "../generated/schema";
import {
  field,
  isArray,
  isNullableId,
  isOneOf,
  isRecord,
  isSafeId,
  isString,
} from "./protocolPrimitives";
import {
  hasMatchingRun,
  isAttention,
  isBlock,
  isSummary,
  isTokenTrace,
} from "./protocolTraceGuards";
import {
  isGenerationConfig,
  isModel,
  isStep,
  isToken,
} from "./protocolValueGuards";

const responseTypes = new Set([
  "initializing",
  "ready",
  "generation_started",
  "token_generated",
  "generation_finished",
  "generation_step_trace",
  "run_complete",
  "block_trace",
  "attention_head_trace",
  "token_trace",
  "error",
]);
const stopReasons = new Set([
  "max_new_tokens",
  "end_of_sequence",
  "context_limit",
  "user_stopped",
  "replaced",
  "error",
]);
const errorCodes = new Set([
  "unsupported_version",
  "invalid_request",
  "not_initialized",
  "asset_unavailable",
  "checksum_mismatch",
  "tokenization",
  "inference",
  "cancelled",
]);

export function isWorkerResponse(value: unknown): value is WorkerResponse {
  if (!isRecord(value) || !isOneOf(field(value, "type"), responseTypes))
    return false;
  switch (field(value, "type")) {
    case "initializing":
      return isString(field(value, "phase"));
    case "ready":
      return isModel(field(value, "model"));
    case "generation_started":
      return (
        isSafeId(field(value, "request_id")) &&
        isSafeId(field(value, "run_id")) &&
        isArray(field(value, "prompt_tokens"), isToken) &&
        isGenerationConfig(field(value, "config")) &&
        isSafeId(field(value, "context_limit"))
      );
    case "token_generated":
      return (
        isSafeId(field(value, "request_id")) &&
        isSafeId(field(value, "run_id")) &&
        isStep(field(value, "step"))
      );
    case "generation_finished":
      return (
        isSafeId(field(value, "request_id")) &&
        isSafeId(field(value, "run_id")) &&
        isOneOf(field(value, "reason"), stopReasons)
      );
    case "generation_step_trace":
      return (
        isSafeId(field(value, "request_id")) &&
        isSafeId(field(value, "generation_run_id")) &&
        isSafeId(field(value, "step_index")) &&
        isStep(field(value, "step")) &&
        isSummary(field(value, "summary"))
      );
    case "run_complete":
      return (
        isSafeId(field(value, "request_id")) &&
        isSummary(field(value, "summary"))
      );
    case "block_trace":
      return (
        isSafeId(field(value, "request_id")) &&
        isSafeId(field(value, "run_id")) &&
        hasMatchingRun(field(value, "trace"), field(value, "run_id"), isBlock)
      );
    case "attention_head_trace":
      return (
        isSafeId(field(value, "request_id")) &&
        isSafeId(field(value, "run_id")) &&
        isAttention(field(value, "trace"))
      );
    case "token_trace":
      return (
        isSafeId(field(value, "request_id")) &&
        isSafeId(field(value, "run_id")) &&
        hasMatchingRun(
          field(value, "trace"),
          field(value, "run_id"),
          isTokenTrace,
        )
      );
    case "error":
      return (
        isNullableId(field(value, "request_id")) &&
        isOneOf(field(value, "code"), errorCodes) &&
        isString(field(value, "message"))
      );
  }
  return false;
}
