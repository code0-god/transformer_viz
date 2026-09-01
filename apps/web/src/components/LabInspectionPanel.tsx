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

function InspectionArrow(): ReactElement {
  return (
    <svg
      className="lab-inspection__arrow"
      viewBox="0 0 16 16"
      aria-hidden="true"
    >
      <path d="M3 8h9M8.5 4.5 12 8l-3.5 3.5" />
    </svg>
  );
}

export function LabInspectionPanel(): ReactElement {
  const { state, commands } = useAppContext();
  const { openViewer } = useFocusedViewer();
  const model = state.worker.model;
  const scoreAvailable =
    state.generation.selectedStep !== null &&
    state.generation.replaySummary !== null;

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
    <section
      className="lab-inspection"
      aria-labelledby="lab-inspection-title"
      data-threeui-surface="inspection-launchers"
    >
      <header>
        <div>
          <h2 id="lab-inspection-title">Inspect</h2>
          <p>
            Layer {state.architecture.selectedLayer + 1} · Head{" "}
            {state.architecture.selectedHead + 1} · Step{" "}
            {state.generation.selectedStep === null
              ? "선택 전"
              : state.generation.selectedStep + 1}
          </p>
        </div>
      </header>
      <div className="lab-inspection__launcher">
        <button
          type="button"
          data-testid="lab-open-architecture-root"
          data-inspection-kind="model"
          disabled={model === null}
          onClick={() => openArchitecture("root")}
        >
          <span className="lab-inspection__index" aria-hidden="true">
            01
          </span>
          <span className="lab-inspection__copy">
            <strong>Model</strong> <span>전체 구조</span>
          </span>{" "}
          <span className="lab-inspection__context">
            {model === null
              ? "Unavailable"
              : `${model.config.n_layer} blocks · ${model.config.n_head} heads`}
          </span>
          <InspectionArrow />
        </button>
        <button
          type="button"
          data-inspection-kind="block"
          disabled={model === null}
          onClick={() => openArchitecture("transformer-block")}
        >
          <span className="lab-inspection__index" aria-hidden="true">
            02
          </span>
          <span className="lab-inspection__copy">
            <strong>Block</strong> <span>Transformer Block</span>
          </span>{" "}
          <span className="lab-inspection__context">
            Layer {state.architecture.selectedLayer + 1}
          </span>
          <InspectionArrow />
        </button>
        <button
          type="button"
          data-inspection-kind="attention"
          disabled={model === null}
          onClick={() => openArchitecture("self-attention")}
        >
          <span className="lab-inspection__index" aria-hidden="true">
            03
          </span>
          <span className="lab-inspection__copy">
            <strong>Attention</strong> <span>Self-Attention</span>
          </span>{" "}
          <span className="lab-inspection__context">
            Layer {state.architecture.selectedLayer + 1} · Head{" "}
            {state.architecture.selectedHead + 1}
          </span>
          <InspectionArrow />
        </button>
        <button
          type="button"
          data-inspection-kind="score-matrix"
          disabled={!scoreAvailable}
          onClick={openScoreMatrix}
        >
          <span className="lab-inspection__index" aria-hidden="true">
            04
          </span>
          <span className="lab-inspection__copy">
            <strong>Score Matrix</strong> <span>Actual trace</span>
          </span>{" "}
          <span className="lab-inspection__context">
            {scoreAvailable
              ? `Step ${(state.generation.selectedStep ?? 0) + 1} · Head ${
                  state.architecture.selectedHead + 1
                }`
              : "Generate and select step"}
          </span>
          <InspectionArrow />
        </button>
      </div>
    </section>
  );
}
