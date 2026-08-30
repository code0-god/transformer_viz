import { type ReactElement, useState } from "react";

import { PositionEmbeddingDiagram } from "../../decoder-only-fundamentals/curriculum/diagrams/part2/PositionEmbeddingDiagram";
import { SceneFigure } from "../SceneFigure";
import {
  SceneChoiceGroup,
  SceneStageLabel,
  SceneStepRail,
} from "../sceneControls";

import "./positionEmbeddingScene.css";

export type PositionEmbeddingState = Readonly<{
  phase: "align" | "separate" | "sum";
  position: "0" | "3";
  replay: number;
}>;

function loadPositionEmbeddingScene() {
  return import("./PositionEmbeddingScene");
}

export function PositionEmbeddingSceneFigure(): ReactElement {
  const [state, setState] = useState<PositionEmbeddingState>({
    phase: "separate",
    position: "0",
    replay: 0,
  });
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
          <span>cat · token vector [C]</span>
          <span>position {state.position} · learned vector [C]</span>
          <strong>
            {state.phase === "sum"
              ? "X₀ · result vector [C]"
              : "[C] + [C] = [C]"}
          </strong>
          <small>Position channel 값은 학습을 위한 예시입니다.</small>
          <em>concatenation 아님</em>
        </div>
      }
      aspectRatio={1.9}
      controls={
        <div className="position-scene__controls">
          <SceneChoiceGroup
            choices={[
              { id: "0", label: "position 0" },
              { id: "3", label: "position 3" },
            ]}
            label="Position 비교"
            onSelect={(position) =>
              setState((current) => ({
                phase: "separate",
                position,
                replay: current.replay + 1,
              }))
            }
            selected={state.position}
          />
          <SceneStepRail
            activeStep={state.phase}
            label="Position vector addition 단계"
            onReplay={() =>
              setState((current) => ({
                ...current,
                phase: "separate",
                replay: current.replay + 1,
              }))
            }
            onSelect={(phase) =>
              setState((current) => ({
                ...current,
                phase,
                replay: current.replay + 1,
              }))
            }
            replayLabel="다시 보기"
            steps={[
              { id: "separate", label: "분리" },
              { id: "align", label: "Channel 정렬" },
              { id: "sum", label: "더하기" },
            ]}
          />
        </div>
      }
      description="같은 token vector와 learned absolute position vector가 channel별로 정렬되어 같은 길이의 X₀로 합쳐지는 과정"
      fallback={<PositionEmbeddingDiagram />}
      figureId="decoder.diagram.representation.position"
      grid
      labels={
        <>
          <SceneStageLabel
            mobileX={50}
            mobileY={13}
            tone={state.phase === "separate" ? "selected" : "neutral"}
            x={27}
            y={15}
          >
            Token · cat · [C]
          </SceneStageLabel>
          <SceneStageLabel
            mobileX={50}
            mobileY={43}
            tone={state.phase === "align" ? "selected" : "neutral"}
            x={52}
            y={15}
          >
            Position {state.position} · [C]
          </SceneStageLabel>
          <SceneStageLabel
            mobileX={50}
            mobileY={85}
            tone={state.phase === "sum" ? "output" : "neutral"}
            x={78}
            y={15}
          >
            X₀ · [C]
          </SceneStageLabel>
        </>
      }
      loadScene={loadPositionEmbeddingScene}
      state={state}
      title="같은 token에 position을 어떻게 더할까요?"
    />
  );
}
