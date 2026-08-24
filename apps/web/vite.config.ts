import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

class MissingVerifiedWorkerError extends Error {
  override readonly name = "MissingVerifiedWorkerError";
}

export default defineConfig(({ command }) => {
  const { TRANSFORMER_VIZ_VERIFIED_WORKER_DIR: verifiedWorker } = process.env;
  if (command === "build" && verifiedWorker === undefined) {
    throw new MissingVerifiedWorkerError(
      "Production builds require a verified Worker snapshot",
    );
  }

  return {
    build: {
      assetsInlineLimit(filePath) {
        if (filePath.endsWith("/KaTeX_Size3-Regular.woff2")) return false;
        return undefined;
      },
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes("/node_modules/katex/")) return "katex";
            if (id.includes("/node_modules/react")) return "react";
            return undefined;
          },
        },
      },
    },
    plugins: [react()],
    resolve: {
      alias: {
        "#worker":
          verifiedWorker ??
          fileURLToPath(new URL("./src/generated/worker", import.meta.url)),
      },
    },
    test: {
      environment: "jsdom",
      globals: true,
      setupFiles: ["./src/test/setup.ts"],
    },
    worker: {
      format: "es" as const,
    },
  };
});
