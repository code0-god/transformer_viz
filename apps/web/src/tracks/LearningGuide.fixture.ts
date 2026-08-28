import type { FormulaDefinition } from "../math/formulaCatalog";
import type {
  GlossaryEntry,
  LearningGuidePage,
  RuntimeFactsPresentation,
  SelectedOperationPresentation,
} from "./types";

export type FixtureFormulaId = "fixture.inline" | "fixture.block";

export const formulas: Readonly<
  Record<FixtureFormulaId, FormulaDefinition<FixtureFormulaId>>
> = {
  "fixture.inline": {
    id: "fixture.inline",
    tex: "x + y",
    plainText: "x + y",
    accessibleLabel: "INLINE_FORMULA",
  },
  "fixture.block": {
    id: "fixture.block",
    tex: "z = x + y",
    plainText: "z = x + y",
    accessibleLabel: "BLOCK_FORMULA",
  },
};

export const glossary: readonly GlossaryEntry[] = [
  {
    id: "fixture-term",
    term: "TERM_SENTINEL",
    definition: "DEFINITION_SENTINEL",
  },
];

export const runtimeFacts: Readonly<Record<string, RuntimeFactsPresentation>> =
  {
    "fixture-runtime": {
      id: "fixture-runtime-presentation",
      title: "RUNTIME_TITLE",
      facts: [
        {
          id: "fixture-ready-fact",
          label: "READY_LABEL",
          value: "READY_VALUE",
          status: "ready",
          detail: "READY_DETAIL",
        },
        {
          id: "fixture-pending-fact",
          label: "PENDING_LABEL",
          value: "PENDING_VALUE",
          status: "pending",
        },
      ],
    },
  };

export const selectedOperations: Readonly<
  Record<string, SelectedOperationPresentation>
> = {
  "fixture-operation": {
    id: "fixture-operation-presentation",
    title: "OPERATION_TITLE",
    summary: "OPERATION_SUMMARY",
    formulaIds: ["fixture.block"],
    facts: runtimeFacts["fixture-runtime"]?.facts ?? [],
  },
};

export const page: LearningGuidePage<FixtureFormulaId> = {
  id: "fixture-guide",
  routeId: "canonical.fixture",
  title: "PAGE_TITLE",
  learningGoal: "GOAL_SENTINEL",
  outline: "visible",
  introduction: [
    { id: "intro-paragraph", kind: "paragraph", text: "INTRO_SENTINEL" },
    {
      id: "intro-rich",
      kind: "rich-paragraph",
      content: [
        { kind: "text", text: "RICH_TEXT" },
        { kind: "strong", text: "RICH_STRONG" },
        { kind: "math", formulaId: "fixture.inline" },
        { kind: "term-ref", termId: "fixture-term", label: "TERM_REFERENCE" },
        { kind: "code", code: "CODE_SENTINEL" },
      ],
    },
  ],
  sections: [
    {
      id: "fixture-section-one",
      title: "SECTION_ONE",
      primaryNodeId: "canonical.node-one",
      associatedNodeIds: ["canonical.node-one", "canonical.node-shared"],
      blocks: [
        {
          id: "fixture-bullets",
          kind: "bullets",
          items: [
            { id: "bullet-one", title: "BULLET_TITLE", text: "BULLET_TEXT" },
          ],
        },
        {
          id: "fixture-steps",
          kind: "steps",
          items: [
            {
              id: "step-one",
              title: "STEP_TITLE",
              explanation: "STEP_TEXT",
            },
          ],
        },
        {
          id: "fixture-formula",
          kind: "formula",
          formulaId: "fixture.block",
          explanation: "FORMULA_EXPLANATION",
        },
        {
          id: "fixture-callout",
          kind: "callout",
          tone: "important",
          title: "CALLOUT_TITLE",
          text: "CALLOUT_TEXT",
        },
        {
          id: "fixture-comparison",
          kind: "comparison",
          columns: [
            { id: "column-one", title: "COLUMN_ONE", items: ["COLUMN_ITEM"] },
          ],
        },
        {
          id: "fixture-example",
          kind: "example",
          title: "EXAMPLE_TITLE",
          lines: ["EXAMPLE_LINE"],
        },
        { id: "fixture-term-block", kind: "term", termId: "fixture-term" },
        {
          id: "fixture-runtime-block",
          kind: "runtime-facts",
          adapterId: "fixture-runtime",
        },
        {
          id: "fixture-operation-block",
          kind: "selected-operation",
          adapterId: "fixture-operation",
        },
        {
          id: "fixture-implementation-note",
          kind: "implementation-note",
          items: ["IMPLEMENTATION_NOTE_SENTINEL"],
        },
      ],
    },
    {
      id: "fixture-section-two",
      title: "SECTION_TWO",
      primaryNodeId: "canonical.node-two",
      associatedNodeIds: ["canonical.node-two"],
      blocks: [],
    },
  ],
  outlineSectionIds: ["fixture-section-two", "fixture-section-one"],
  keyTakeaway: [
    { id: "takeaway", kind: "paragraph", text: "TAKEAWAY_SENTINEL" },
  ],
  glossary: ["fixture-term"],
  nextStep: { routeId: "canonical.next", label: "NEXT_STEP_LABEL" },
};
