import { defineConfig, mergeConfig } from "vitest/config";

import baseConfig from "./vite.config.ts";

export default defineConfig(async (environment) => {
  const resolvedBase =
    typeof baseConfig === "function"
      ? await baseConfig(environment)
      : await baseConfig;
  return mergeConfig(resolvedBase, {
    test: {
      fileParallelism: false,
      include: ["src/tracks/learning-scenes/SceneFigure.test.tsx"],
      maxWorkers: 1,
      minWorkers: 1,
    },
  });
});
