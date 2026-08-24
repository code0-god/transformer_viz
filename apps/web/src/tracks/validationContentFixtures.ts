import {
  rootPage,
  rootPageWithBlocks,
  withRootPage,
} from "./validationFixtures";

const duplicateContentBlock = rootPage.introduction[0] ?? {
  id: "duplicate-content",
  kind: "paragraph",
  text: "Explanation",
};

export const contentIssueFixtures = [
  {
    name: "stable content IDs",
    profile: withRootPage(
      rootPageWithBlocks([duplicateContentBlock, duplicateContentBlock]),
    ),
    expected: {
      code: "duplicate-content-id",
      path: "guide.pages.decoder.root.sections[0].blocks[1].id",
      relatedId: duplicateContentBlock.id,
    },
  },
  {
    name: "rich inline formula reference",
    profile: withRootPage(
      rootPageWithBlocks([
        {
          id: "rich-formula",
          kind: "rich-paragraph",
          content: [{ kind: "math", formulaId: "attention-summary" }],
        },
      ]),
    ),
    notation: { formulas: {} },
    expected: {
      code: "unknown-formula",
      path: "guide.pages.decoder.root.sections[0].blocks[0].content[0].formulaId",
      relatedId: "attention-summary",
    },
  },
  {
    name: "rich inline term reference",
    profile: withRootPage(
      rootPageWithBlocks([
        {
          id: "rich-term",
          kind: "rich-paragraph",
          content: [{ kind: "term-ref", termId: "missing-term" }],
        },
      ]),
    ),
    expected: {
      code: "unknown-glossary-term",
      path: "guide.pages.decoder.root.sections[0].blocks[0].content[0].termId",
      relatedId: "missing-term",
    },
  },
  {
    name: "runtime adapter reference",
    profile: withRootPage(
      rootPageWithBlocks([
        { id: "runtime", kind: "runtime-facts", adapterId: "missing.runtime" },
      ]),
    ),
    expected: {
      code: "unknown-runtime-adapter",
      path: "guide.pages.decoder.root.sections[0].blocks[0].adapterId",
      relatedId: "missing.runtime",
    },
  },
  {
    name: "operation adapter reference",
    profile: withRootPage(
      rootPageWithBlocks([
        {
          id: "operation",
          kind: "selected-operation",
          adapterId: "missing.operation",
        },
      ]),
    ),
    expected: {
      code: "unknown-operation-adapter",
      path: "guide.pages.decoder.root.sections[0].blocks[0].adapterId",
      relatedId: "missing.operation",
    },
  },
  {
    name: "formula after explanation",
    profile: withRootPage(
      rootPageWithBlocks([
        {
          id: "formula-first",
          kind: "formula",
          formulaId: "attention-summary",
        },
      ]),
    ),
    expected: {
      code: "formula-before-explanation",
      path: "guide.pages.decoder.root.sections[0].blocks[0]",
      relatedId: "attention-summary",
    },
  },
] as const;
