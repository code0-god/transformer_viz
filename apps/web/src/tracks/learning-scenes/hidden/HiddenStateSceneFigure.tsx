import { type ReactElement, useState } from "react";

import { ThreeUiAction } from "../../../threeui/ThreeUi";
import { HiddenStateDiagram } from "../../decoder-only-fundamentals/curriculum/diagrams/part2/HiddenStateDiagram";
import { SceneFigure } from "../SceneFigure";

import "./hiddenStateScene.css";

export type HiddenStateStage = "x0" | "x1" | "xn";

export type HiddenStateSceneState = Readonly<{
  replay: number;
  stage: HiddenStateStage;
}>;

const STAGES = {
  x0: {
    detail: "Block 입력",
    label: "X_0",
  },
  x1: {
    detail: "첫 Block 이후",
    label: "X_1",
  },
  xn: {
    detail: "마지막 Block 이후",
    label: "X_N",
  },
} as const;

const STAGE_ENTRIES = Object.entries(STAGES) as [
  HiddenStateStage,
  (typeof STAGES)[HiddenStateStage],
][];

function loadHiddenStateScene() {
  return import("./HiddenStateScene");
}

export function HiddenStateSceneFigure(): ReactElement {
  const [state, setState] = useState<HiddenStateSceneState>({
    replay: 0,
    stage: "x0",
  });
  const selectStage = (stage: HiddenStateStage) => {
    setState((current) => ({
      replay: current.replay + 1,
      stage,
    }));
  };

  return (
    <SceneFigure
      annotations={
        <div
          className="hidden-scene__state"
          data-replay={state.replay}
          data-stage={state.stage}
          data-testid="hidden-scene-state"
        >
          <ol className="hidden-scene__flow">
            {STAGE_ENTRIES.map(([stage, spec]) => (
              <li
                key={stage}
                data-active={state.stage === stage ? "true" : undefined}
              >
                <span>{spec.label}</span>
                <strong>{spec.detail}</strong>
                <em>[T,C]</em>
              </li>
            ))}
          </ol>
          <div className="hidden-scene__identity">
            <span>t0 · the</span>
            <span>t1 · cat</span>
            <strong>shape 유지 · activation 변화</strong>
          </div>
          <p>activation 값은 예시입니다.</p>
        </div>
      }
      aspectRatio={1.6}
      controls={
        <>
          {STAGE_ENTRIES.map(([stage, spec]) => (
            <ThreeUiAction
              key={stage}
              label={spec.label}
              onClick={() => selectStage(stage)}
              pressed={state.stage === stage}
              tier={state.stage === stage ? "primary" : "secondary"}
            />
          ))}
          <ThreeUiAction
            label="Evolution 다시 보기"
            onClick={() => selectStage("x0")}
            tier="tertiary"
          />
        </>
      }
      description="동일한 token rows와 [T,C] shape를 유지하면서 X_0, X_1, X_N의 activation 값이 달라지는 EVOLUTION 과정"
      fallback={<HiddenStateDiagram />}
      figureId="decoder.diagram.representation.hidden-state"
      loadScene={loadHiddenStateScene}
      state={state}
      title="같은 tensor가 Block을 지나면 무엇이 달라질까요?"
    />
  );
}
