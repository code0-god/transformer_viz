import { type ReactElement, useState } from "react";

import { HiddenStateDiagram } from "../../decoder-only-fundamentals/curriculum/diagrams/part2/HiddenStateDiagram";
import { SceneFigure } from "../SceneFigure";
import { SceneStageLabel, SceneStepRail } from "../sceneControls";

import "./hiddenStateScene.css";

export type HiddenStateStage = "x0" | "x1" | "xn";

export type HiddenStateSceneState = Readonly<{
  replay: number;
  stage: HiddenStateStage;
}>;

const STAGES = [
  { detail: "Block 입력", id: "x0", label: "X_0" },
  { detail: "첫 Block 이후", id: "x1", label: "X_1" },
  { detail: "마지막 Block 이후", id: "xn", label: "X_N" },
] as const;

function loadHiddenStateScene() {
  return import("./HiddenStateScene");
}

export function HiddenStateSceneFigure(): ReactElement {
  const [state, setState] = useState<HiddenStateSceneState>({
    replay: 0,
    stage: "x0",
  });
  return (
    <SceneFigure
      annotations={
        <div
          className="hidden-scene__state"
          data-replay={state.replay}
          data-stage={state.stage}
          data-testid="hidden-scene-state"
        >
          <ol className="hidden-scene__shape-invariant">
            {STAGES.map((stage) => (
              <li
                key={stage.id}
                data-active={stage.id === state.stage ? "true" : undefined}
                data-shape="[T,C]"
              >
                <span>{stage.label}</span>
                <small>{stage.detail}</small>
                <strong>[T,C]</strong>
              </li>
            ))}
          </ol>
          <div className="hidden-scene__identity">
            <span>t0 · the</span>
            <span>t1 · cat</span>
            <strong>Shape stays · values change</strong>
          </div>
          <p>Activation 값은 학습을 위한 예시입니다.</p>
        </div>
      }
      aspectRatio={2}
      controls={
        <SceneStepRail
          activeStep={state.stage}
          label="Hidden State depth"
          onReplay={() =>
            setState((current) => ({
              replay: current.replay + 1,
              stage: "x0",
            }))
          }
          onSelect={(stage) =>
            setState((current) => ({
              replay: current.replay + 1,
              stage,
            }))
          }
          replayLabel="다시 보기"
          steps={STAGES.map((stage) => ({
            id: stage.id,
            label: stage.label,
          }))}
        />
      }
      description="X₀, X₁, X_N이 같은 token rows와 [T,C] frame을 유지하고 내부 activation 값만 바뀌는 비교"
      fallback={<HiddenStateDiagram />}
      figureId="decoder.diagram.representation.hidden-state"
      grid
      labels={STAGES.map((stage, index) => (
        <SceneStageLabel
          key={stage.id}
          mobileX={50}
          mobileY={16 + index * 33}
          tone={state.stage === stage.id ? "selected" : "neutral"}
          x={21 + index * 29}
          y={14}
        >
          {stage.label} · [T,C]
        </SceneStageLabel>
      ))}
      loadScene={loadHiddenStateScene}
      state={state}
      title="같은 tensor가 Block을 지나면 무엇이 달라질까요?"
    />
  );
}
