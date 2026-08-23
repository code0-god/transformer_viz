import { render } from "@testing-library/react";
import type { ReactElement } from "react";
import { StrictMode } from "react";
import type { WorkerRequest } from "../generated/schema";
import type { WorkerTransport } from "./WorkerClient";
import {
  type CleanupScheduler,
  createWorkerLifecycle,
  useWorkerLifecycle,
} from "./workerLifecycle";

class FakeWorker implements WorkerTransport {
  readonly posted: WorkerRequest[] = [];
  terminations = 0;
  postMessage(message: WorkerRequest): void {
    this.posted.push(message);
  }
  addEventListener(
    _type: "message",
    _listener: (event: MessageEvent<unknown>) => void,
  ): void {}
  removeEventListener(
    _type: "message",
    _listener: (event: MessageEvent<unknown>) => void,
  ): void {}
  terminate(): void {
    this.terminations += 1;
  }
}

class ManualScheduler implements CleanupScheduler {
  readonly tasks: Array<() => void> = [];
  schedule(task: () => void): () => void {
    this.tasks.push(task);
    return () => {
      const index = this.tasks.indexOf(task);
      if (index >= 0) this.tasks.splice(index, 1);
    };
  }
  flush(): void {
    for (const task of this.tasks.splice(0)) task();
  }
}

function Boundary({
  lifecycle,
}: {
  lifecycle: ReturnType<typeof createWorkerLifecycle>;
}): ReactElement {
  useWorkerLifecycle(lifecycle);
  return <div />;
}

test("StrictMode setup-cleanup-setup retains one initialized Worker and final cleanup terminates it", () => {
  const workers: FakeWorker[] = [];
  const scheduler = new ManualScheduler();
  const lifecycle = createWorkerLifecycle({
    createWorker: () => {
      const worker = new FakeWorker();
      workers.push(worker);
      return worker;
    },
    manifestUrl: "./models/edu/manifest.json",
    scheduler,
  });
  const rendered = render(
    <StrictMode>
      <Boundary lifecycle={lifecycle} />
    </StrictMode>,
  );
  expect(workers).toHaveLength(1);
  expect(workers[0]?.posted).toEqual([
    { type: "initialize", manifest_url: "./models/edu/manifest.json" },
  ]);
  scheduler.flush();
  expect(workers[0]?.terminations).toBe(0);
  rendered.unmount();
  scheduler.flush();
  expect(workers[0]?.terminations).toBe(1);
});
