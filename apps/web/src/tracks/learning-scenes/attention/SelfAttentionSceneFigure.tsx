import { type ReactElement, type ReactNode, useState } from "react";

import { SceneFigure } from "../SceneFigure";
import { SceneStageLabel, SceneStepRail } from "../sceneControls";

import "./selfAttentionScene.css";

export type SelfAttentionStage =
  | "mask"
  | "overview"
  | "qkv"
  | "scores"
  | "softmax"
  | "value";

export type SelfAttentionState = Readonly<{
  headCount: number;
  layerCount: number;
  replay: number;
  stage: SelfAttentionStage;
}>;

const STAGE_COPY: Readonly<Record<SelfAttentionStage, readonly string[]>> = {
  overview: ["Q/K/V · Scores · Mask · Softmax · Weighted V"],
  qkv: ["Query · Key · Value"],
  scores: ["S = QKᵀ / √D"],
  mask: ["Future positions blocked before Softmax"],
  softmax: ["Positive weights · row sum 1"],
  value: ["Y = AV", "Heads merge · output projection"],
};

function loadSelfAttentionScene() {
  return import("./SelfAttentionScene");
}

export function SelfAttentionSceneFigure({
  fallback,
  headCount,
  layerCount,
}: Readonly<{
  fallback: ReactNode;
  headCount: number;
  layerCount: number;
}>): ReactElement {
  const [state, setState] = useState<SelfAttentionState>({
    headCount,
    layerCount,
    replay: 0,
    stage: "overview",
  });
  const overview = state.stage === "overview";
  const showQkv = overview || state.stage === "qkv" || state.stage === "scores";
  const showScores =
    overview ||
    state.stage === "scores" ||
    state.stage === "mask" ||
    state.stage === "softmax";
  const showMask =
    overview || state.stage === "mask" || state.stage === "softmax";
  const showWeights =
    overview || state.stage === "softmax" || state.stage === "value";
  const showValue = overview || state.stage === "value";
  return (
    <SceneFigure
      annotations={
        <div
          className="attention-scene__state"
          data-stage={state.stage}
          data-testid="attention-scene-state"
        >
          <strong>Layer 1 · Head 1 · Illustrative</strong>
          {STAGE_COPY[state.stage].map((line) => (
            <span key={line}>{line}</span>
          ))}
        </div>
      }
      aspectRatio={1.48}
      controls={
        <SceneStepRail
          activeStep={state.stage}
          label="Self-Attention computation stages"
          onReplay={() =>
            setState((current) => ({
              ...current,
              replay: current.replay + 1,
              stage: "overview",
            }))
          }
          onSelect={(stage) =>
            setState((current) => ({
              ...current,
              replay: current.replay + 1,
              stage,
            }))
          }
          replayLabel="Attention 다시 보기"
          steps={[
            { id: "overview", label: "Overview" },
            { id: "qkv", label: "Q/K/V" },
            { id: "scores", label: "Scores" },
            { id: "mask", label: "Mask" },
            { id: "softmax", label: "Softmax" },
            { id: "value", label: "Value" },
          ]}
        />
      }
      description="하나의 combined projection에서 head별 Q/K/V를 만들고 score, scale, causal mask, Softmax, weighted V, head merge, output projection으로 이어지는 causal attention"
      fallback={fallback}
      figureId="self-attention"
      grid
      labels={
        <>
          <SceneStageLabel x={7} y={12} mobileX={50} mobileY={6}>
            Input X
          </SceneStageLabel>
          {showQkv
            ? [
                ["Query", 20, 18, 16],
                ["Key", 20, 42, 23],
                ["Value", 20, 66, 30],
              ].map(([label, x, y, mobileY]) => (
                <SceneStageLabel
                  key={label}
                  mobileX={25}
                  mobileY={Number(mobileY)}
                  tone={state.stage === "qkv" ? "selected" : "neutral"}
                  x={Number(x)}
                  y={Number(y)}
                >
                  {label}
                </SceneStageLabel>
              ))
            : null}
          {showScores ? (
            <SceneStageLabel
              mobileX={34}
              mobileY={43}
              tone={state.stage === "scores" ? "selected" : "neutral"}
              x={42}
              y={12}
            >
              QKᵀ / √D · Score Matrix
            </SceneStageLabel>
          ) : null}
          {showMask ? (
            <SceneStageLabel
              mobileX={72}
              mobileY={51}
              tone={state.stage === "mask" ? "selected" : "neutral"}
              x={50}
              y={72}
            >
              Causal Mask
            </SceneStageLabel>
          ) : null}
          {showWeights ? (
            <SceneStageLabel
              mobileX={50}
              mobileY={62}
              tone={state.stage === "softmax" ? "selected" : "neutral"}
              x={64}
              y={12}
            >
              Attention Weights
            </SceneStageLabel>
          ) : null}
          {showValue ? (
            <>
              <SceneStageLabel
                mobileX={50}
                mobileY={78}
                tone={state.stage === "value" ? "selected" : "neutral"}
                x={80}
                y={12}
              >
                Weighted V
              </SceneStageLabel>
              <SceneStageLabel
                mobileX={50}
                mobileY={93}
                tone={state.stage === "value" ? "output" : "neutral"}
                x={93}
                y={12}
              >
                Merge · Output Projection
              </SceneStageLabel>
            </>
          ) : null}
        </>
      }
      loadScene={loadSelfAttentionScene}
      state={state}
      title="각 token은 무엇을 참고해 새 표현을 만들까요?"
    />
  );
}
