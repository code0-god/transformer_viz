import { type ReactElement, useState } from "react";

import { TokenEmbeddingDiagram } from "../../decoder-only-fundamentals/curriculum/diagrams/part2/TokenEmbeddingDiagram";
import { useVisualNarrative } from "../../VisualNarrative";
import { SceneFigure } from "../SceneFigure";
import {
  SceneChoiceGroup,
  SceneStageLabel,
  SceneStepRail,
} from "../sceneControls";

import "./tokenEmbeddingScene.css";

export type TokenEmbeddingState = Readonly<{
  phase: "id" | "lift" | "lookup" | "vector";
  replay: number;
  token: "cat" | "the";
}>;

const TOKEN_SPEC = {
  cat: { id: 42 },
  the: { id: 91 },
} as const;

function loadTokenEmbeddingScene() {
  return import("./TokenEmbeddingScene");
}

export function TokenEmbeddingSceneFigure(): ReactElement {
  const [state, setState] = useState<TokenEmbeddingState>({
    phase: "id",
    replay: 0,
    token: "the",
  });
  const narrative = useVisualNarrative();
  const phase =
    narrative?.activeStage === "id" ||
    narrative?.activeStage === "lookup" ||
    narrative?.activeStage === "lift" ||
    narrative?.activeStage === "vector"
      ? narrative.activeStage
      : state.phase;
  const sceneState = { ...state, phase };
  const selected = TOKEN_SPEC[sceneState.token];
  const nearbyRows = Array.from(
    { length: 5 },
    (_, index) => selected.id - 2 + index,
  );
  return (
    <SceneFigure
      annotations={
        <div
          className="token-scene__state"
          data-phase={sceneState.phase}
          data-replay={sceneState.replay}
          data-selected-token={sceneState.token}
          data-testid="token-scene-state"
        >
          <strong>ID {selected.id}</strong>
          <span>
            {sceneState.phase === "vector"
              ? `선택한 row ${selected.id}이 vector로 이동합니다.`
              : sceneState.phase === "lookup"
                ? `row ${selected.id}을 선택했습니다.`
                : "Token ID와 같은 번호의 row를 찾습니다."}
          </span>
          <small>Channel 값은 학습을 위한 예시입니다.</small>
        </div>
      }
      aspectRatio={1.8}
      controls={
        <div className="token-scene__controls">
          <SceneChoiceGroup
            choices={[
              { id: "the", label: "the · ID 91" },
              { id: "cat", label: "cat · ID 42" },
            ]}
            label="Token ID 선택"
            onSelect={(token) =>
              setState((current) => ({
                phase: "id",
                replay: current.replay + 1,
                token,
              }))
            }
            selected={sceneState.token}
          />
          {narrative === null ? (
            <SceneStepRail
              activeStep={sceneState.phase}
              label="Embedding row extraction 단계"
              onReplay={() =>
                setState((current) => ({
                  ...current,
                  phase: "id",
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
                { id: "id", label: "ID" },
                { id: "lookup", label: "Row 선택" },
                { id: "lift", label: "Row 분리" },
                { id: "vector", label: "Vector 추출" },
              ]}
            />
          ) : null}
        </div>
      }
      description="Token ID와 같은 번호의 embedding row가 선택되어 독립된 vector로 추출되는 과정"
      fallback={<TokenEmbeddingDiagram />}
      figureId="decoder.diagram.representation.embedding"
      grid
      labels={
        <>
          <SceneStageLabel
            mobileX={50}
            mobileY={12}
            tone={sceneState.phase === "id" ? "selected" : "neutral"}
            x={13}
            y={16}
          >
            Token ID · {selected.id}
          </SceneStageLabel>
          {nearbyRows.map((row, index) => (
            <SceneStageLabel
              key={row}
              mobileX={18}
              mobileY={29 + index * 11}
              tone={
                row === selected.id && sceneState.phase !== "id"
                  ? "selected"
                  : "neutral"
              }
              x={47}
              y={22 + index * 14}
            >
              row {row}
            </SceneStageLabel>
          ))}
          <SceneStageLabel
            mobileX={50}
            mobileY={88}
            tone={sceneState.phase === "vector" ? "output" : "neutral"}
            x={84}
            y={16}
          >
            Embedding Vector [C]
          </SceneStageLabel>
        </>
      }
      loadScene={loadTokenEmbeddingScene}
      state={sceneState}
      title="Token ID는 어떻게 하나의 vector를 찾을까요?"
    />
  );
}
