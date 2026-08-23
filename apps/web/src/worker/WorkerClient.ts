import { isWorkerResponse } from "../domain/protocolGuards";
import type {
  GenerationConfig,
  WorkerRequest,
  WorkerResponse,
} from "../generated/schema";

export interface WorkerTransportEventMap {
  readonly error: Event;
  readonly message: MessageEvent<unknown>;
}

export type WorkerTransportListener<
  Type extends keyof WorkerTransportEventMap,
> = (event: WorkerTransportEventMap[Type]) => void;

export interface WorkerTransport {
  postMessage(message: WorkerRequest): void;
  addEventListener<Type extends keyof WorkerTransportEventMap>(
    type: Type,
    listener: WorkerTransportListener<Type>,
  ): void;
  removeEventListener<Type extends keyof WorkerTransportEventMap>(
    type: Type,
    listener: WorkerTransportListener<Type>,
  ): void;
  terminate(): void;
}

export interface WorkerClientOptions {
  initialRequestId?: number;
  onError?: (error: Error) => void;
  onResponse?: (response: WorkerResponse) => void;
  onRejected?: (data: unknown) => void;
  onStaleResponse?: (response: WorkerResponse) => void;
}

export class WorkerClient {
  readonly #worker: WorkerTransport;
  readonly #activeRequestIds = new Set<number>();
  readonly #onError: (error: Error) => void;
  readonly #onResponse: (response: WorkerResponse) => void;
  readonly #onRejected: (data: unknown) => void;
  readonly #onStaleResponse: (response: WorkerResponse) => void;
  readonly #listener: (event: MessageEvent<unknown>) => void;
  readonly #errorListener: (event: Event) => void;
  #nextRequestId: number;
  #initialized = false;
  #disposed = false;

  constructor(worker: WorkerTransport, options: WorkerClientOptions = {}) {
    const initialRequestId = options.initialRequestId ?? 0;
    if (!Number.isSafeInteger(initialRequestId) || initialRequestId < 0) {
      throw new RangeError(
        "Initial Worker request ID must be a nonnegative safe integer",
      );
    }
    this.#worker = worker;
    this.#nextRequestId = initialRequestId;
    this.#onError = options.onError ?? (() => undefined);
    this.#onResponse = options.onResponse ?? (() => undefined);
    this.#onRejected = options.onRejected ?? (() => undefined);
    this.#onStaleResponse = options.onStaleResponse ?? (() => undefined);
    this.#listener = (event: MessageEvent<unknown>) => {
      this.#receive(event.data);
    };
    this.#errorListener = (event: Event) => {
      event.preventDefault();
      const message =
        "message" in event && typeof event.message === "string"
          ? event.message.trim()
          : "";
      this.#onError(new Error(message || "Model Worker failed to load"));
    };
    worker.addEventListener("message", this.#listener);
    worker.addEventListener("error", this.#errorListener);
  }

  initialize(manifestUrl: string): void {
    this.#ensureLive();
    if (this.#initialized) return;
    this.#post({ type: "initialize", manifest_url: manifestUrl });
    this.#initialized = true;
  }

  run(text: string): number {
    return this.#allocated((requestId) => ({
      type: "run",
      request_id: requestId,
      text,
    }));
  }
  generate(text: string, config: GenerationConfig): number {
    return this.#allocated((requestId) => ({
      type: "generate",
      request_id: requestId,
      text,
      config,
    }));
  }
  inspectGenerationStep(generationRunId: number, stepIndex: number): number {
    return this.#allocated((requestId) => ({
      type: "inspect_generation_step",
      request_id: requestId,
      generation_run_id: generationRunId,
      step_index: stepIndex,
    }));
  }
  inspectBlock(runId: number, layer: number): number {
    return this.#allocated((requestId) => ({
      type: "inspect_block",
      request_id: requestId,
      run_id: runId,
      layer,
    }));
  }
  inspectAttentionHead(runId: number, layer: number, head: number): number {
    return this.#allocated((requestId) => ({
      type: "inspect_attention_head",
      request_id: requestId,
      run_id: runId,
      layer,
      head,
    }));
  }
  inspectToken(
    runId: number,
    layer: number,
    head: number,
    token: number,
  ): number {
    return this.#allocated((requestId) => ({
      type: "inspect_token",
      request_id: requestId,
      run_id: runId,
      layer,
      head,
      token,
    }));
  }
  continueGeneration(
    requestId: number,
    runId: number,
    stepIndex: number,
  ): void {
    this.#requireActive(requestId);
    this.#post({
      type: "continue_generation",
      request_id: requestId,
      run_id: runId,
      step_index: stepIndex,
    });
  }
  stopGeneration(requestId: number, runId: number): void {
    this.#requireActive(requestId);
    this.#post({
      type: "stop_generation",
      request_id: requestId,
      run_id: runId,
    });
  }
  cancel(requestId: number): void {
    this.#requireActive(requestId);
    this.#post({ type: "cancel", request_id: requestId });
  }

  dispose(): void {
    if (this.#disposed) return;
    this.#disposed = true;
    this.#activeRequestIds.clear();
    this.#worker.removeEventListener("message", this.#listener);
    this.#worker.removeEventListener("error", this.#errorListener);
    this.#worker.terminate();
  }

  #allocated(create: (requestId: number) => WorkerRequest): number {
    this.#ensureLive();
    const requestId = this.#nextRequestId;
    if (!Number.isSafeInteger(requestId))
      throw new RangeError(
        "Worker request ID exhausted the safe integer range",
      );
    this.#post(create(requestId));
    this.#activeRequestIds.add(requestId);
    this.#nextRequestId =
      requestId === Number.MAX_SAFE_INTEGER
        ? Number.MAX_SAFE_INTEGER + 1
        : requestId + 1;
    return requestId;
  }
  #post(request: WorkerRequest): void {
    this.#worker.postMessage(request);
  }
  #requireActive(requestId: number): void {
    this.#ensureLive();
    if (!this.#activeRequestIds.has(requestId))
      throw new Error(`Worker request ${requestId} is not active`);
  }
  #ensureLive(): void {
    if (this.#disposed) throw new Error("WorkerClient is disposed");
  }
  #receive(data: unknown): void {
    if (!isWorkerResponse(data)) {
      this.#onRejected(data);
      return;
    }
    const requestId =
      data.type === "error"
        ? data.request_id
        : "request_id" in data
          ? data.request_id
          : null;
    if (requestId !== null && !this.#activeRequestIds.has(requestId)) {
      this.#onStaleResponse(data);
      return;
    }
    if (requestId !== null && isTerminal(data))
      this.#activeRequestIds.delete(requestId);
    this.#onResponse(data);
  }
}

function isTerminal(response: WorkerResponse): boolean {
  return (
    response.type === "run_complete" ||
    response.type === "block_trace" ||
    response.type === "attention_head_trace" ||
    response.type === "token_trace" ||
    response.type === "generation_step_trace" ||
    response.type === "generation_finished" ||
    response.type === "error"
  );
}
