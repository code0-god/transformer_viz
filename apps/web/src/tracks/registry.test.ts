import type { ModelMetadata } from "../generated/schema";
import { model } from "../test/workerFixtures";
import { decoderOnlyFundamentalsRegistration } from "./decoder-only-fundamentals";
import {
  createLearningTrackRegistry,
  type LearningTrackRegistryError,
  resolveLearningTrack,
} from "./registry";
import type {
  LearningArchitectureSpec,
  LearningTrackRegistration,
} from "./types";

const canonicalEncoderDecoderFixture: LearningArchitectureSpec = {
  architecture_id: "canonical-encoder-decoder-v1",
  family: "encoder_decoder",
  normalization: "layer_norm",
  norm_placement: "post_norm",
  position_encoding: "sinusoidal",
  attention: {
    self_attention: "bidirectional_multi_head",
    cross_attention: true,
  },
  feed_forward: { kind: "relu_ffn" },
  generation: { kind: "autoregressive", kv_cache: false },
  lm_head: { tied_token_embedding: false, bias: true },
  dropout: 0.1,
};

function registration(
  id: "decoder-only-fundamentals" | "canonical-encoder-decoder",
  architectureId: string,
): LearningTrackRegistration {
  return {
    ...decoderOnlyFundamentalsRegistration,
    profile: {
      ...decoderOnlyFundamentalsRegistration.profile,
      id,
      compatibleArchitectureIds: [architectureId],
    },
  };
}

describe("learning track registry", () => {
  test("resolves nanoGPT to decoder fundamentals", () => {
    const resolution = resolveLearningTrack(model);

    expect(resolution.status).toBe("supported");
    if (resolution.status === "supported") {
      expect(resolution.adapter.profile.id).toBe("decoder-only-fundamentals");
    }
  });

  test("rejects duplicate track and architecture mappings", () => {
    expect(() =>
      createLearningTrackRegistry([
        decoderOnlyFundamentalsRegistration,
        decoderOnlyFundamentalsRegistration,
      ]),
    ).toThrow(
      expect.objectContaining<Partial<LearningTrackRegistryError>>({
        code: "duplicate-track-id",
      }),
    );
    expect(() =>
      createLearningTrackRegistry([
        registration("decoder-only-fundamentals", "shared"),
        registration("canonical-encoder-decoder", "shared"),
      ]),
    ).toThrow(
      expect.objectContaining<Partial<LearningTrackRegistryError>>({
        code: "duplicate-architecture-id",
      }),
    );
  });

  test("returns unsupported result for unknown architecture", () => {
    const unknown: ModelMetadata = {
      ...model,
      model_id: "unknown-model",
      architecture: {
        ...model.architecture,
        architecture_id: "unknown-architecture",
      },
    };

    expect(resolveLearningTrack(unknown)).toMatchObject({
      status: "unsupported",
      reason: "unknown-architecture",
    });
  });

  test("returns unsupported result for unknown model checkpoint", () => {
    const unknown: ModelMetadata = {
      ...model,
      model_id: "unknown-model",
    };

    expect(resolveLearningTrack(unknown)).toMatchObject({
      status: "unsupported",
      reason: "incompatible-model",
    });
  });

  test.each([
    ["family", { family: "encoder_decoder" }],
    ["norm placement", { norm_placement: "post_norm" }],
    [
      "cross-attention",
      { attention: { ...model.architecture.attention, cross_attention: true } },
    ],
  ] as const)("rejects incompatible %s", (_, architectureChange) => {
    const incompatible: ModelMetadata = {
      ...model,
      architecture: { ...model.architecture, ...architectureChange },
    };

    expect(resolveLearningTrack(incompatible)).toMatchObject({
      status: "unsupported",
      reason: "incompatible-architecture",
    });
  });

  test("represents future encoder-decoder architecture without registration", () => {
    expect(canonicalEncoderDecoderFixture).toMatchObject({
      family: "encoder_decoder",
      norm_placement: "post_norm",
      position_encoding: "sinusoidal",
      attention: { cross_attention: true },
      feed_forward: { kind: "relu_ffn" },
    });
  });

  test("adapter owns route catalog and breadcrumbs", () => {
    const adapter = decoderOnlyFundamentalsRegistration.createAdapter();
    const state = {
      view: "self-attention",
      selectedLayer: 1,
      selectedHead: 2,
      selectedNodeId: "attention-softmax",
    } as const;
    const context = {
      model,
      state,
      replaySequenceLength: null,
      navigate: () => undefined,
    };

    expect(adapter.getInitialRoute().id).toBe("decoder.root");
    expect(adapter.getAvailableRoutes().map(({ id }) => id)).toEqual([
      "decoder.root",
      "decoder.block",
      "decoder.self-attention",
    ]);
    expect(
      adapter.getBreadcrumbs(context).map(({ id, current }) => ({
        id,
        current,
      })),
    ).toEqual([
      { id: "decoder.root", current: false },
      { id: "decoder.block", current: false },
      { id: "decoder.self-attention", current: true },
    ]);
    expect(adapter.getGuidePage(context).routeId).toBe(
      "decoder.self-attention",
    );
  });
});
