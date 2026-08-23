import { describe, expect, test, vi } from "vitest";

import { initializeWorkerRuntime } from "./workerBootstrap";

class BootstrapScope {
  onmessage: ((event: MessageEvent<unknown>) => void) | null = null;
  readonly queuedListeners = new Set<(event: MessageEvent<unknown>) => void>();

  addMessageListener(listener: (event: MessageEvent<unknown>) => void): void {
    this.queuedListeners.add(listener);
  }

  removeMessageListener(
    listener: (event: MessageEvent<unknown>) => void,
  ): void {
    this.queuedListeners.delete(listener);
  }

  emit(data: unknown): void {
    const event = new MessageEvent("message", { data });
    for (const listener of this.queuedListeners) listener(event);
    this.onmessage?.(event);
  }
}

describe("Worker WASM bootstrap", () => {
  test("replays messages posted before Rust installs onmessage exactly once", async () => {
    const scope = new BootstrapScope();
    const handled = vi.fn();
    const initialized = Promise.withResolvers<void>();

    const startup = initializeWorkerRuntime(scope, async () => {
      await initialized.promise;
      scope.onmessage = handled;
    });
    scope.emit({ type: "initialize" });
    expect(handled).not.toHaveBeenCalled();

    initialized.resolve();
    await startup;

    expect(handled).toHaveBeenCalledTimes(1);
    expect(scope.queuedListeners).toHaveLength(0);
  });
});
