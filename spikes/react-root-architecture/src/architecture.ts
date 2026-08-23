import type { GptConfig } from "./generated/GptConfig";

export function transformerBlockLabel(config: GptConfig): string {
  return `Transformer Block × ${config.n_layer}`;
}
