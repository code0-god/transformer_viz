import { type ReactElement, useState } from "react";

import type {
  ScoreMatrixCameraCommand,
  ScoreMatrixSceneProps,
} from "./score-matrix/ScoreMatrixScene";
import {
  ScoreMatrixSelection,
  ScoreMatrixTable,
} from "./score-matrix/ScoreMatrixTable";
import type { ScoreMatrixCellKey } from "./score-matrix/scoreMatrixGeometry";
import type { ScoreMatrixInspectionState } from "./scoreMatrixState";
import { ThreeVisualizationSurface } from "./ThreeVisualizationSurface";
import { resolveVisualizationRenderer } from "./visualizationRegistry";
import type { VisualizationDefinition } from "./visualizationTypes";

type ScoreMatrixRendererData = Omit<
  ScoreMatrixSceneProps,
  "onContextLost" | "onContextRestored" | "reducedMotion"
>;

type ReadyScoreMatrixState = Extract<
  ScoreMatrixInspectionState,
  { readonly status: "ready" }
>;

type ReadyScoreMatrixVisualizationProps = Readonly<{
  definition: VisualizationDefinition;
  state: ReadyScoreMatrixState;
  isWebGLAvailable?: () => boolean;
}>;

export function ReadyScoreMatrixVisualization({
  definition,
  state,
  isWebGLAvailable,
}: ReadyScoreMatrixVisualizationProps): ReactElement {
  const [selectedCellKey, setSelectedCellKey] =
    useState<ScoreMatrixCellKey | null>(null);
  const [cameraCommand, setCameraCommand] =
    useState<ScoreMatrixCameraCommand | null>(null);
  const loadRenderer = resolveVisualizationRenderer(definition);
  if (loadRenderer === null)
    return (
      <p role="alert" data-score-matrix-state="unsupported">
        등록된 renderer가 없습니다.
      </p>
    );

  const nextCommand = (
    kind: ScoreMatrixCameraCommand["kind"],
    direction?: "in" | "out",
  ): void => {
    const id = (cameraCommand?.id ?? 0) + 1;
    setCameraCommand(
      kind === "zoom"
        ? { id, kind, direction: direction ?? "in" }
        : { id, kind: "reset" },
    );
  };
  const rendererProps: ScoreMatrixRendererData = {
    model: state.model,
    selectedCellKey,
    onSelect: setSelectedCellKey,
    cameraCommand,
  };
  return (
    <section className="score-matrix-visualization">
      <header className="score-matrix-visualization__header">
        <div>
          <h3>{definition.title}</h3>
          <p>
            실제 trace · Layer {state.model.layer + 1} · Head{" "}
            {state.model.head + 1} · S = QKᵀ
          </p>
        </div>
        <div
          className="score-matrix-camera-controls"
          role="toolbar"
          aria-label="3D 보기 도구"
        >
          <button type="button" onClick={() => nextCommand("zoom", "out")}>
            축소
          </button>
          <button type="button" onClick={() => nextCommand("zoom", "in")}>
            확대
          </button>
          <button type="button" onClick={() => nextCommand("reset")}>
            시점 초기화
          </button>
        </div>
      </header>
      <ThreeVisualizationSurface<ScoreMatrixRendererData>
        title={definition.title}
        loadRenderer={loadRenderer}
        rendererProps={rendererProps}
        fallback={
          <ScoreMatrixTable
            model={state.model}
            selectedCellKey={selectedCellKey}
            onSelect={setSelectedCellKey}
          />
        }
        {...(isWebGLAvailable === undefined ? {} : { isWebGLAvailable })}
      />
      <ScoreMatrixSelection
        model={state.model}
        selectedCellKey={selectedCellKey}
        className="score-matrix-selection score-matrix-selection--primary"
      />
    </section>
  );
}
