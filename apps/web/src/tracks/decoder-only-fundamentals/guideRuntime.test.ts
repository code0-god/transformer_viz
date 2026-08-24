import {
  decoderGuideRuntimeAdapterIds,
  resolveDecoderRuntimeFacts,
  resolveDecoderSelectedOperation,
} from "./guideRuntime";
import { runtimeContext } from "./guideRuntimeTestFixture";

describe("decoder selected operation runtime", () => {
  test.each([
    ["attention-scores", "S_h = Q_h @ K_hᵀ", "[18, 16] @ [16, 18] → [18, 18]"],
    ["attention-scale", "S_h^scaled = S_h / √D", "[18, 18] → [18, 18]"],
    [
      "attention-causal-mask",
      "S_h^masked = CausalMask(S_h^scaled)",
      "[18, 18] → [18, 18]",
    ],
    ["attention-softmax", "A_h = softmax(S_h^masked)", "[18, 18] → [18, 18]"],
    [
      "attention-value-aggregation",
      "Y_h = A_h @ V_h",
      "[18, 18] @ [18, 16] → [18, 16]",
    ],
  ] as const)(
    "resolves notation and current shape for %s",
    (selectedNodeId, notation, shape) => {
      // Given: a selected attention operation and replay-derived dimensions.
      const context = runtimeContext(
        {
          view: "self-attention",
          selectedLayer: 5,
          selectedHead: 3,
          selectedNodeId,
        },
        18,
      );

      // When: the selected-operation adapter resolves.
      const operation = resolveDecoderSelectedOperation(
        decoderGuideRuntimeAdapterIds.selectedOperation,
        context,
      );

      // Then: canonical notation, formula ID, symbolic shape, and current shape agree.
      expect(operation).toMatchObject({
        id: `decoder.operation.${selectedNodeId}`,
        formulaIds: [selectedNodeId],
        facts: [
          {
            id: "decoder.operation.notation",
            value: notation,
            status: "ready",
          },
          { id: "decoder.operation.symbolic-shape", status: "ready" },
          {
            id: "decoder.operation.current-shape",
            value: shape,
            status: "ready",
            detail: "Derived shape only; tensor values are unavailable.",
          },
        ],
      });
    },
  );

  test.each([
    ["attention-qkv-projection", "[18, 64] → [18, 192]"],
    ["attention-query", "[18, 64]"],
    ["attention-key", "[18, 64]"],
    ["attention-value", "[18, 64]"],
    ["attention-merge-heads", "[4, 18, 16] → [18, 64]"],
    ["attention-output-projection", "[18, 64] → [18, 64]"],
  ] as const)(
    "reports only coarse shape evidence for %s",
    (selectedNodeId, shape) => {
      // Given: a selected operation whose runtime exposes no tensor values.
      const context = runtimeContext(
        {
          view: "self-attention",
          selectedLayer: 5,
          selectedHead: 3,
          selectedNodeId,
        },
        18,
      );

      // When: selected operation presentation resolves.
      const operation = resolveDecoderSelectedOperation(
        decoderGuideRuntimeAdapterIds.selectedOperation,
        context,
      );

      // Then: only canonical notation and a derived shape are exposed.
      expect(operation?.facts.map(({ value }) => value)).toContain(shape);
      expect(operation?.facts).toHaveLength(3);
    },
  );

  test("filters selections to the current root and block route", () => {
    // Given: valid local and stale route selections.
    const root = runtimeContext(
      {
        view: "root",
        selectedLayer: 0,
        selectedHead: 0,
        selectedNodeId: "logits",
      },
      18,
    );
    const block = runtimeContext(
      {
        view: "transformer-block",
        selectedLayer: 5,
        selectedHead: 3,
        selectedNodeId: "mlp",
      },
      18,
    );
    const stale = runtimeContext(
      {
        view: "transformer-block",
        selectedLayer: 5,
        selectedHead: 3,
        selectedNodeId: "attention-softmax",
      },
      18,
    );

    // When: selected operations resolve by current route.
    const operations = [root, block, stale].map((context) =>
      resolveDecoderSelectedOperation(
        decoderGuideRuntimeAdapterIds.selectedOperation,
        context,
      ),
    );

    // Then: local operations resolve and stale cross-route state is absent.
    expect(
      operations.map((operation) => operation?.formulaIds ?? null),
    ).toEqual([["logits"], ["mlp"], null]);
  });

  test("keeps current shape pending without replay or valid dimensions", () => {
    // Given: null replay and malformed shape configurations.
    const pending = runtimeContext(
      {
        view: "self-attention",
        selectedLayer: 5,
        selectedHead: 3,
        selectedNodeId: "attention-softmax",
      },
      null,
    );
    const malformed = {
      ...pending,
      model: {
        ...pending.model,
        config: { ...pending.model.config, n_head: 3 },
      },
    };

    // When: selected operation presentation resolves.
    const operations = [pending, malformed].map((context) =>
      resolveDecoderSelectedOperation(
        decoderGuideRuntimeAdapterIds.selectedOperation,
        context,
      ),
    );

    // Then: no runtime shape is invented.
    for (const operation of operations) {
      expect(operation?.facts[2]).toMatchObject({
        id: "decoder.operation.current-shape",
        value: "실행 후 표시",
        status: "pending",
      });
    }
  });

  test("resolves every adapter without navigation or transport work", () => {
    // Given: instrumented callbacks around a pure attention context.
    let navigationCount = 0;
    let transportCount = 0;
    const context = runtimeContext(
      {
        view: "self-attention",
        selectedLayer: 5,
        selectedHead: 3,
        selectedNodeId: "attention-softmax",
      },
      18,
      () => {
        navigationCount += 1;
      },
    );
    const transport = () => {
      transportCount += 1;
    };

    // When: every registered runtime adapter resolves.
    resolveDecoderRuntimeFacts(
      decoderGuideRuntimeAdapterIds.rootFacts,
      context,
    );
    resolveDecoderRuntimeFacts(
      decoderGuideRuntimeAdapterIds.blockFacts,
      context,
    );
    resolveDecoderRuntimeFacts(
      decoderGuideRuntimeAdapterIds.attentionFacts,
      context,
    );
    resolveDecoderSelectedOperation(
      decoderGuideRuntimeAdapterIds.selectedOperation,
      context,
    );

    // Then: resolution is pure and transport remains untouched.
    expect({ navigationCount, transportCount }).toEqual({
      navigationCount: 0,
      transportCount: 0,
    });
    expect(transport).toBeTypeOf("function");
  });
});
