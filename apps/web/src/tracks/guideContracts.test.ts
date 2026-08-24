import type { FormulaDefinition } from "../math/formulaCatalog";
import { learningTrackRegistry } from "./registry";
import type {
  ArchitectureRouteDefinition,
  GuideBlock,
  LearningGuidePage,
  RuntimeFactsPresentation,
  SelectedOperationPresentation,
} from "./types";

type CanonicalFormulaId = "canonical.encoder-attention";

const canonicalFormula: FormulaDefinition<CanonicalFormulaId> = {
  id: "canonical.encoder-attention",
  tex: "Y = A V",
  plainText: "Y = A V",
  accessibleLabel: "Canonical encoder attention",
};

const canonicalRoute: ArchitectureRouteDefinition = {
  id: "canonical.encoder",
  title: "Encoder",
  subtitle: "Canonical encoder",
  guidePageId: "canonical.guide.encoder",
  terminal: true,
};

const runtimeFacts: RuntimeFactsPresentation = {
  id: "canonical.runtime.encoder-facts",
  facts: [
    {
      id: "canonical.fact.layers",
      label: "Layers",
      value: "6",
      status: "ready",
    },
  ],
};

const selectedOperation: SelectedOperationPresentation = {
  id: "canonical.operation.cross-attention",
  title: "Cross-attention",
  summary: "Selected operation",
  formulaIds: ["canonical.encoder-attention"],
  facts: runtimeFacts.facts,
};

const canonicalBlocks: readonly GuideBlock<CanonicalFormulaId>[] = [
  {
    id: "canonical.block.rich-overview",
    kind: "rich-paragraph",
    content: [
      { kind: "text", text: "Attention uses " },
      { kind: "strong", text: "weighted values" },
      { kind: "math", formulaId: "canonical.encoder-attention" },
      {
        kind: "term-ref",
        termId: "canonical.attention-weight",
        label: "attention weights",
      },
      { kind: "code", code: "encoder_output" },
    ],
  },
  {
    id: "canonical.block.formula",
    kind: "formula",
    formulaId: "canonical.encoder-attention",
  },
  {
    id: "canonical.block.runtime-facts",
    kind: "runtime-facts",
    adapterId: "canonical.runtime.encoder-facts",
  },
  {
    id: "canonical.block.selected-operation",
    kind: "selected-operation",
    adapterId: "canonical.operation.cross-attention",
  },
];

const canonicalPage: LearningGuidePage<CanonicalFormulaId> = {
  id: "canonical.guide.encoder",
  routeId: "canonical.encoder",
  title: "Encoder",
  learningGoal: "Inspect the encoder contract.",
  introduction: canonicalBlocks,
  sections: [
    {
      id: "canonical.section.attention",
      title: "Attention",
      primaryNodeId: "canonical.encoder.attention",
      associatedNodeIds: ["canonical.encoder.attention"],
      blocks: canonicalBlocks,
    },
  ],
  outlineSectionIds: ["canonical.section.attention"],
  keyTakeaway: [],
  glossary: ["canonical.attention-weight"],
};

describe("learning guide public contracts", () => {
  test("represent canonical guide data without registering a profile", () => {
    expect(canonicalFormula.id).toBe("canonical.encoder-attention");
    expect(canonicalRoute.terminal).toBe(true);
    expect(runtimeFacts.facts[0]?.status).toBe("ready");
    expect(selectedOperation.formulaIds).toEqual([
      "canonical.encoder-attention",
    ]);
    expect(canonicalPage.sections[0]?.primaryNodeId).toBe(
      "canonical.encoder.attention",
    );
    expect(canonicalPage.introduction.map(({ id }) => id)).toEqual([
      "canonical.block.rich-overview",
      "canonical.block.formula",
      "canonical.block.runtime-facts",
      "canonical.block.selected-operation",
    ]);
    expect(
      learningTrackRegistry.registrations.map(({ profile }) => profile.id),
    ).toEqual(["decoder-only-fundamentals"]);
  });
});
