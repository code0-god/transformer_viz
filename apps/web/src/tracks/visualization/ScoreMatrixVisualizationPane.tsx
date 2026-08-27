import type { ReactElement } from "react";

import { ReadyScoreMatrixVisualization } from "./ReadyScoreMatrixVisualization";
import type { ScoreMatrixInspectionState } from "./scoreMatrixState";
import { resolveVisualizationDefinition } from "./visualizationRegistry";
import "./visualization.css";

type ScoreMatrixVisualizationPaneProps = Readonly<{
  visualizationId: string;
  state: ScoreMatrixInspectionState;
  replayAvailable: boolean;
  selectedLayer: number;
  selectedHead: number;
  onInspect: () => void;
  isWebGLAvailable?: () => boolean;
}>;

export function ScoreMatrixVisualizationPane({
  visualizationId,
  state,
  replayAvailable,
  selectedLayer,
  selectedHead,
  onInspect,
  isWebGLAvailable,
}: ScoreMatrixVisualizationPaneProps): ReactElement {
  const definition = resolveVisualizationDefinition(visualizationId);

  if (definition === null)
    return (
      <p role="alert" data-score-matrix-state="unsupported">
        지원하지 않는 시각화입니다.
      </p>
    );
  if (!replayAvailable)
    return (
      <section className="score-matrix-empty" data-score-matrix-state="idle">
        <h3>{definition.title}</h3>
        <p>
          실제 Attention Score를 보려면 모델 실험실에서 텍스트를 생성하고
          generation step을 선택하세요.
        </p>
        <a href="#/lab">모델 실험실에서 trace 준비하기</a>
      </section>
    );

  switch (state.status) {
    case "idle":
      return (
        <section className="score-matrix-empty" data-score-matrix-state="idle">
          <h3>{definition.title}</h3>
          <p>{definition.description}</p>
          <button type="button" onClick={onInspect}>
            Layer {selectedLayer + 1}, Head {selectedHead + 1} Score 불러오기
          </button>
        </section>
      );
    case "loading":
      return (
        <p role="status" data-score-matrix-state="loading">
          실제 Score Matrix를 불러오는 중…
        </p>
      );
    case "error":
      return (
        <section className="score-matrix-empty">
          <p role="alert" data-score-matrix-state="error">
            {state.message}
          </p>
          <button type="button" onClick={onInspect}>
            다시 불러오기
          </button>
        </section>
      );
    case "ready": {
      const provenance = state.provenance;
      return (
        <ReadyScoreMatrixVisualization
          key={`${provenance.requestId}:${provenance.runId}:${provenance.layer}:${provenance.head}`}
          definition={definition}
          state={state}
          {...(isWebGLAvailable === undefined ? {} : { isWebGLAvailable })}
        />
      );
    }
  }
}
