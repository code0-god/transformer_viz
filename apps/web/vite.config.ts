import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
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
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
  },
  worker: {
    format: "es",
  },
});
