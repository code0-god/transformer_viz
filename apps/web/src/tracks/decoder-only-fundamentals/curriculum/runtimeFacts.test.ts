import { describe, expect, test } from "vitest";

import type { RuntimeFactsPresentation } from "../../types";
import { guideRuntimeFacts } from "./runtimeFacts";

const RUNTIME_ADAPTER_IDS = [
  "current-model.embedding",
  "current-model.position",
  "current-model.hidden-state",
] as const;

const SOURCE_PATHS = [
  "apps/web/public/models/edu/config.json",
  "crates/nanogpt-model/src/model.rs",
  "crates/nanogpt-model/src/layers.rs",
] as const;

describe("Part 2 typed current runtime facts", () => {
  test("presents the exact current-model adapters without inferred fallback", () => {
    // Given/When: the current asset facts are read through the typed boundary.
    const adapterIds = Object.keys(guideRuntimeFacts);

    // Then: all three Chapter adapters are available and ready.
    expect(adapterIds).toEqual(RUNTIME_ADAPTER_IDS);
    for (const presentation of Object.values(guideRuntimeFacts)) {
      expect(presentation.facts.length).toBeGreaterThanOrEqual(3);
      expect(presentation.facts.every(({ status }) => status === "ready")).toBe(
        true,
      );
      expect(presentation.facts.every(({ value }) => value !== "")).toBe(true);
    }
  });

  test("source-binds asset dimensions and model semantics by typed fact IDs", () => {
    // Given: every current-model fact and its provenance detail.
    const presentations: readonly RuntimeFactsPresentation[] =
      Object.values(guideRuntimeFacts);
    const facts = presentations.flatMap(({ facts }) => facts);

    // When: machine-consumed IDs and sources are inspected.
    const factIds = facts.map(({ id }) => id);
    const details = facts.flatMap(({ detail }) =>
      detail === undefined ? [] : [detail],
    );

    // Then: dimensions, learned positions, batch, blocks, and causal behavior are explicit.
    expect(factIds).toEqual(
      expect.arrayContaining([
        "current.vocab-size",
        "current.channel-count",
        "current.block-size",
        "current.position-encoding",
        "current.layer-count",
        "current.batch-boundary",
        "current.causal-prefix",
      ]),
    );
    expect(details).toEqual(expect.arrayContaining([...SOURCE_PATHS]));
    expect(JSON.stringify(guideRuntimeFacts)).not.toMatch(
      /fallback|heuristic|sinusoidal|rope/i,
    );
  });
});
