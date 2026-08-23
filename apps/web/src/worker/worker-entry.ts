import initializeWorkerWasm from "../generated/worker/worker";
import { initializeWorkerRuntime } from "./workerBootstrap";

await initializeWorkerRuntime(
  {
    get onmessage() {
      const handler = self.onmessage;
      return handler === null
        ? null
        : (event: MessageEvent<unknown>) => {
            handler.call(self, event);
          };
    },
    addMessageListener(listener) {
      self.addEventListener("message", listener);
    },
    removeMessageListener(listener) {
      self.removeEventListener("message", listener);
    },
  },
  initializeWorkerWasm,
);
