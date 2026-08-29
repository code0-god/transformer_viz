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
  selectedStep?: number | null;
  viewMode: "3d" | "2d";
  onViewModeChange: (mode: "3d" | "2d") => void;
  isWebGLAvailable?: () => boolean;
}>;

function axisStops(
  labels: readonly string[],
): readonly Readonly<{ index: number; label: string }>[] {
  const stride = labels.length <= 8 ? 1 : Math.ceil(labels.length / 6);
  const stops = labels.flatMap((label, index) =>
    index % stride === 0 ? [{ index, label }] : [],
  );
  const lastIndex = labels.length - 1;
  return stops.at(-1)?.index === lastIndex || labels[lastIndex] === undefined
    ? stops
    : [...stops, { index: lastIndex, label: labels[lastIndex] }];
}

export function ReadyScoreMatrixVisualization({
  definition,
  state,
  selectedStep = null,
  viewMode,
  onViewModeChange,
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
    <section
      className="score-matrix-visualization"
      data-threeui-surface="score-matrix"
      data-score-matrix-mode={viewMode}
    >
      <header className="score-matrix-visualization__header">
        <div className="score-matrix-visualization__context">
          <p>
            Layer {state.model.layer + 1} · Head {state.model.head + 1} · Step{" "}
            {selectedStep === null ? "선택 전" : selectedStep + 1}
          </p>
          <small>Actual trace · S = QKᵀ</small>
        </div>
        <div className="score-matrix-visualization__tools">
          <fieldset className="score-matrix-view-switch">
            <legend className="score-matrix-visually-hidden">
              Score Matrix 표현 방식
            </legend>
            <button
              type="button"
              aria-pressed={viewMode === "3d"}
              onClick={() => onViewModeChange("3d")}
            >
              3D Surface
            </button>
            <button
              type="button"
              aria-pressed={viewMode === "2d"}
              onClick={() => onViewModeChange("2d")}
            >
              2D Matrix
            </button>
          </fieldset>
          {viewMode === "3d" ? (
            <div
              className="score-matrix-camera-controls"
              role="toolbar"
              aria-label="3D 보기 도구"
              data-threeui-surface="score-matrix-controls"
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
          ) : null}
        </div>
      </header>
      <div className="score-matrix-stage" data-score-matrix-mode={viewMode}>
        <div
          className="score-matrix-mode-panel"
          data-mode="3d"
          hidden={viewMode !== "3d"}
        >
          <ThreeVisualizationSurface<ScoreMatrixRendererData>
            title={definition.title}
            loadRenderer={loadRenderer}
            rendererProps={rendererProps}
            fallback={
              <ScoreMatrixTable
                model={state.model}
                selectedCellKey={selectedCellKey}
                onSelect={setSelectedCellKey}
                showSelectionSummary={false}
              />
            }
            {...(isWebGLAvailable === undefined ? {} : { isWebGLAvailable })}
          />
        </div>
        <div
          className="score-matrix-mode-panel score-matrix-table-mode"
          data-mode="2d"
          hidden={viewMode !== "2d"}
        >
          <ScoreMatrixTable
            model={state.model}
            selectedCellKey={selectedCellKey}
            onSelect={setSelectedCellKey}
            showSelectionSummary={false}
          />
        </div>
        {viewMode === "3d" ? (
          <p className="score-matrix-zero-plane">
            <span aria-hidden="true" />0 plane · positive above · negative below
          </p>
        ) : null}
        <div className="score-matrix-axes">
          <section aria-label="Query axis">
            <strong>Query axis</strong>
            <ul>
              {axisStops(state.model.queryTokenLabels).map(
                ({ index, label }) => (
                  <li key={`query-${index}`}>
                    q{index} · {JSON.stringify(label)}
                  </li>
                ),
              )}
            </ul>
          </section>
          <section aria-label="Key axis">
            <strong>Key axis</strong>
            <ul>
              {axisStops(state.model.keyTokenLabels).map(({ index, label }) => (
                <li key={`key-${index}`}>
                  k{index} · {JSON.stringify(label)}
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>
      <ScoreMatrixSelection
        model={state.model}
        selectedCellKey={selectedCellKey}
        className="score-matrix-selection score-matrix-selection--primary"
      />
    </section>
  );
}
