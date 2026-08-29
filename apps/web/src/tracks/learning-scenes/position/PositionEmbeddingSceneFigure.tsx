import { type ReactElement, useState } from "react";

import { ThreeUiAction } from "../../../threeui/ThreeUi";
import { PositionEmbeddingDiagram } from "../../decoder-only-fundamentals/curriculum/diagrams/part2/PositionEmbeddingDiagram";
import { SceneFigure } from "../SceneFigure";

import "./positionEmbeddingScene.css";

export type PositionEmbeddingState = Readonly<{
  phase: "before" | "sum";
  position: 0 | 1;
  replay: number;
}>;

function loadPositionEmbeddingScene() {
  return import("./PositionEmbeddingScene");
}

export function PositionEmbeddingSceneFigure(): ReactElement {
  const [state, setState] = useState<PositionEmbeddingState>({
    phase: "before",
    position: 0,
    replay: 0,
  });
  const selectPosition = (position: PositionEmbeddingState["position"]) => {
    setState((current) => ({
      phase: "before",
      position,
      replay: current.replay + 1,
    }));
  };

  return (
    <SceneFigure
      annotations={
        <div
          className="position-scene__state"
          data-phase={state.phase}
          data-position={state.position}
          data-replay={state.replay}
          data-testid="position-scene-state"
        >
          <ol className="position-scene__flow">
            <li>
              <span>1 · TOKEN</span>
              <strong>cat · E_tok [C]</strong>
            </li>
            <li data-active={state.phase === "before" ? "true" : undefined}>
              <span>2 · LEARNED ABSOLUTE POSITION</span>
              <strong>position {state.position} · E_pos [C]</strong>
            </li>
            <li data-active={state.phase === "sum" ? "true" : undefined}>
              <span>3 · ELEMENT-WISE SUM</span>
              <strong>
                {state.phase === "sum"
                  ? "X_0 = E_tok + E_pos · [C]"
                  : "X_0 대기 · [C]"}
              </strong>
            </li>
          </ol>
          <div className="position-scene__equation">
            <strong>[C] + [C] → [C]</strong>
            <span>concatenation 아님</span>
          </div>
          <p>Position row와 channel 모양은 학습 개념을 위한 예시입니다.</p>
        </div>
      }
      aspectRatio={1.55}
      controls={
        <>
          <ThreeUiAction
            label="position 0"
            onClick={() => selectPosition(0)}
            pressed={state.position === 0}
            tier={state.position === 0 ? "primary" : "secondary"}
          />
          <ThreeUiAction
            label="position 1"
            onClick={() => selectPosition(1)}
            pressed={state.position === 1}
            tier={state.position === 1 ? "primary" : "secondary"}
          />
          <ThreeUiAction
            disabled={state.phase === "sum"}
            label={state.phase === "sum" ? "더하기 완료" : "원소별 더하기"}
            onClick={() =>
              setState((current) => ({
                ...current,
                phase: "sum",
                replay: current.replay + 1,
              }))
            }
            tier="secondary"
          />
          <ThreeUiAction
            label="Composition 다시 보기"
            onClick={() =>
              setState((current) => ({
                ...current,
                phase: "before",
                replay: current.replay + 1,
              }))
            }
            tier="tertiary"
          />
        </>
      }
      description="같은 길이의 token embedding과 learned absolute position embedding을 channel별로 더해 X_0를 만드는 COMPOSITION 과정"
      fallback={<PositionEmbeddingDiagram />}
      figureId="decoder.diagram.representation.position"
      loadScene={loadPositionEmbeddingScene}
      state={state}
      title="같은 token에 position을 어떻게 더할까요?"
    />
  );
}
