import type { GenerationConfig, WorkerRequest } from "../generated/schema";
import {
  WorkerClient,
  type WorkerTransport,
  type WorkerTransportEventMap,
  type WorkerTransportListener,
} from "./WorkerClient";

class FakeWorker implements WorkerTransport {
  readonly posted: WorkerRequest[] = [];
  readonly listeners = new Set<(event: MessageEvent<unknown>) => void>();
  readonly errorListeners = new Set<(event: Event) => void>();
  terminations = 0;
  postMessage(message: WorkerRequest): void {
    this.posted.push(message);
  }
  addEventListener<Type extends keyof WorkerTransportEventMap>(
    type: Type,
    listener: WorkerTransportListener<Type>,
  ): void {
    if (type === "message")
      this.listeners.add(listener as WorkerTransportListener<"message">);
    else this.errorListeners.add(listener as WorkerTransportListener<"error">);
  }
  removeEventListener<Type extends keyof WorkerTransportEventMap>(
    type: Type,
    listener: WorkerTransportListener<Type>,
  ): void {
    if (type === "message")
      this.listeners.delete(listener as WorkerTransportListener<"message">);
    else
      this.errorListeners.delete(listener as WorkerTransportListener<"error">);
  }
  terminate(): void {
    this.terminations += 1;
  }
  emit(data: unknown): void {
    for (const listener of this.listeners)
      listener(new MessageEvent("message", { data }));
  }
  emitError(message = ""): void {
    for (const listener of this.errorListeners)
      listener(
        message ? new ErrorEvent("error", { message }) : new Event("error"),
      );
  }
}

const config: GenerationConfig = {
  max_new_tokens: 3,
  temperature: 1,
  top_k: 10,
  mode: "sample",
  seed: 7,
};

describe("WorkerClient", () => {
  test("serializes initialize and allocated requests", () => {
    const worker = new FakeWorker();
    const client = new WorkerClient(worker);
    client.initialize("./models/edu/manifest.json");
    expect(client.run("cat")).toBe(0);
    expect(client.generate("dog", config)).toBe(1);
    expect(worker.posted).toEqual([
      { type: "initialize", manifest_url: "./models/edu/manifest.json" },
      { type: "run", request_id: 0, text: "cat" },
      { type: "generate", request_id: 1, text: "dog", config },
    ]);
  });

  test("rejects malformed data without delivering it", () => {
    const worker = new FakeWorker();
    const responses = vi.fn();
    const rejected = vi.fn();
    const client = new WorkerClient(worker, {
      onResponse: responses,
      onRejected: rejected,
    });
    worker.emit({ type: "ready" });
    expect(rejected).toHaveBeenCalledOnce();
    expect(responses).not.toHaveBeenCalled();
    client.dispose();
  });

  test("reports a module Worker script-load error", () => {
    const worker = new FakeWorker();
    const onError = vi.fn();
    const client = new WorkerClient(worker, { onError });
    worker.emitError();
    expect(onError).toHaveBeenCalledOnce();
    expect(onError.mock.calls[0]?.[0]).toEqual(
      new Error("Model Worker failed to load"),
    );
    client.dispose();
  });

  test("reports valid responses for unknown request IDs as stale", () => {
    const worker = new FakeWorker();
    const responses = vi.fn();
    const stale = vi.fn();
    const client = new WorkerClient(worker, {
      onResponse: responses,
      onStaleResponse: stale,
    });
    worker.emit({
      type: "error",
      request_id: 99,
      code: "cancelled",
      message: "late",
    });
    expect(stale).toHaveBeenCalledOnce();
    expect(responses).not.toHaveBeenCalled();
    client.dispose();
  });

  test("posts stop and cancel through typed methods", () => {
    const worker = new FakeWorker();
    const client = new WorkerClient(worker);
    const requestId = client.generate("cat", config);
    client.stopGeneration(requestId, 12);
    client.cancel(requestId);
    expect(worker.posted.slice(1)).toEqual([
      { type: "stop_generation", request_id: 0, run_id: 12 },
      { type: "cancel", request_id: 0 },
    ]);
  });

  test("removes its listener and terminates deterministically", () => {
    const worker = new FakeWorker();
    const client = new WorkerClient(worker);
    client.dispose();
    client.dispose();
    expect(worker.listeners.size).toBe(0);
    expect(worker.terminations).toBe(1);
  });

  test("fails closed after the last safe request ID", () => {
    const worker = new FakeWorker();
    const client = new WorkerClient(worker, {
      initialRequestId: Number.MAX_SAFE_INTEGER,
    });
    expect(client.run("last")).toBe(Number.MAX_SAFE_INTEGER);
    expect(() => client.run("unsafe")).toThrow("safe integer");
    expect(worker.posted).toHaveLength(1);
  });
});
