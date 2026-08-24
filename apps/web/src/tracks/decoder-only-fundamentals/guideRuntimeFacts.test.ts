import {
  decoderGuideRuntimeAdapterIds,
  resolveDecoderRuntimeFacts,
} from "./guideRuntime";
import { runtimeContext, runtimeModelFixture } from "./guideRuntimeTestFixture";

function values(
  facts: ReturnType<typeof resolveDecoderRuntimeFacts>,
): Readonly<Record<string, string>> {
  return Object.fromEntries(facts.facts.map((fact) => [fact.id, fact.value]));
}

describe("decoder guide runtime facts", () => {
  test("resolves exact root config facts from metadata", () => {
    // Given: distinct model configuration values.
    const context = runtimeContext(
      { view: "root", selectedLayer: 0, selectedHead: 0, selectedNodeId: null },
      null,
    );

    // When: the root runtime adapter resolves its fact group.
    const facts = resolveDecoderRuntimeFacts(
      decoderGuideRuntimeAdapterIds.rootFacts,
      context,
    );

    // Then: every model fact retains its exact config value and provenance.
    expect(values(facts)).toEqual({
      "decoder.fact.blocks": "7",
      "decoder.fact.heads": "4",
      "decoder.fact.model-width": "64",
      "decoder.fact.context-window": "96",
      "decoder.fact.vocabulary": "257",
    });
    expect(facts.facts.map(({ detail }) => detail)).toEqual([
      "ModelMetadata.config.n_layer",
      "ModelMetadata.config.n_head",
      "ModelMetadata.config.n_embd",
      "ModelMetadata.config.block_size",
      "ModelMetadata.config.vocab_size",
    ]);
  });

  test("resolves selected block layer and model facts", () => {
    // Given: a selected decoder block.
    const context = runtimeContext(
      {
        view: "transformer-block",
        selectedLayer: 5,
        selectedHead: 3,
        selectedNodeId: "mlp",
      },
      null,
    );

    // When: block facts resolve.
    const facts = resolveDecoderRuntimeFacts(
      decoderGuideRuntimeAdapterIds.blockFacts,
      context,
    );

    // Then: the selected layer and config-derived dimensions are exact.
    expect(values(facts)).toEqual({
      "decoder.fact.selected-layer": "5",
      "decoder.fact.blocks": "7",
      "decoder.fact.model-width": "64",
    });
  });

  test("keeps replay-derived attention facts pending when T is null", () => {
    // Given: attention selectors without a completed replay.
    const context = runtimeContext(
      {
        view: "self-attention",
        selectedLayer: 5,
        selectedHead: 3,
        selectedNodeId: "attention-query",
      },
      null,
    );

    // When: attention facts resolve.
    const facts = resolveDecoderRuntimeFacts(
      decoderGuideRuntimeAdapterIds.attentionFacts,
      context,
    );

    // Then: config math is ready while T and QKV remain pending.
    expect(facts.facts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "decoder.fact.sequence-length",
          value: "—",
          status: "pending",
          detail: "replaySequenceLength",
        }),
        expect.objectContaining({
          id: "decoder.fact.head-dimension",
          value: "16",
          status: "ready",
          detail: "C / H = 64 / 4",
        }),
        expect.objectContaining({
          id: "decoder.fact.scale-factor",
          value: "0.25",
          status: "ready",
          detail: "1 / sqrt(D) = 1 / sqrt(16)",
        }),
        expect.objectContaining({
          id: "decoder.fact.qkv-head-shape",
          value: "실행 후 표시",
          status: "pending",
        }),
      ]),
    );
  });

  test("resolves T at 18 and derives attention facts and QKV shapes", () => {
    // Given: a completed replay at sequence length 18.
    const context = runtimeContext(
      {
        view: "self-attention",
        selectedLayer: 5,
        selectedHead: 3,
        selectedNodeId: "attention-qkv-projection",
      },
      18,
    );

    // When: attention facts resolve.
    const facts = resolveDecoderRuntimeFacts(
      decoderGuideRuntimeAdapterIds.attentionFacts,
      context,
    );

    // Then: selectors, dimensions, and derived QKV shapes are display-ready.
    expect(values(facts)).toEqual({
      "decoder.fact.selected-layer": "5",
      "decoder.fact.selected-head": "3",
      "decoder.fact.sequence-length": "18",
      "decoder.fact.model-width": "64",
      "decoder.fact.heads": "4",
      "decoder.fact.head-dimension": "16",
      "decoder.fact.scale-factor": "0.25",
      "decoder.fact.qkv-head-shape": "[4, 18, 16]",
      "decoder.fact.qkv-full-shape": "[1, 4, 18, 16]",
    });
  });

  test("degrades malformed shape config and replay lengths to pending", () => {
    // Given: structurally typed but invalid dimensions at the runtime seam.
    const context = {
      ...runtimeContext(
        {
          view: "self-attention",
          selectedLayer: 0,
          selectedHead: 0,
          selectedNodeId: "attention-scores",
        },
        -1,
      ),
      model: {
        ...runtimeModelFixture,
        config: { ...runtimeModelFixture.config, n_embd: 63 },
      },
    };

    // When: attention facts resolve.
    const facts = resolveDecoderRuntimeFacts(
      decoderGuideRuntimeAdapterIds.attentionFacts,
      context,
    );

    // Then: unavailable derived facts remain honest pending values.
    expect(
      facts.facts
        .filter(({ status }) => status === "pending")
        .map(({ id }) => id),
    ).toEqual([
      "decoder.fact.sequence-length",
      "decoder.fact.head-dimension",
      "decoder.fact.scale-factor",
      "decoder.fact.qkv-head-shape",
      "decoder.fact.qkv-full-shape",
    ]);
  });
});
