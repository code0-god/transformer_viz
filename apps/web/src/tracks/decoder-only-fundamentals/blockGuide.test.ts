import { describe, expect, test } from "vitest";
import { architectureNodeCatalog } from "../../architecture/catalog";
import type { LearningGuidePage, LearningTrackProfile } from "../types";
import { validateLearningProfile } from "../validation";
import { decoderBlockGuide } from "./blockGuide";
import { blockGuideGlossary } from "./blockGuideGlossary";
import { decoderNodeMap } from "./nodes";
import { decoderOnlyFundamentalsProfile } from "./profile";

const sectionIds = [
  "block-overview",
  "block-input",
  "block-layer-norm-1",
  "block-self-attention",
  "block-residual-1",
  "block-layer-norm-2",
  "block-mlp",
  "block-residual-2",
  "block-attention-vs-mlp",
  "block-depth",
  "block-runtime",
  "block-formulas",
  "block-misconceptions",
] as const;

const glossaryIds = [
  "feature",
  "layer-norm",
  "pre-ln",
  "self-attention",
  "residual-connection",
  "mlp",
  "hidden-state",
] as const;

const operationNodeIds = [
  "decoder.block.layer-norm-1",
  "decoder.block.self-attention",
  "decoder.block.residual-1",
  "decoder.block.layer-norm-2",
  "decoder.block.mlp",
  "decoder.block.residual-2",
] as const;

const formulaIds = [
  "layer-norm-1",
  "self-attention",
  "residual-1",
  "layer-norm-2",
  "mlp",
  "residual-2",
] as const;

function sentenceCount(definition: string): number {
  return definition.split(".").filter((sentence) => sentence.trim() !== "")
    .length;
}

function profileWithBlockPage(page: LearningGuidePage): LearningTrackProfile {
  return {
    ...decoderOnlyFundamentalsProfile,
    guide: {
      ...decoderOnlyFundamentalsProfile.guide,
      pages: {
        ...decoderOnlyFundamentalsProfile.guide.pages,
        "decoder.block": page,
      },
    },
  };
}

describe("beginner Transformer Block guide contract", () => {
  test("orders the complete beginner learning flow", () => {
    expect(decoderBlockGuide.sections.map(({ id }) => id)).toEqual(sectionIds);
    expect(decoderBlockGuide.outlineSectionIds).toEqual(sectionIds);
    expect(decoderBlockGuide.nextStep).toEqual({
      routeId: "decoder.self-attention",
      label: "Self-Attention",
    });
  });

  test("maps every Block operation exactly once including Attention drill-down", () => {
    const mappedNodeIds = decoderBlockGuide.sections.flatMap(
      ({ associatedNodeIds = [] }) => associatedNodeIds,
    );
    expect(mappedNodeIds).toEqual(operationNodeIds);
    expect(new Set(mappedNodeIds).size).toBe(operationNodeIds.length);

    const attentionArchitectureId =
      decoderNodeMap["decoder.block.self-attention"];
    expect(architectureNodeCatalog[attentionArchitectureId].capability).toBe(
      "drill-down",
    );
  });

  test("keeps runtime facts dynamic and formulas after explanations", () => {
    const blocks = decoderBlockGuide.sections.flatMap(({ blocks }) => blocks);
    expect(blocks.filter(({ kind }) => kind === "runtime-facts")).toEqual([
      {
        id: "block-runtime-facts",
        kind: "runtime-facts",
        adapterId: "decoder.runtime.block-facts",
      },
    ]);
    expect(
      blocks
        .filter(({ kind }) => kind === "formula")
        .map((block) => (block.kind === "formula" ? block.formulaId : null)),
    ).toEqual(formulaIds);
    expect(sectionIds.indexOf("block-formulas")).toBeGreaterThan(
      sectionIds.indexOf("block-depth"),
    );
  });

  test("publishes the required compact glossary", () => {
    expect(decoderBlockGuide.glossary).toEqual(glossaryIds);
    const entries = glossaryIds.map((id) =>
      blockGuideGlossary.find((entry) => entry.id === id),
    );
    expect(entries.every((entry) => entry !== undefined)).toBe(true);
    for (const entry of entries) {
      if (entry === undefined) continue;
      expect(sentenceCount(entry.definition)).toBeGreaterThanOrEqual(1);
      expect(sentenceCount(entry.definition)).toBeLessThanOrEqual(3);
    }
  });

  test("passes complete profile validation as a standalone page", () => {
    expect(
      validateLearningProfile(profileWithBlockPage(decoderBlockGuide)),
    ).toEqual([]);
  });

  test("reports exact diagnostics for LN2 and duplicate-primary mutations", () => {
    const withoutLayerNorm2Association: LearningGuidePage = {
      ...decoderBlockGuide,
      sections: decoderBlockGuide.sections.map((section) =>
        section.id === "block-layer-norm-2"
          ? { ...section, associatedNodeIds: [] }
          : section,
      ),
    };
    expect(
      validateLearningProfile(
        profileWithBlockPage(withoutLayerNorm2Association),
      ),
    ).toContainEqual({
      code: "primary-not-associated",
      path: "guide.pages.decoder.block.sections[5].primaryNodeId",
      relatedId: "decoder.block.layer-norm-2",
    });

    const duplicatePrimary: LearningGuidePage = {
      ...decoderBlockGuide,
      sections: decoderBlockGuide.sections.map((section) =>
        section.id === "block-residual-2"
          ? {
              ...section,
              primaryNodeId: "decoder.block.residual-1",
              associatedNodeIds: [
                "decoder.block.residual-1",
                "decoder.block.residual-2",
              ],
            }
          : section,
      ),
    };
    expect(
      validateLearningProfile(profileWithBlockPage(duplicatePrimary)),
    ).toContainEqual({
      code: "duplicate-primary-node",
      path: "guide.pages.decoder.block.sections[7].primaryNodeId",
      relatedId: "decoder.block.residual-1",
    });
  });
});
