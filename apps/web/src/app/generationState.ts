import type {
  GenerationConfig,
  GenerationStepSummary,
  GenerationStopReason,
  RunSummary,
  SamplingMode,
  TokenInfo,
} from "../generated/schema";

export type SafeId = Readonly<{ kind: "safe-id"; value: number }>;
export type GenerationPhase = "idle" | "running" | "complete" | "error";
export type GenerationForm = Readonly<{
  maxNewTokens: string;
  temperature: string;
  topK: string;
  mode: SamplingMode;
  seed: string;
}>;
export type GenerationLimits = Readonly<{
  blockSize: number;
  vocabSize: number;
}>;
type PendingGeneration = Readonly<{ requestId: SafeId; prompt: string }>;
type ActiveGeneration = Readonly<{ requestId: SafeId; runId: SafeId }>;
type ReplayCorrelation = Readonly<{
  requestId: SafeId;
  generationRunId: SafeId;
  stepIndex: number;
}>;
export type GenerationState = Readonly<{
  phase: GenerationPhase;
  pending: PendingGeneration | null;
  active: ActiveGeneration | null;
  pendingReplay: ReplayCorrelation | null;
  promptText: string;
  promptTokens: ReadonlyArray<Readonly<TokenInfo>>;
  config: Readonly<GenerationConfig> | null;
  contextLimit: number;
  steps: ReadonlyArray<Readonly<GenerationStepSummary>>;
  selectedStep: number | null;
  stopReason: GenerationStopReason | null;
  replaySummary: Readonly<RunSummary> | null;
  error: string | null;
}>;
export const defaultGenerationForm: GenerationForm = {
  maxNewTokens: "24",
  temperature: "1.0",
  topK: "20",
  mode: "sample",
  seed: "42",
};

export function safeId(value: number): SafeId | null {
  return Number.isSafeInteger(value) && value >= 0
    ? { kind: "safe-id", value }
    : null;
}

export function createGenerationState(): GenerationState {
  return {
    phase: "idle",
    pending: null,
    active: null,
    pendingReplay: null,
    promptText: "",
    promptTokens: [],
    config: null,
    contextLimit: 0,
    steps: [],
    selectedStep: null,
    stopReason: null,
    replaySummary: null,
    error: null,
  };
}

const U64_MAX = 18_446_744_073_709_551_615n;

function rustInteger(text: string, fallback: number): number {
  if (!/^[0-9]+$/.test(text)) return fallback;
  const parsed = BigInt(text);
  if (parsed > U64_MAX) return fallback;
  return parsed > BigInt(Number.MAX_SAFE_INTEGER)
    ? Number.MAX_SAFE_INTEGER
    : Number(parsed);
}

function finiteNumber(text: string, fallback: number): number {
  const parsed = Number(text);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function parseGenerationForm(
  form: GenerationForm,
  limits: GenerationLimits,
): Readonly<{ config: GenerationConfig; form: GenerationForm }> {
  const maxLimit = Math.max(1, Math.trunc(limits.blockSize));
  const vocabLimit = Math.max(1, Math.trunc(limits.vocabSize));
  const config: GenerationConfig = {
    max_new_tokens: Math.min(
      maxLimit,
      Math.max(1, rustInteger(form.maxNewTokens, 24)),
    ),
    temperature: Math.min(2, Math.max(0.1, finiteNumber(form.temperature, 1))),
    top_k: Math.min(vocabLimit, Math.max(1, rustInteger(form.topK, 20))),
    mode: form.mode,
    seed: Math.min(Number.MAX_SAFE_INTEGER, rustInteger(form.seed, 42)),
  };
  return {
    config,
    form: {
      maxNewTokens: String(config.max_new_tokens),
      temperature: String(config.temperature),
      topK: String(config.top_k),
      mode: config.mode,
      seed: String(config.seed),
    },
  };
}

export function beginGeneration(
  state: GenerationState,
  requestIdValue: number,
  prompt: string,
): GenerationState {
  const requestId = safeId(requestIdValue);
  return requestId === null
    ? state
    : { ...state, pending: { requestId, prompt }, error: null };
}

export function inspectGenerationStep(
  state: GenerationState,
  requestIdValue: number,
  stepIndex: number,
): GenerationState {
  const requestId = safeId(requestIdValue);
  if (
    requestId === null ||
    state.active === null ||
    state.steps[stepIndex] === undefined
  )
    return state;
  return {
    ...state,
    selectedStep: stepIndex,
    pendingReplay: {
      requestId,
      generationRunId: state.active.runId,
      stepIndex,
    },
    replaySummary: null,
    error: null,
  };
}
