import { type ReactElement, type ReactNode, useState } from "react";

import { SceneFigure } from "../SceneFigure";
import { SceneStageLabel, SceneStepRail } from "../sceneControls";

import "./gptArchitectureScene.css";

export type GptArchitectureState = Readonly<{
  headCount: number;
  layerCount: number;
  replay: number;
  stage: "blocks" | "embedding" | "generation" | "input" | "output";
}>;

function loadGptArchitectureScene() {
  return import("./GptArchitectureScene");
}

export function GptArchitectureSceneFigure({
  fallback,
  headCount,
  layerCount,
  modelName,
  nextHref,
}: Readonly<{
  fallback: ReactNode;
  headCount: number;
  layerCount: number;
  modelName: string;
  nextHref: string;
}>): ReactElement {
  const [state, setState] = useState<GptArchitectureState>({
    headCount,
    layerCount,
    replay: 0,
    stage: "input",
  });
  return (
    <div className="gpt-scene-figure">
      <SceneFigure
        annotations={
          <div
            className="gpt-scene__state"
            data-stage={state.stage}
            data-testid="gpt-scene-state"
          >
            <strong>
              {layerCount} Blocks · {headCount} Heads
            </strong>
            <span>Token lookup + learned position lookup</span>
            <span>
              {state.stage === "generation"
                ? "Generated token이 Updated Context에 붙습니다."
                : `${modelName}의 decoder-only generation path`}
            </span>
          </div>
        }
        aspectRatio={1.62}
        controls={
          <SceneStepRail
            activeStep={state.stage}
            label="GPT generation pipeline"
            onReplay={() =>
              setState((current) => ({
                ...current,
                replay: current.replay + 1,
                stage: "input",
              }))
            }
            onSelect={(stage) =>
              setState((current) => ({
                ...current,
                replay: current.replay + 1,
                stage,
              }))
            }
            replayLabel="전체 흐름 다시 보기"
            steps={[
              { id: "input", label: "Input" },
              { id: "embedding", label: "Embedding" },
              { id: "blocks", label: "Blocks" },
              { id: "output", label: "Output" },
              { id: "generation", label: "Generation" },
            ]}
          />
        }
        description="현재 context가 token과 learned position embedding을 합친 뒤 causal Block stack, output head, token selection, context update를 지나는 전체 흐름"
        fallback={fallback}
        figureId="root"
        grid
        labels={
          <>
            <SceneStageLabel
              mobileX={50}
              mobileY={8}
              tone={state.stage === "input" ? "selected" : "neutral"}
              x={11}
              y={13}
            >
              Input Context
            </SceneStageLabel>
            <SceneStageLabel
              mobileX={28}
              mobileY={25}
              tone={state.stage === "embedding" ? "selected" : "neutral"}
              x={29}
              y={13}
            >
              Token lookup
            </SceneStageLabel>
            <SceneStageLabel
              mobileX={72}
              mobileY={25}
              tone={state.stage === "embedding" ? "selected" : "neutral"}
              x={40}
              y={30}
            >
              Learned position lookup
            </SceneStageLabel>
            <SceneStageLabel
              mobileX={50}
              mobileY={39}
              tone={state.stage === "embedding" ? "output" : "neutral"}
              x={43}
              y={13}
            >
              X₀ · element-wise add
            </SceneStageLabel>
            <SceneStageLabel
              mobileX={50}
              mobileY={54}
              tone={state.stage === "blocks" ? "selected" : "neutral"}
              x={58}
              y={13}
            >
              Block stack × {layerCount}
            </SceneStageLabel>
            <SceneStageLabel
              mobileX={50}
              mobileY={69}
              tone={state.stage === "output" ? "selected" : "neutral"}
              x={73}
              y={13}
            >
              Final Norm · Head · Logits
            </SceneStageLabel>
            <SceneStageLabel
              mobileX={50}
              mobileY={81}
              tone={state.stage === "generation" ? "selected" : "neutral"}
              x={88}
              y={13}
            >
              Selected Token
            </SceneStageLabel>
            <SceneStageLabel
              mobileX={50}
              mobileY={92}
              tone={state.stage === "generation" ? "output" : "neutral"}
              x={77}
              y={82}
            >
              Updated Context
            </SceneStageLabel>
          </>
        }
        loadScene={loadGptArchitectureScene}
        state={state}
        title="Context는 GPT 전체에서 어떤 경로를 지날까요?"
      />
      <a
        className="decoder-learning-architecture__next"
        href={nextHref}
        aria-label="Transformer Block 설명으로 이동"
      >
        Transformer Block 설명으로 이동
      </a>
    </div>
  );
}
