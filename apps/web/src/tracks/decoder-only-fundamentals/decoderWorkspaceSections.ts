import type {
  LearningGuidePage,
  LearningGuideSection,
  LearningNodeId,
} from "../types";

export function guideSectionForNode(
  page: LearningGuidePage,
  nodeId: LearningNodeId,
): LearningGuideSection | undefined {
  return page.sections.find(
    (section) =>
      section.primaryNodeId === nodeId ||
      section.associatedNodeIds?.includes(nodeId) === true,
  );
}

export function guideSectionHighlights(
  section: LearningGuideSection,
): readonly LearningNodeId[] {
  return (
    section.associatedNodeIds ??
    (section.primaryNodeId === undefined ? [] : [section.primaryNodeId])
  );
}
