import { useEffect } from "react";
import type { WorkerClientOptions, WorkerTransport } from "./WorkerClient";
import { WorkerClient } from "./WorkerClient";

export interface CleanupScheduler {
  schedule(task: () => void): () => void;
}
export interface WorkerLifecycleOptions extends WorkerClientOptions {
  createWorker: () => WorkerTransport;
  manifestUrl: string;
  scheduler?: CleanupScheduler;
}
export interface WorkerLifecycle {
  acquire(): WorkerClient;
  release(): void;
}

const microtaskScheduler: CleanupScheduler = {
  schedule(task) {
    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) task();
    });
    return () => {
      cancelled = true;
    };
  },
};

export function createWorkerLifecycle(
  options: WorkerLifecycleOptions,
): WorkerLifecycle {
  const scheduler = options.scheduler ?? microtaskScheduler;
  let client: WorkerClient | null = null;
  let leases = 0;
  let cancelCleanup: (() => void) | null = null;
  return {
    acquire() {
      cancelCleanup?.();
      cancelCleanup = null;
      if (client === null) {
        const nextClient = new WorkerClient(options.createWorker(), options);
        try {
          nextClient.initialize(options.manifestUrl);
        } catch (error: unknown) {
          nextClient.dispose();
          throw error;
        }
        client = nextClient;
      }
      leases += 1;
      return client;
    },
    release() {
      if (leases === 0)
        throw new Error("Worker lifecycle released without an active lease");
      leases -= 1;
      if (leases !== 0) return;
      cancelCleanup = scheduler.schedule(() => {
        cancelCleanup = null;
        if (leases === 0 && client !== null) {
          client.dispose();
          client = null;
        }
      });
    },
  };
}

export function useWorkerLifecycle(lifecycle: WorkerLifecycle): void {
  useEffect(() => {
    lifecycle.acquire();
    return () => {
      lifecycle.release();
    };
  }, [lifecycle]);
}
