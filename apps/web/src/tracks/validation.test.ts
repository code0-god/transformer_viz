import { describe, expect, test } from "vitest";
import { decoderOnlyFundamentalsRegistration } from "./decoder-only-fundamentals";
import { createLearningTrackRegistry, learningTrackRegistry } from "./registry";
import {
  type LearningProfileValidationError,
  validateLearningProfile,
} from "./validation";
import { canonicalProfileFixture } from "./validationCanonicalFixture";
import { contentIssueFixtures } from "./validationContentFixtures";
import { edgeIssueFixtures } from "./validationEdgeFixtures";
import {
  requiredIssueFixtures,
  rootPage,
  rootSection,
  routeIssueFixtures,
  withRootPage,
} from "./validationFixtures";

function issueWithCode(
  profile: Parameters<typeof validateLearningProfile>[0],
  code: string,
): unknown {
  return validateLearningProfile(profile).find((issue) => issue.code === code);
}

describe("learning profile structured validation", () => {
  test.each(routeIssueFixtures)(
    "reports exact route/page diagnostics for $name",
    ({ profile, expected }) => {
      expect(validateLearningProfile(profile)).toContainEqual(expected);
    },
  );

  test.each(requiredIssueFixtures)(
    "reports exact required-field diagnostics for $name",
    ({ profile, expected }) => {
      expect(validateLearningProfile(profile)).toContainEqual(expected);
    },
  );

  test.each(contentIssueFixtures)(
    "reports exact content diagnostics for $name",
    (fixture) => {
      const validationProfile =
        "notation" in fixture
          ? { ...fixture.profile, notation: fixture.notation }
          : fixture.profile;
      expect(validateLearningProfile(validationProfile)).toContainEqual(
        fixture.expected,
      );
    },
  );

  test.each(edgeIssueFixtures)(
    "reports exact edge diagnostics for $name",
    ({ profile, expected }) => {
      expect(validateLearningProfile(profile)).toContainEqual(expected);
    },
  );

  test("reports an empty guide page ID", () => {
    const profile = withRootPage({ ...rootPage, id: "" });
    const fixture = {
      ...profile,
      routes: {
        ...profile.routes,
        definitions: profile.routes.definitions.map((route) =>
          route.id === "decoder.root" ? { ...route, guidePageId: "" } : route,
        ),
      },
    };

    expect(validateLearningProfile(fixture)).toContainEqual({
      code: "missing-guide-page-id",
      path: "guide.pages.decoder.root.id",
    });
  });

  test("reports an empty guide section ID", () => {
    const profile = withRootPage({
      ...rootPage,
      sections: [{ ...rootSection, id: "" }],
    });

    expect(validateLearningProfile(profile)).toContainEqual({
      code: "missing-guide-section-id",
      path: "guide.pages.decoder.root.sections[0].id",
    });
  });

  test("reports an empty glossary ID", () => {
    const profile = withRootPage({ ...rootPage, glossary: [""] });
    const fixture = {
      ...profile,
      guide: {
        ...profile.guide,
        glossary: [{ id: "", term: "Term", definition: "Definition" }],
      },
    };

    expect(validateLearningProfile(fixture)).toContainEqual({
      code: "missing-glossary-id",
      path: "guide.glossary[0].id",
    });
  });

  test("reports primary omitted from its associated set", () => {
    const profile = withRootPage({
      ...rootPage,
      sections: [
        {
          ...rootSection,
          primaryNodeId: "decoder.root.final-layer-norm",
          associatedNodeIds: ["decoder.root.transformer-block"],
        },
      ],
    });

    expect(issueWithCode(profile, "primary-not-associated")).toEqual({
      code: "primary-not-associated",
      path: "guide.pages.decoder.root.sections[0].primaryNodeId",
      relatedId: "decoder.root.final-layer-norm",
    });
  });

  test("reports duplicate primary target on the second section", () => {
    const primaryNodeId = "decoder.root.final-layer-norm" as const;
    const profile = withRootPage({
      ...rootPage,
      sections: [
        { ...rootSection, primaryNodeId, associatedNodeIds: [primaryNodeId] },
        {
          ...rootSection,
          id: "duplicate-primary-section",
          primaryNodeId,
          associatedNodeIds: [primaryNodeId],
        },
      ],
    });

    expect(issueWithCode(profile, "duplicate-primary-node")).toEqual({
      code: "duplicate-primary-node",
      path: "guide.pages.decoder.root.sections[1].primaryNodeId",
      relatedId: primaryNodeId,
    });
  });

  test("reports route-filtered mappings and uncovered selectable nodes", () => {
    const profile = withRootPage({
      ...rootPage,
      sections: [
        {
          ...rootSection,
          associatedNodeIds: ["decoder.block.layer-norm-1"],
        },
      ],
    });

    expect(validateLearningProfile(profile)).toEqual(
      expect.arrayContaining([
        {
          code: "associated-node-route-mismatch",
          path: "guide.pages.decoder.root.sections[0].associatedNodeIds[0]",
          relatedId: "decoder.block.layer-norm-1",
        },
        {
          code: "uncovered-selectable-node",
          path: "architecture.nodeMap.decoder.root.final-layer-norm",
          relatedId: "decoder.root.final-layer-norm",
        },
      ]),
    );
  });

  test("validates a profile during registry construction", () => {
    const invalidRegistration = {
      ...decoderOnlyFundamentalsRegistration,
      profile: {
        ...decoderOnlyFundamentalsRegistration.profile,
        guide: {
          ...decoderOnlyFundamentalsRegistration.profile.guide,
          pages: {
            ...decoderOnlyFundamentalsRegistration.profile.guide.pages,
            "decoder.root": { ...rootPage, learningGoal: "" },
          },
        },
      },
    };

    expect(() => createLearningTrackRegistry([invalidRegistration])).toThrow(
      expect.objectContaining<Partial<LearningProfileValidationError>>({
        issues: expect.arrayContaining([
          {
            code: "missing-learning-goal",
            path: "guide.pages.decoder.root.learningGoal",
          },
        ]),
      }),
    );
  });

  test("accepts a canonical profile without registration and static associations", () => {
    expect(validateLearningProfile(canonicalProfileFixture)).toEqual([]);
    expect(
      learningTrackRegistry.registrations.map(({ profile }) => profile.id),
    ).toEqual(["decoder-only-fundamentals"]);
  });
});
