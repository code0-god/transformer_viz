import { type ReactElement, type ReactNode, useState } from "react";

import { SceneFigure } from "../SceneFigure";
import { SceneStageLabel, SceneStepRail } from "../sceneControls";

import "./transformerBlockScene.css";

export type TransformerBlockState = Readonly<{
  layerCount: number;
  replay: number;
  stage: "attention" | "full" | "mlp";
}>;

function loadTransformerBlockScene() {
  return import("./TransformerBlockScene");
}

export function TransformerBlockSceneFigure({
  fallback,
  layerCount,
}: Readonly<{
  fallback: ReactNode;
  layerCount: number;
}>): ReactElement {
  const [state, setState] = useState<TransformerBlockState>({
    layerCount,
    replay: 0,
    stage: "full",
  });
  return (
    <SceneFigure
      annotations={
        <div
          className="block-scene__state"
          data-stage={state.stage}
          data-testid="block-scene-state"
        >
          <strong>Pre-LN</strong>
          <span>LN₁ · Attention · Add · LN₂ · MLP · Add</span>
          <span>
            {state.stage === "attention"
              ? "Residual bypass 1"
              : state.stage === "mlp"
                ? "Residual bypass 2"
                : `같은 구조를 ${layerCount}번 반복`}
          </span>
        </div>
      }
      aspectRatio={1.68}
      controls={
        <SceneStepRail
          activeStep={state.stage}
          label="Transformer Block flow"
          onReplay={() =>
            setState((current) => ({
              ...current,
              replay: current.replay + 1,
              stage: "full",
            }))
          }
          onSelect={(stage) =>
            setState((current) => ({
              ...current,
              replay: current.replay + 1,
              stage,
            }))
          }
          replayLabel="Block 다시 보기"
          steps={[
            { id: "full", label: "Overview" },
            { id: "attention", label: "Attention half" },
            { id: "mlp", label: "MLP half" },
          ]}
        />
      }
      description="Pre-LN Block의 main computation path와 두 residual bypass가 서로 다른 depth lane에서 Add로 합쳐지는 흐름"
      fallback={fallback}
      figureId="transformer-block"
      grid
      labels={
        <>
          {[
            "X_in",
            "LN₁",
            "Attention",
            "Add",
            "LN₂",
            "MLP",
            "Add",
            "X_out",
          ].map((label, index) => (
            <SceneStageLabel
              key={`${label}-${index < 4 ? "attention" : "mlp"}`}
              mobileX={34}
              mobileY={8 + index * 11.8}
              tone={
                (state.stage === "attention" && index < 4) ||
                (state.stage === "mlp" && index >= 4)
                  ? "selected"
                  : label === "X_out"
                    ? "output"
                    : "neutral"
              }
              x={7 + index * 12.3}
              y={13}
            >
              {label}
            </SceneStageLabel>
          ))}
          <SceneStageLabel
            mobileX={78}
            mobileY={29}
            tone={state.stage === "attention" ? "selected" : "neutral"}
            x={26}
            y={78}
          >
            Residual bypass 1
          </SceneStageLabel>
          <SceneStageLabel
            mobileX={78}
            mobileY={72}
            tone={state.stage === "mlp" ? "selected" : "neutral"}
            x={69}
            y={78}
          >
            Residual bypass 2
          </SceneStageLabel>
        </>
      }
      loadScene={loadTransformerBlockScene}
      state={state}
      title="Transformer Block 안에서 정보는 어떤 경로로 흐를까요?"
    />
  );
}
