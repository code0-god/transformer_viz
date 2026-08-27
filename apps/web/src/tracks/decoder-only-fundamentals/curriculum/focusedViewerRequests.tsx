import type { ComponentType } from "react";

import type { ArchitectureView } from "../../../architecture/state";
import type { FocusedViewerRequest } from "../../../overlays/focusedViewerTypes";
import type { LearningWorkspaceViewer } from "../../LearningWorkspace";
import type {
  LearningGuideSection,
  LearningTrackId,
  LearningTrackProfile,
} from "../../types";
import type { CurriculumDiagramRendererProps } from "./curriculumRendererRegistry";
import type { ChapterId, DiagramId } from "./types";

export type CurriculumViewerContext = Readonly<{
  chapterId: ChapterId;
  title: string;
  learningGoal: string;
  pageId: string;
  trackId: LearningTrackId;
  diagramId: DiagramId;
  Diagram: ComponentType<CurriculumDiagramRendererProps>;
  profile: LearningTrackProfile;
}>;

type CurriculumVisualizationContext = Readonly<{
  chapterId: ChapterId;
  title: string;
  visualizationId: string;
  layer: number;
  head: number;
}>;

function architectureViewForDiagram(
  diagramId: DiagramId,
): ArchitectureView | null {
  switch (diagramId) {
    case "root":
    case "transformer-block":
    case "self-attention":
      return diagramId;
    default:
      return null;
  }
}

export function curriculumDiagramActionLabel(
  title: string,
  diagramId: DiagramId,
): string {
  switch (diagramId) {
    case "root":
      return "GPT 전체 구조 보기";
    case "transformer-block":
      return "Transformer Block 내부 보기";
    case "self-attention":
      return "Self-Attention 계산 흐름 보기";
    default:
      return `${title} 도식 크게 보기`;
  }
}

export function createCurriculumViewerRequest(
  context: CurriculumViewerContext,
  section?: LearningGuideSection<string>,
): FocusedViewerRequest {
  const articleTargetId =
    section === undefined ? undefined : `${context.pageId}-${section.id}-title`;
  const description = section?.title ?? context.learningGoal;
  const architectureView = architectureViewForDiagram(context.diagramId);
  if (architectureView !== null) {
    const learningNodeIds =
      section === undefined
        ? []
        : [
            ...(section.primaryNodeId === undefined
              ? []
              : [section.primaryNodeId]),
            ...(section.associatedNodeIds ?? []),
          ];
    return {
      id: `${context.chapterId}:architecture:${section?.id ?? "overview"}`,
      kind: "architecture",
      source: "learn",
      title: `${context.title} 전체 구조`,
      description,
      view: architectureView,
      highlightedNodeIds: learningNodeIds.flatMap((learningNodeId) => {
        const nodeId = context.profile.architecture.nodeMap[learningNodeId];
        return nodeId === undefined ? [] : [nodeId];
      }),
      ...(section === undefined ? {} : { conceptId: section.id }),
      ...(articleTargetId === undefined ? {} : { articleTargetId }),
    };
  }
  const Diagram = context.Diagram;
  return {
    id: `${context.chapterId}:diagram:${section?.id ?? context.diagramId}`,
    kind: "diagram",
    source: "learn",
    title: `${context.title} 전체 흐름`,
    description,
    trackId: context.trackId,
    diagramId: context.diagramId,
    resetKey: `${context.chapterId}:${section?.id ?? "overview"}`,
    renderDiagram: () => <Diagram />,
    ...(section === undefined ? {} : { conceptId: section.id }),
    ...(articleTargetId === undefined ? {} : { articleTargetId }),
  };
}

export function createCurriculumVisualizationViewer({
  chapterId,
  title,
  visualizationId,
  layer,
  head,
}: CurriculumVisualizationContext): LearningWorkspaceViewer {
  return {
    label: `${title} Visualization`,
    actionLabel: "실제 Score Matrix 확인하기",
    request: {
      id: `${chapterId}:visualization:${visualizationId}`,
      kind: "visualization",
      source: "learn",
      title: "Attention Score Matrix",
      description: "선택한 generation step의 실제 Query·Key 내적 점수입니다.",
      visualizationId,
      layer,
      head,
    },
  };
}
