import type { LearningNodeId } from "../types";
import { validateLearningProfile } from "../validation";
import { decoderGuideRuntimeAdapterIds } from "./guideRuntime";
import { decoderOnlyFundamentalsProfile } from "./profile";
import { decoderRootGlossary } from "./rootGlossary";
import { decoderRootGuide } from "./rootGuide";

const sectionIds = [
  "root-generation-overview",
  "root-token-context",
  "root-embeddings",
  "root-hidden-state",
  "root-transformer-block",
  "root-prediction",
  "root-append-repeat",
  "root-current-model",
  "root-formula-summary",
  "root-misconceptions",
] as const;

const glossaryIds = [
  "token",
  "context",
  "embedding",
  "hidden-state",
  "vocabulary",
  "logit",
  "autoregressive-generation",
] as const;

const mappedRootNodeIds: readonly LearningNodeId[] = [
  "decoder.root.input-context",
  "decoder.root.token-embedding",
  "decoder.root.position-embedding",
  "decoder.root.embedding-add",
  "decoder.root.hidden-state",
  "decoder.root.transformer-block",
  "decoder.root.final-layer-norm",
  "decoder.root.lm-head",
  "decoder.root.logits",
  "decoder.root.token-selection",
  "decoder.root.generated-token",
  "decoder.root.append-context",
];

function section(id: (typeof sectionIds)[number]) {
  const match = decoderRootGuide.sections.find((item) => item.id === id);
  if (match === undefined) throw new Error(`Missing Root guide section: ${id}`);
  return match;
}

describe("decoder Root beginner guide", () => {
  test("declares the complete ordered Root learning contract", () => {
    // Given: the standalone Root guide page.
    // When: its machine-consumed route structure is inspected.
    const actualSectionIds = decoderRootGuide.sections.map(({ id }) => id);

    // Then: every required stage appears once in teaching order.
    expect(decoderRootGuide.id).toBe("decoder-guide-root");
    expect(decoderRootGuide.routeId).toBe("decoder.root");
    expect(actualSectionIds).toEqual(sectionIds);
    expect(decoderRootGuide.outlineSectionIds).toEqual(sectionIds);
    expect(decoderRootGuide.nextStep).toEqual({
      routeId: "decoder.block",
      label: "Transformer Block",
    });
  });

  test("maps every Root diagram node exactly once with embedding associations", () => {
    // Given: all Root section-to-diagram associations.
    const associations = decoderRootGuide.sections.flatMap(
      ({ associatedNodeIds }) => associatedNodeIds ?? [],
    );

    // When: mapping multiplicity and concept groups are inspected.
    const counts = Object.fromEntries(
      mappedRootNodeIds.map((nodeId) => [
        nodeId,
        associations.filter((candidate) => candidate === nodeId).length,
      ]),
    );

    // Then: coverage is exact and the input representation nodes stay together.
    expect(counts).toEqual(
      Object.fromEntries(mappedRootNodeIds.map((nodeId) => [nodeId, 1])),
    );
    expect(section("root-embeddings").associatedNodeIds).toEqual([
      "decoder.root.token-embedding",
      "decoder.root.position-embedding",
      "decoder.root.embedding-add",
    ]);
    expect(section("root-hidden-state").associatedNodeIds).toEqual([
      "decoder.root.hidden-state",
    ]);
  });

  test("uses typed example, runtime, formula, and misconception blocks", () => {
    // Given: concept sections whose block kinds carry renderer behavior.
    const tokenBlocks = section("root-token-context").blocks;
    const runtimeBlocks = section("root-current-model").blocks;
    const formulaBlocks = section("root-formula-summary").blocks;
    const misconceptionBlocks = section("root-misconceptions").blocks;

    // When: block IDs and discriminants are projected.
    // Then: examples and runtime facts precede a prose-led formula summary.
    expect(tokenBlocks.map(({ id, kind }) => ({ id, kind }))).toEqual(
      expect.arrayContaining([
        { id: "root-byte-token-example", kind: "example" },
      ]),
    );
    expect(runtimeBlocks.map(({ id, kind }) => ({ id, kind }))).toEqual([
      { id: "root-current-model-intro", kind: "paragraph" },
      { id: "root-runtime-facts", kind: "runtime-facts" },
    ]);
    expect(runtimeBlocks[1]).toEqual({
      id: "root-runtime-facts",
      kind: "runtime-facts",
      adapterId: decoderGuideRuntimeAdapterIds.rootFacts,
    });
    expect(formulaBlocks[0]?.kind).toBe("paragraph");
    expect(formulaBlocks.slice(1).every(({ kind }) => kind === "formula")).toBe(
      true,
    );
    expect(misconceptionBlocks.every(({ kind }) => kind === "callout")).toBe(
      true,
    );
  });

  test("publishes the complete bounded Root glossary", () => {
    // Given: the Root glossary and page references.
    // When: IDs and sentence counts are inspected.
    const sentenceCounts = decoderRootGlossary.map(
      ({ definition }) =>
        definition.split(/[.!?](?:\s|$)/u).filter(Boolean).length,
    );

    // Then: all required terms have one-to-three sentence definitions.
    expect(decoderRootGlossary.map(({ id }) => id)).toEqual(glossaryIds);
    expect(decoderRootGuide.glossary).toEqual(glossaryIds);
    expect(sentenceCounts.every((count) => count >= 1 && count <= 3)).toBe(
      true,
    );
  });

  test("satisfies generic content, reference, and node validation", () => {
    // Given: the current profile with only its Root page replaced for Task 7.
    const profile = {
      ...decoderOnlyFundamentalsProfile,
      guide: {
        ...decoderOnlyFundamentalsProfile.guide,
        pages: {
          ...decoderOnlyFundamentalsProfile.guide.pages,
          "decoder.root": decoderRootGuide,
        },
      },
    };

    // When: generic profile validation scans the standalone migration fixture.
    const issues = validateLearningProfile(profile);

    // Then: all IDs, references, mappings, and ordering contracts are valid.
    expect(issues).toEqual([]);
  });
});
