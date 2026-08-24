import { decoderOnlyFundamentalsProfile } from "./decoder-only-fundamentals";
import type {
  GuideBlock,
  LearningGuidePage,
  LearningTrackProfile,
} from "./types";

class ValidationFixtureError extends Error {
  constructor(readonly key: string) {
    super(`Validation fixture is incomplete: ${key}`);
    this.name = "ValidationFixtureError";
  }
}

const rootPageCandidate =
  decoderOnlyFundamentalsProfile.guide.pages["decoder.root"];
if (rootPageCandidate === undefined) {
  throw new ValidationFixtureError("decoder.root");
}
export const rootPage: LearningGuidePage = rootPageCandidate;
const rootSectionCandidate = rootPage.sections[0];
if (rootSectionCandidate === undefined) {
  throw new ValidationFixtureError("root section");
}
export const rootSection = rootSectionCandidate;
const firstRouteCandidate =
  decoderOnlyFundamentalsProfile.routes.definitions[0];
if (firstRouteCandidate === undefined) {
  throw new ValidationFixtureError("first route");
}
const firstRoute = firstRouteCandidate;

function terminalPage({
  nextStep: _nextStep,
  ...page
}: LearningGuidePage): LearningGuidePage {
  return page;
}

function withRootPage(page: LearningGuidePage): LearningTrackProfile {
  return {
    ...decoderOnlyFundamentalsProfile,
    guide: {
      ...decoderOnlyFundamentalsProfile.guide,
      pages: {
        ...decoderOnlyFundamentalsProfile.guide.pages,
        "decoder.root": page,
      },
    },
  };
}

export function rootPageWithBlocks(
  blocks: readonly GuideBlock[],
): LearningGuidePage {
  return {
    ...rootPage,
    sections: [{ ...rootSection, blocks }],
  };
}

export const routeIssueFixtures = [
  {
    name: "duplicate route IDs",
    profile: {
      ...decoderOnlyFundamentalsProfile,
      routes: {
        ...decoderOnlyFundamentalsProfile.routes,
        definitions: [
          ...decoderOnlyFundamentalsProfile.routes.definitions,
          firstRoute,
        ],
      },
    },
    expected: {
      code: "duplicate-route-id",
      path: "routes.definitions[3].id",
      relatedId: "decoder.root",
    },
  },
  {
    name: "unknown initial route",
    profile: {
      ...decoderOnlyFundamentalsProfile,
      routes: {
        ...decoderOnlyFundamentalsProfile.routes,
        initialRouteId: "canonical.missing" as const,
      },
    },
    expected: {
      code: "unknown-initial-route",
      path: "routes.initialRouteId",
      relatedId: "canonical.missing",
    },
  },
  {
    name: "route and guide page ID mismatch",
    profile: {
      ...decoderOnlyFundamentalsProfile,
      routes: {
        ...decoderOnlyFundamentalsProfile.routes,
        definitions: decoderOnlyFundamentalsProfile.routes.definitions.map(
          (route) =>
            route.id === "decoder.root"
              ? { ...route, guidePageId: "decoder-guide-wrong" }
              : route,
        ),
      },
    },
    expected: {
      code: "guide-page-id-mismatch",
      path: "guide.pages.decoder.root.id",
      relatedId: "decoder-guide-wrong",
    },
  },
  {
    name: "page and route mismatch",
    profile: withRootPage({ ...rootPage, routeId: "decoder.block" }),
    expected: {
      code: "guide-page-route-mismatch",
      path: "guide.pages.decoder.root.routeId",
      relatedId: "decoder.block",
    },
  },
] as const;

export const requiredIssueFixtures = [
  {
    name: "learning goal",
    profile: withRootPage({ ...rootPage, learningGoal: "" }),
    expected: {
      code: "missing-learning-goal",
      path: "guide.pages.decoder.root.learningGoal",
    },
  },
  {
    name: "key takeaway",
    profile: withRootPage({ ...rootPage, keyTakeaway: [] }),
    expected: {
      code: "missing-key-takeaway",
      path: "guide.pages.decoder.root.keyTakeaway",
    },
  },
  {
    name: "page glossary",
    profile: withRootPage({ ...rootPage, glossary: [] }),
    expected: {
      code: "missing-page-glossary",
      path: "guide.pages.decoder.root.glossary",
    },
  },
  {
    name: "nonterminal next step",
    profile: withRootPage(terminalPage(rootPage)),
    expected: {
      code: "missing-next-step",
      path: "guide.pages.decoder.root.nextStep",
    },
  },
] as const;

export { withRootPage };
