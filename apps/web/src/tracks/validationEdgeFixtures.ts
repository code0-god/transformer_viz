import { decoderOnlyFundamentalsProfile } from "./decoder-only-fundamentals";
import {
  rootPage,
  rootPageWithBlocks,
  rootSection,
  withRootPage,
} from "./validationFixtures";

class EdgeFixtureError extends Error {
  constructor(readonly key: string) {
    super(`Validation edge fixture is incomplete: ${key}`);
    this.name = "EdgeFixtureError";
  }
}

const attentionPageCandidate =
  decoderOnlyFundamentalsProfile.guide.pages["decoder.self-attention"];
if (attentionPageCandidate === undefined) {
  throw new EdgeFixtureError("decoder.self-attention");
}
const attentionPage = attentionPageCandidate;
const blockPageCandidate =
  decoderOnlyFundamentalsProfile.guide.pages["decoder.block"];
if (blockPageCandidate === undefined) {
  throw new EdgeFixtureError("decoder.block");
}
const blockPage = blockPageCandidate;
const firstGlossaryEntryCandidate =
  decoderOnlyFundamentalsProfile.guide.glossary[0];
if (firstGlossaryEntryCandidate === undefined) {
  throw new EdgeFixtureError("first glossary entry");
}
const firstGlossaryEntry = firstGlossaryEntryCandidate;

const { "decoder.root": _rootPage, ...remainingPages } =
  decoderOnlyFundamentalsProfile.guide.pages;

export const edgeIssueFixtures = [
  {
    name: "missing guide page",
    profile: {
      ...decoderOnlyFundamentalsProfile,
      guide: {
        ...decoderOnlyFundamentalsProfile.guide,
        pages: remainingPages,
      },
    },
    expected: {
      code: "missing-guide-page",
      path: "guide.pages.decoder.root",
      relatedId: "decoder.root",
    },
  },
  {
    name: "duplicate guide page ID",
    profile: {
      ...decoderOnlyFundamentalsProfile,
      guide: {
        ...decoderOnlyFundamentalsProfile.guide,
        pages: {
          ...decoderOnlyFundamentalsProfile.guide.pages,
          "decoder.block": { ...blockPage, id: rootPage.id },
        },
      },
    },
    expected: {
      code: "duplicate-guide-page-id",
      path: "guide.pages.decoder.block.id",
      relatedId: rootPage.id,
    },
  },
  {
    name: "duplicate section ID",
    profile: withRootPage({
      ...rootPage,
      sections: [rootSection, rootSection],
    }),
    expected: {
      code: "duplicate-guide-section-id",
      path: "guide.pages.decoder.root.sections[1].id",
      relatedId: rootSection.id,
    },
  },
  {
    name: "duplicate glossary ID",
    profile: {
      ...decoderOnlyFundamentalsProfile,
      guide: {
        ...decoderOnlyFundamentalsProfile.guide,
        glossary: [
          ...decoderOnlyFundamentalsProfile.guide.glossary,
          firstGlossaryEntry,
        ],
      },
    },
    expected: {
      code: "duplicate-glossary-id",
      path: `guide.glossary[${decoderOnlyFundamentalsProfile.guide.glossary.length}].id`,
      relatedId: "attention-symbol-T",
    },
  },
  {
    name: "missing stable content ID",
    profile: withRootPage(
      rootPageWithBlocks([{ id: "", kind: "paragraph", text: "Explanation" }]),
    ),
    expected: {
      code: "missing-content-id",
      path: "guide.pages.decoder.root.sections[0].blocks[0].id",
    },
  },
  {
    name: "terminal next step",
    profile: {
      ...decoderOnlyFundamentalsProfile,
      guide: {
        ...decoderOnlyFundamentalsProfile.guide,
        pages: {
          ...decoderOnlyFundamentalsProfile.guide.pages,
          "decoder.self-attention": {
            ...attentionPage,
            nextStep: { routeId: "decoder.root" as const, label: "Root" },
          },
        },
      },
    },
    expected: {
      code: "terminal-next-step",
      path: "guide.pages.decoder.self-attention.nextStep",
    },
  },
  {
    name: "unknown next step route",
    profile: withRootPage({
      ...rootPage,
      nextStep: { routeId: "canonical.missing", label: "Missing" },
    }),
    expected: {
      code: "unknown-next-step-route",
      path: "guide.pages.decoder.root.nextStep.routeId",
      relatedId: "canonical.missing",
    },
  },
  {
    name: "unknown outline section",
    profile: withRootPage({
      ...rootPage,
      outlineSectionIds: ["missing-section"],
    }),
    expected: {
      code: "unknown-outline-section",
      path: "guide.pages.decoder.root.outlineSectionIds[0]",
      relatedId: "missing-section",
    },
  },
  {
    name: "unknown associated node",
    profile: withRootPage({
      ...rootPage,
      sections: [
        {
          ...rootSection,
          associatedNodeIds: ["canonical.missing"],
        },
      ],
    }),
    expected: {
      code: "unknown-associated-node",
      path: "guide.pages.decoder.root.sections[0].associatedNodeIds[0]",
      relatedId: "canonical.missing",
    },
  },
  {
    name: "unknown primary node",
    profile: withRootPage({
      ...rootPage,
      sections: [
        {
          ...rootSection,
          primaryNodeId: "canonical.missing",
          associatedNodeIds: ["canonical.missing"],
        },
      ],
    }),
    expected: {
      code: "unknown-primary-node",
      path: "guide.pages.decoder.root.sections[0].primaryNodeId",
      relatedId: "canonical.missing",
    },
  },
  {
    name: "static primary node",
    profile: withRootPage({
      ...rootPage,
      sections: [
        {
          ...rootSection,
          primaryNodeId: "decoder.root.embedding-add",
          associatedNodeIds: ["decoder.root.embedding-add"],
        },
      ],
    }),
    expected: {
      code: "primary-node-not-interactive",
      path: "guide.pages.decoder.root.sections[0].primaryNodeId",
      relatedId: "decoder.root.embedding-add",
    },
  },
] as const;
