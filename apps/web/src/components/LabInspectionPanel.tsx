import type { ReactElement } from "react";

import { useAppContext } from "../app/AppContext";
import type { ArchitectureView } from "../architecture/state";
import { useFocusedViewer } from "../overlays/focusedViewerStore";
import { SCORE_MATRIX_VISUALIZATION_ID } from "../tracks/visualization/visualizationRegistry";
import "./LabInspectionPanel.css";

const VIEWER_TITLES: Readonly<Record<ArchitectureView, string>> = {
  root: "GPT 전체 모델 구조",
  "transformer-block": "현재 Transformer Block",
  "self-attention": "Self-Attention 계산 흐름",
};

export function LabInspectionPanel(): ReactElement {
  const { state, commands } = useAppContext();
  const { openViewer } = useFocusedViewer();
  const model = state.worker.model;

  const openArchitecture = (view: ArchitectureView): void => {
    if (model === null) return;
    switch (view) {
      case "root":
        commands.navigateArchitecture({
          type: "navigate-breadcrumb",
          view,
          layerCount: model.config.n_layer,
        });
        break;
      case "transformer-block":
        commands.navigateArchitecture({
          type: "activate-node",
          nodeId: "transformer-block",
          layerCount: model.config.n_layer,
          headCount: model.config.n_head,
        });
        break;
      case "self-attention":
        commands.navigateArchitecture({
          type: "activate-node",
          nodeId: "self-attention",
          layerCount: model.config.n_layer,
          headCount: model.config.n_head,
        });
        break;
    }
    openViewer({
      id: `lab:architecture:${view}`,
      kind: "architecture",
      source: "lab",
      title: VIEWER_TITLES[view],
      description: "현재 모델과 선택된 Layer·Head 기준으로 구조를 검사합니다.",
      view,
      highlightedNodeIds: [],
    });
  };

  const openScoreMatrix = (): void => {
    openViewer({
      id: "lab:visualization:score-matrix",
      kind: "visualization",
      source: "lab",
      title: "Attention Score Matrix",
      description: "선택한 generation step의 실제 Query·Key 내적 점수입니다.",
      visualizationId: SCORE_MATRIX_VISUALIZATION_ID,
      layer: state.architecture.selectedLayer,
      head: state.architecture.selectedHead,
    });
  };

  return (
    <section className="lab-inspection" aria-labelledby="lab-inspection-title">
      <header>
        <div>
          <h2 id="lab-inspection-title">현재 실행 검사</h2>
          <p>
            Layer {state.architecture.selectedLayer + 1} · Head{" "}
            {state.architecture.selectedHead + 1} · Step{" "}
            {state.generation.selectedStep === null
              ? "선택 전"
              : state.generation.selectedStep + 1}
          </p>
        </div>
      </header>
      <div className="lab-inspection__actions">
        <button
          type="button"
          data-testid="lab-open-architecture-root"
          disabled={model === null}
          onClick={() => openArchitecture("root")}
        >
          전체 모델 구조 보기
        </button>
        <button
          type="button"
          disabled={model === null}
          onClick={() => openArchitecture("transformer-block")}
        >
          현재 Transformer Block 보기
        </button>
        <button
          type="button"
          disabled={model === null}
          onClick={() => openArchitecture("self-attention")}
        >
          Self-Attention 보기
        </button>
        <button type="button" onClick={openScoreMatrix}>
          실제 Score Matrix 확인하기
        </button>
      </div>
    </section>
  );
}
