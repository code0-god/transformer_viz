import currentModelConfig from "../../../../public/models/edu/config.json";
import type { RuntimeFactsPresentation } from "../../types";

const CONFIG_SOURCE = "apps/web/public/models/edu/config.json";
const MODEL_SOURCE = "crates/nanogpt-model/src/model.rs";
const LAYERS_SOURCE = "crates/nanogpt-model/src/layers.rs";

export const guideRuntimeFacts = {
  "current-model.embedding": {
    id: "current-model.embedding",
    title: "현재 모델의 embedding 경계",
    facts: [
      {
        id: "current.vocab-size",
        label: "Vocabulary rows",
        value: String(currentModelConfig.vocab_size),
        status: "ready",
        detail: CONFIG_SOURCE,
      },
      {
        id: "current.channel-count",
        label: "Channels C",
        value: String(currentModelConfig.n_embd),
        status: "ready",
        detail: CONFIG_SOURCE,
      },
      {
        id: "current.batch-boundary",
        label: "Model boundary",
        value: "[B,T,C], Guide는 B=1 생략",
        status: "ready",
        detail: MODEL_SOURCE,
      },
    ],
  },
  "current-model.position": {
    id: "current-model.position",
    title: "현재 모델의 position 경계",
    facts: [
      {
        id: "current.block-size",
        label: "Learned position rows",
        value: String(currentModelConfig.block_size),
        status: "ready",
        detail: CONFIG_SOURCE,
      },
      {
        id: "current.channel-count",
        label: "Channels C",
        value: String(currentModelConfig.n_embd),
        status: "ready",
        detail: CONFIG_SOURCE,
      },
      {
        id: "current.position-encoding",
        label: "Position encoding",
        value: "Learned absolute",
        status: "ready",
        detail: MODEL_SOURCE,
      },
    ],
  },
  "current-model.hidden-state": {
    id: "current-model.hidden-state",
    title: "현재 모델의 hidden-state 경계",
    facts: [
      {
        id: "current.layer-count",
        label: "Transformer Blocks N",
        value: String(currentModelConfig.n_layer),
        status: "ready",
        detail: CONFIG_SOURCE,
      },
      {
        id: "current.channel-count",
        label: "Channels C",
        value: String(currentModelConfig.n_embd),
        status: "ready",
        detail: CONFIG_SOURCE,
      },
      {
        id: "current.batch-boundary",
        label: "Block boundary",
        value: "[B,T,C]",
        status: "ready",
        detail: LAYERS_SOURCE,
      },
      {
        id: "current.causal-prefix",
        label: "Context rule",
        value: "현재 위치까지의 prefix",
        status: "ready",
        detail: LAYERS_SOURCE,
      },
    ],
  },
} as const satisfies Readonly<Record<string, RuntimeFactsPresentation>>;
