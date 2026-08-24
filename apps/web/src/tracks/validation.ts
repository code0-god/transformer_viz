import type { LearningGuidePage } from "./guideTypes";
import { createContentScan, scanGuideBlock } from "./validationContent";
import { mappingIssues } from "./validationMappings";
import type {
  LearningProfileIssue,
  LearningProfileValidationInput,
  ValidationContext,
} from "./validationTypes";

export type {
  LearningProfileIssue,
  LearningProfileIssueCode,
  LearningProfileValidationInput,
} from "./validationTypes";

export class LearningProfileValidationError extends Error {
  constructor(readonly issues: readonly LearningProfileIssue[]) {
    super(`Learning profile validation failed with ${issues.length} issues`);
    this.name = "LearningProfileValidationError";
  }
}

function pageIssues<Id extends string>(
  page: LearningGuidePage<Id>,
  pagePath: string,
  context: ValidationContext<Id>,
): readonly LearningProfileIssue[] {
  const issues: LearningProfileIssue[] = [];
  if (page.learningGoal.trim() === "") {
    issues.push({
      code: "missing-learning-goal",
      path: `${pagePath}.learningGoal`,
    });
  }
  if (page.keyTakeaway.length === 0) {
    issues.push({
      code: "missing-key-takeaway",
      path: `${pagePath}.keyTakeaway`,
    });
  }
  if (page.glossary.length === 0) {
    issues.push({
      code: "missing-page-glossary",
      path: `${pagePath}.glossary`,
    });
  }

  const route = context.profile.routes.definitions.find(
    ({ id }) => id === page.routeId,
  );
  if (route?.terminal === false && page.nextStep === undefined) {
    issues.push({ code: "missing-next-step", path: `${pagePath}.nextStep` });
  }
  if (route?.terminal === true && page.nextStep !== undefined) {
    issues.push({ code: "terminal-next-step", path: `${pagePath}.nextStep` });
  }
  const nextStep = page.nextStep;
  if (
    nextStep !== undefined &&
    !context.profile.routes.definitions.some(
      ({ id }) => id === nextStep.routeId,
    )
  ) {
    issues.push({
      code: "unknown-next-step-route",
      path: `${pagePath}.nextStep.routeId`,
      relatedId: nextStep.routeId,
    });
  }

  const sectionIds = new Set<string>();
  page.sections.forEach((section, index) => {
    const path = `${pagePath}.sections[${index}].id`;
    if (section.id.trim() === "") {
      issues.push({ code: "missing-guide-section-id", path });
    }
    if (sectionIds.has(section.id)) {
      issues.push({
        code: "duplicate-guide-section-id",
        path,
        relatedId: section.id,
      });
    }
    sectionIds.add(section.id);
  });
  page.outlineSectionIds?.forEach((sectionId, index) => {
    if (!sectionIds.has(sectionId)) {
      issues.push({
        code: "unknown-outline-section",
        path: `${pagePath}.outlineSectionIds[${index}]`,
        relatedId: sectionId,
      });
    }
  });
  page.glossary.forEach((termId, index) => {
    if (!context.glossaryIds.has(termId)) {
      issues.push({
        code: "unknown-glossary-term",
        path: `${pagePath}.glossary[${index}]`,
        relatedId: termId,
      });
    }
  });

  const scan = createContentScan(context);
  page.introduction.forEach((block, index) => {
    scanGuideBlock(block, `${pagePath}.introduction[${index}]`, scan);
  });
  page.sections.forEach((section, sectionIndex) => {
    section.blocks.forEach((block, blockIndex) => {
      scanGuideBlock(
        block,
        `${pagePath}.sections[${sectionIndex}].blocks[${blockIndex}]`,
        scan,
      );
    });
  });
  page.keyTakeaway.forEach((block, index) => {
    scanGuideBlock(block, `${pagePath}.keyTakeaway[${index}]`, scan);
  });
  issues.push(...scan.issues);
  issues.push(...mappingIssues({ page, pagePath, profile: context.profile }));
  return issues;
}

export function validateLearningProfile<Id extends string>(
  profile: LearningProfileValidationInput<Id>,
): readonly LearningProfileIssue[] {
  const issues: LearningProfileIssue[] = [];
  const routeIds = new Set<string>();
  profile.routes.definitions.forEach((route, index) => {
    if (routeIds.has(route.id)) {
      issues.push({
        code: "duplicate-route-id",
        path: `routes.definitions[${index}].id`,
        relatedId: route.id,
      });
    }
    routeIds.add(route.id);
  });
  if (!routeIds.has(profile.routes.initialRouteId)) {
    issues.push({
      code: "unknown-initial-route",
      path: "routes.initialRouteId",
      relatedId: profile.routes.initialRouteId,
    });
  }

  const glossaryIds = new Set<string>();
  profile.guide.glossary.forEach((entry, index) => {
    if (entry.id.trim() === "") {
      issues.push({
        code: "missing-glossary-id",
        path: `guide.glossary[${index}].id`,
      });
    }
    if (glossaryIds.has(entry.id)) {
      issues.push({
        code: "duplicate-glossary-id",
        path: `guide.glossary[${index}].id`,
        relatedId: entry.id,
      });
    }
    glossaryIds.add(entry.id);
  });
  const context: ValidationContext<Id> = {
    profile,
    glossaryIds,
    runtimeAdapterIds: new Set(profile.guide.runtimeAdapterIds ?? []),
    operationAdapterIds: new Set(profile.guide.operationAdapterIds ?? []),
  };

  const pageIds = new Set<string>();
  for (const [routeKey, page] of Object.entries(profile.guide.pages)) {
    if (page === undefined) continue;
    const pagePath = `guide.pages.${routeKey}`;
    if (page.id.trim() === "") {
      issues.push({ code: "missing-guide-page-id", path: `${pagePath}.id` });
    }
    if (pageIds.has(page.id)) {
      issues.push({
        code: "duplicate-guide-page-id",
        path: `${pagePath}.id`,
        relatedId: page.id,
      });
    }
    pageIds.add(page.id);
    if (page.routeId !== routeKey) {
      issues.push({
        code: "guide-page-route-mismatch",
        path: `${pagePath}.routeId`,
        relatedId: page.routeId,
      });
    }
    const route = profile.routes.definitions.find(({ id }) => id === routeKey);
    if (route !== undefined && route.guidePageId !== page.id) {
      issues.push({
        code: "guide-page-id-mismatch",
        path: `${pagePath}.id`,
        relatedId: route.guidePageId,
      });
    }
    issues.push(...pageIssues(page, pagePath, context));
  }
  for (const route of profile.routes.definitions) {
    if (profile.guide.pages[route.id] === undefined) {
      issues.push({
        code: "missing-guide-page",
        path: `guide.pages.${route.id}`,
        relatedId: route.id,
      });
    }
  }
  return issues;
}
