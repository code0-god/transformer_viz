import type { WorkerTransport } from "./WorkerClient";

export function createInferenceWorker(): WorkerTransport {
  return new Worker(new URL("./worker-entry.ts", import.meta.url), {
    name: "transformer-viz-inference",
    type: "module",
  });
}
