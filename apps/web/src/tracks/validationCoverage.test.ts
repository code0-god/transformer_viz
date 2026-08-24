import { describe, expect, test } from "vitest";
import { validateLearningProfile } from "./validation";
import { rootPage, withRootPage } from "./validationFixtures";

describe("learning profile route-transition exemptions", () => {
  test("a declared exemption suppresses only its exact drill-down node", () => {
    const profile = withRootPage({
      ...rootPage,
      sections: rootPage.sections.map((section) => ({
        ...section,
        associatedNodeIds: (section.associatedNodeIds ?? []).filter(
          (nodeId) =>
            nodeId !== "decoder.root.transformer-block" &&
            nodeId !== "decoder.root.final-layer-norm",
        ),
      })),
    });
    const fixture = {
      ...profile,
      routes: {
        ...profile.routes,
        definitions: profile.routes.definitions.map((route) =>
          route.id === "decoder.root"
            ? {
                ...route,
                guideCoverageExemptNodeIds: [
                  "decoder.root.transformer-block" as const,
                ],
              }
            : route,
        ),
      },
    };

    expect(validateLearningProfile(fixture)).toEqual(
      expect.arrayContaining([
        {
          code: "uncovered-interactive-node",
          path: "architecture.nodeMap.decoder.root.final-layer-norm",
          relatedId: "decoder.root.final-layer-norm",
        },
      ]),
    );
    expect(
      validateLearningProfile(fixture).filter(
        ({ relatedId }) => relatedId === "decoder.root.transformer-block",
      ),
    ).toEqual([]);
  });

  test("a duplicate valid exemption is invalid at its duplicate index", () => {
    const profile = withRootPage({
      ...rootPage,
      sections: rootPage.sections.map((section) => ({
        ...section,
        associatedNodeIds: (section.associatedNodeIds ?? []).filter(
          (nodeId) =>
            nodeId !== "decoder.root.transformer-block" &&
            nodeId !== "decoder.root.final-layer-norm",
        ),
      })),
    });
    const fixture = {
      ...profile,
      routes: {
        ...profile.routes,
        definitions: profile.routes.definitions.map((route) =>
          route.id === "decoder.root"
            ? {
                ...route,
                guideCoverageExemptNodeIds: [
                  "decoder.root.transformer-block" as const,
                  "decoder.root.transformer-block" as const,
                ],
              }
            : route,
        ),
      },
    };
    const issues = validateLearningProfile(fixture);

    expect(
      issues.filter(
        ({ relatedId }) => relatedId === "decoder.root.transformer-block",
      ),
    ).toEqual([
      {
        code: "invalid-route-transition-exemption",
        path: "routes.definitions[0].guideCoverageExemptNodeIds[1]",
        relatedId: "decoder.root.transformer-block",
      },
    ]);
    expect(issues).toContainEqual({
      code: "uncovered-interactive-node",
      path: "architecture.nodeMap.decoder.root.final-layer-norm",
      relatedId: "decoder.root.final-layer-norm",
    });
  });

  test("a selectable-node exemption is invalid and remains uncovered", () => {
    const profile = withRootPage({
      ...rootPage,
      sections: rootPage.sections.map((section) => ({
        ...section,
        associatedNodeIds: (section.associatedNodeIds ?? []).filter(
          (nodeId) => nodeId !== "decoder.root.final-layer-norm",
        ),
      })),
    });
    const fixture = {
      ...profile,
      routes: {
        ...profile.routes,
        definitions: profile.routes.definitions.map((route) =>
          route.id === "decoder.root"
            ? {
                ...route,
                guideCoverageExemptNodeIds: [
                  "decoder.root.final-layer-norm" as const,
                ],
              }
            : route,
        ),
      },
    };

    expect(validateLearningProfile(fixture)).toEqual(
      expect.arrayContaining([
        {
          code: "invalid-route-transition-exemption",
          path: "routes.definitions[0].guideCoverageExemptNodeIds[0]",
          relatedId: "decoder.root.final-layer-norm",
        },
        {
          code: "uncovered-interactive-node",
          path: "architecture.nodeMap.decoder.root.final-layer-norm",
          relatedId: "decoder.root.final-layer-norm",
        },
      ]),
    );
  });

  test("an unknown exemption remains an exact error", () => {
    const profile = withRootPage({
      ...rootPage,
      sections: rootPage.sections.map((section) => ({
        ...section,
        associatedNodeIds: (section.associatedNodeIds ?? []).filter(
          (nodeId) => nodeId !== "decoder.root.transformer-block",
        ),
      })),
    });
    const fixture = {
      ...profile,
      routes: {
        ...profile.routes,
        definitions: profile.routes.definitions.map((route) =>
          route.id === "decoder.root"
            ? {
                ...route,
                guideCoverageExemptNodeIds: ["canonical.missing" as const],
              }
            : route,
        ),
      },
    };

    expect(validateLearningProfile(fixture)).toEqual(
      expect.arrayContaining([
        {
          code: "unknown-route-transition-exemption",
          path: "routes.definitions[0].guideCoverageExemptNodeIds[0]",
          relatedId: "canonical.missing",
        },
        {
          code: "uncovered-interactive-node",
          path: "architecture.nodeMap.decoder.root.transformer-block",
          relatedId: "decoder.root.transformer-block",
        },
      ]),
    );
  });
});
