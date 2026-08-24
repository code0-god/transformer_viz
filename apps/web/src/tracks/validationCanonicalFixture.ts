import type { ArchitectureNodeId } from "../architecture/catalog";
import { decoderOnlyFundamentalsProfile } from "./decoder-only-fundamentals";

const canonicalNodeMap = {
  "canonical.encoder.attention": "attention-softmax",
  "canonical.encoder.static": "embedding-add",
  "canonical.encoder.transition": "self-attention",
} satisfies Readonly<Record<string, ArchitectureNodeId>>;

export const canonicalProfileFixture = {
  ...decoderOnlyFundamentalsProfile,
  id: "canonical-encoder-decoder" as const,
  compatibleArchitectureIds: ["canonical-encoder-v1"],
  architecture: {
    ...decoderOnlyFundamentalsProfile.architecture,
    nodeMap: canonicalNodeMap,
  },
  routes: {
    initialRouteId: "canonical.encoder" as const,
    definitions: [
      {
        id: "canonical.encoder" as const,
        title: "Encoder",
        subtitle: "Canonical encoder",
        guidePageId: "canonical.guide.encoder",
        terminal: true,
        guideCoverageExemptNodeIds: ["canonical.encoder.transition" as const],
      },
    ],
  },
  guide: {
    runtimeAdapterIds: ["canonical.runtime"],
    operationAdapterIds: ["canonical.operation"],
    pages: {
      "canonical.encoder": {
        id: "canonical.guide.encoder",
        routeId: "canonical.encoder" as const,
        title: "Encoder",
        learningGoal: "Inspect the encoder contract.",
        introduction: [
          { id: "canonical.intro", kind: "paragraph" as const, text: "Intro" },
          {
            id: "canonical.rich",
            kind: "rich-paragraph" as const,
            content: [
              { kind: "math" as const, formulaId: "canonical.formula" },
              { kind: "term-ref" as const, termId: "canonical.term" },
            ],
          },
        ],
        sections: [
          {
            id: "canonical.section",
            title: "Attention",
            primaryNodeId: "canonical.encoder.attention" as const,
            associatedNodeIds: [
              "canonical.encoder.attention" as const,
              "canonical.encoder.static" as const,
            ],
            blocks: [
              {
                id: "canonical.runtime-block",
                kind: "runtime-facts" as const,
                adapterId: "canonical.runtime",
              },
              {
                id: "canonical.operation-block",
                kind: "selected-operation" as const,
                adapterId: "canonical.operation",
              },
              {
                id: "canonical.formula-block",
                kind: "formula" as const,
                formulaId: "canonical.formula",
              },
            ],
          },
        ],
        keyTakeaway: [
          { id: "canonical.takeaway", kind: "paragraph" as const, text: "Key" },
        ],
        glossary: ["canonical.term"],
      },
    },
    glossary: [
      { id: "canonical.term", term: "Attention", definition: "Definition" },
    ],
  },
  notation: {
    formulas: {
      "canonical.formula": {
        id: "canonical.formula",
        tex: "Y=AV",
        plainText: "Y equals A V",
        accessibleLabel: "Canonical attention",
      },
    },
  },
};
