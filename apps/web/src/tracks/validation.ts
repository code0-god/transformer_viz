import type {
  GuideBlock,
  LearningGuidePage,
  LearningTrackProfile,
} from "./types";

export type LearningProfileIssue =
  | "duplicate-guide-page-id"
  | "duplicate-guide-section-id"
  | "missing-guide-page"
  | "unknown-associated-node"
  | "unknown-formula"
  | "unknown-glossary-term";

function blockIssues(
  block: GuideBlock,
  profile: LearningTrackProfile,
): readonly LearningProfileIssue[] {
  if (
    block.kind === "formula" &&
    profile.notation.formulas[block.formulaId] === undefined
  ) {
    return ["unknown-formula"];
  }
  if (
    block.kind === "term" &&
    !profile.guide.glossary.some(({ id }) => id === block.termId)
  ) {
    return ["unknown-glossary-term"];
  }
  return [];
}

function pageIssues(
  page: LearningGuidePage,
  profile: LearningTrackProfile,
): readonly LearningProfileIssue[] {
  const issues: LearningProfileIssue[] = [];
  const sectionIds = new Set<string>();
  for (const section of page.sections) {
    if (sectionIds.has(section.id)) issues.push("duplicate-guide-section-id");
    sectionIds.add(section.id);
    for (const nodeId of section.associatedNodeIds ?? []) {
      if (profile.architecture.nodeMap[nodeId] === undefined) {
        issues.push("unknown-associated-node");
      }
    }
    for (const block of section.blocks) {
      issues.push(...blockIssues(block, profile));
    }
  }
  for (const block of [...page.introduction, ...page.keyTakeaway]) {
    issues.push(...blockIssues(block, profile));
  }
  for (const termId of page.glossary) {
    if (!profile.guide.glossary.some(({ id }) => id === termId)) {
      issues.push("unknown-glossary-term");
    }
  }
  return issues;
}

export function validateLearningProfile(
  profile: LearningTrackProfile,
): readonly LearningProfileIssue[] {
  const issues: LearningProfileIssue[] = [];
  const pageIds = new Set<string>();
  const pages = Object.values(profile.guide.pages);
  for (const page of pages) {
    if (page === undefined) continue;
    if (pageIds.has(page.id)) issues.push("duplicate-guide-page-id");
    pageIds.add(page.id);
    issues.push(...pageIssues(page, profile));
  }
  for (const route of profile.routes.definitions) {
    if (profile.guide.pages[route.id] === undefined) {
      issues.push("missing-guide-page");
    }
  }
  return issues;
}
