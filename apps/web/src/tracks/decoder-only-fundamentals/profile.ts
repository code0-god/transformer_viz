import { formulaCatalog } from "../../math/formulaCatalog";
import type { LearningTrackProfile } from "../types";
import { decoderGuideCatalog } from "./guide";
import { decoderNodeMap } from "./nodes";
import { decoderAttentionSymbols, decoderNotationEntries } from "./notation";
import { decoderRouteCatalog } from "./routes";

export const decoderOnlyFundamentalsProfile: LearningTrackProfile = {
  id: "decoder-only-fundamentals",
  title: "Decoder-only Transformer Fundamentals",
  shortTitle: "nanoGPT Fundamentals",
  subtitle: "GPT형 Transformer가 텍스트를 생성하는 과정을 탐색합니다.",
  description:
    "작은 nanoGPT-compatible 모델을 통해 Decoder-only Transformer와 Causal Self-Attention의 핵심을 학습합니다.",
  compatibleArchitectureIds: ["nanogpt-decoder-v1"],
  compatibleModelIds: ["nanogpt-edu"],
  architecture: {
    expected: {
      architecture_id: "nanogpt-decoder-v1",
      family: "decoder_only",
      normalization: "layer_norm",
      norm_placement: "pre_norm",
      position_encoding: "learned_absolute",
      attention: {
        self_attention: "causal_multi_head",
        cross_attention: false,
      },
      feed_forward: { kind: "gelu_mlp" },
      generation: {
        kind: "autoregressive",
        kv_cache: false,
      },
      lm_head: {
        tied_token_embedding: true,
        bias: false,
      },
      dropout: 0,
    },
    nodeMap: decoderNodeMap,
  },
  routes: decoderRouteCatalog,
  guide: decoderGuideCatalog,
  notation: {
    formulas: formulaCatalog,
    entries: decoderNotationEntries,
    symbols: decoderAttentionSymbols,
  },
};

export { decoderNotationEntries };
