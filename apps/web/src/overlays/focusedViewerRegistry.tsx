import type { ReactElement } from "react";

import { useAppContext } from "../app/AppContext";
import { DiagramViewport } from "../tracks/DiagramViewport";
import { resolveLearningTrack } from "../tracks/registry";
import type { ArchitectureRenderContext } from "../tracks/types";
import { UnsupportedLearningProfile } from "../tracks/UnsupportedLearningProfile";
import { ScoreMatrixVisualizationPane } from "../tracks/visualization/ScoreMatrixVisualizationPane";
import { createScoreMatrixInspectionState } from "../tracks/visualization/scoreMatrixState";
import type {
  ArchitectureViewerRequest,
  FocusedViewerKind,
  FocusedViewerRequest,
  VisualizationViewerRequest,
} from "./focusedViewerTypes";

type FocusedViewerContentProps = Readonly<{
  request: FocusedViewerRequest;
}>;

class FocusedViewerRegistryError extends Error {
  constructor(
    readonly expected: FocusedViewerKind,
    readonly received: FocusedViewerKind,
  ) {
    super(`Focused viewer registry mismatch: ${expected} != ${received}`);
    this.name = "FocusedViewerRegistryError";
  }
}

function UnsupportedViewer(): ReactElement {
  return <p role="alert">이 focused viewer를 현재 모델에서 열 수 없습니다.</p>;
}

function useArchitectureContext(): ArchitectureRenderContext | null {
  const { state, commands } = useAppContext();
  if (state.worker.model === null) return null;
  return {
    model: state.worker.model,
    state: state.architecture,
    replaySequenceLength: state.generation.replaySummary?.tokens.length ?? null,
    replaySummary: state.generation.replaySummary,
    scoreMatrix: state.scoreMatrix,
    inspectScoreMatrix: commands.inspectScoreMatrix,
    navigate: commands.navigateArchitecture,
  };
}

function ArchitectureViewer({
  request,
}: Readonly<{ request: ArchitectureViewerRequest }>): ReactElement {
  const context = useArchitectureContext();
  if (context === null) return <UnsupportedViewer />;
  const resolution = resolveLearningTrack(context.model);
  if (resolution.status === "unsupported")
    return <UnsupportedLearningProfile resolution={resolution} />;
  const presentation = resolution.adapter.renderFocusedArchitecture(context, {
    highlightedNodeIds: request.highlightedNodeIds,
  });
  return (
    <DiagramViewport
      label={`${request.title} 보기`}
      resetKey={`${request.id}:${context.state.view}`}
      {...(presentation.controls === undefined
        ? {}
        : { extraControls: presentation.controls })}
    >
      {presentation.content}
    </DiagramViewport>
  );
}

function VisualizationViewer({
  request,
}: Readonly<{ request: VisualizationViewerRequest }>): ReactElement {
  const { state, commands } = useAppContext();
  return (
    <ScoreMatrixVisualizationPane
      visualizationId={request.visualizationId}
      state={state.scoreMatrix ?? createScoreMatrixInspectionState()}
      replayAvailable={state.generation.replaySummary !== null}
      selectedLayer={state.architecture.selectedLayer}
      selectedHead={state.architecture.selectedHead}
      selectedStep={state.generation.selectedStep}
      onInspect={commands.inspectScoreMatrix}
    />
  );
}

function ArchitectureRegistryEntry({
  request,
}: FocusedViewerContentProps): ReactElement {
  if (request.kind !== "architecture")
    throw new FocusedViewerRegistryError("architecture", request.kind);
  return <ArchitectureViewer request={request} />;
}

function VisualizationRegistryEntry({
  request,
}: FocusedViewerContentProps): ReactElement {
  if (request.kind !== "visualization")
    throw new FocusedViewerRegistryError("visualization", request.kind);
  return <VisualizationViewer request={request} />;
}

const focusedViewerRegistry: Readonly<
  Record<FocusedViewerKind, (props: FocusedViewerContentProps) => ReactElement>
> = {
  architecture: ArchitectureRegistryEntry,
  visualization: VisualizationRegistryEntry,
};

export function FocusedViewerContent({
  request,
}: FocusedViewerContentProps): ReactElement {
  const Renderer = focusedViewerRegistry[request.kind];
  return <Renderer request={request} />;
}
