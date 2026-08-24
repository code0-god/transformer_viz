import type { ArchitectureState } from "../../architecture";
import type { ModelMetadata } from "../../generated/schema";
import type { ArchitectureRenderContext } from "../types";

export const runtimeModelFixture: ModelMetadata = {
  model_id: "nanogpt-edu",
  name: "Runtime fixture",
  corpus: "fixture",
  nanogpt_commit: "fixture",
  parameter_count: 1,
  architecture: {
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
    generation: { kind: "autoregressive", kv_cache: false },
    lm_head: { tied_token_embedding: true, bias: false },
    dropout: 0,
  },
  config: {
    block_size: 96,
    vocab_size: 257,
    n_layer: 7,
    n_head: 4,
    n_embd: 64,
    bias: true,
    dropout: 0,
  },
};

export function runtimeContext(
  state: ArchitectureState,
  replaySequenceLength: number | null,
  navigate: ArchitectureRenderContext["navigate"] = () => undefined,
): ArchitectureRenderContext {
  return {
    model: runtimeModelFixture,
    state,
    replaySequenceLength,
    navigate,
  };
}
