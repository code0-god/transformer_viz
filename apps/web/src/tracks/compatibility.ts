import type { ModelMetadata } from "../generated/schema";
import type { LearningArchitectureSpec, LearningTrackProfile } from "./types";

export type CompatibilityMismatch =
  | "architecture-id"
  | "family"
  | "normalization"
  | "norm-placement"
  | "position-encoding"
  | "self-attention"
  | "cross-attention"
  | "feed-forward"
  | "generation"
  | "kv-cache"
  | "lm-head-tying"
  | "lm-head-bias"
  | "dropout";

function architectureMismatches(
  expected: LearningArchitectureSpec,
  actual: LearningArchitectureSpec,
): readonly CompatibilityMismatch[] {
  const mismatches: CompatibilityMismatch[] = [];
  if (expected.architecture_id !== actual.architecture_id)
    mismatches.push("architecture-id");
  if (expected.family !== actual.family) mismatches.push("family");
  if (expected.normalization !== actual.normalization)
    mismatches.push("normalization");
  if (expected.norm_placement !== actual.norm_placement)
    mismatches.push("norm-placement");
  if (expected.position_encoding !== actual.position_encoding)
    mismatches.push("position-encoding");
  if (expected.attention.self_attention !== actual.attention.self_attention)
    mismatches.push("self-attention");
  if (expected.attention.cross_attention !== actual.attention.cross_attention)
    mismatches.push("cross-attention");
  if (expected.feed_forward.kind !== actual.feed_forward.kind)
    mismatches.push("feed-forward");
  if (expected.generation.kind !== actual.generation.kind)
    mismatches.push("generation");
  if (expected.generation.kv_cache !== actual.generation.kv_cache)
    mismatches.push("kv-cache");
  if (
    expected.lm_head.tied_token_embedding !==
    actual.lm_head.tied_token_embedding
  ) {
    mismatches.push("lm-head-tying");
  }
  if (expected.lm_head.bias !== actual.lm_head.bias)
    mismatches.push("lm-head-bias");
  if (expected.dropout !== actual.dropout) mismatches.push("dropout");
  return mismatches;
}

export type CompatibilityResult =
  | { readonly compatible: true }
  | {
      readonly compatible: false;
      readonly mismatches: readonly CompatibilityMismatch[];
    };

export function validateProfileCompatibility(
  profile: LearningTrackProfile,
  model: Readonly<ModelMetadata>,
): CompatibilityResult {
  const mismatches = architectureMismatches(
    profile.architecture.expected,
    model.architecture,
  );
  return mismatches.length === 0
    ? { compatible: true }
    : { compatible: false, mismatches };
}
