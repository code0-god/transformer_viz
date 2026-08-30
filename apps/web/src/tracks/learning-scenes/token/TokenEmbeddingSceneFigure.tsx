import { type ReactElement, useState } from "react";

import { ThreeUiAction } from "../../../threeui/ThreeUi";
import { TokenEmbeddingDiagram } from "../../decoder-only-fundamentals/curriculum/diagrams/part2/TokenEmbeddingDiagram";
import { SceneFigure } from "../SceneFigure";

import "./tokenEmbeddingScene.css";

export type TokenEmbeddingState = Readonly<{
  phase: "id" | "lookup" | "vector";
  replay: number;
  token: "cat" | "the";
}>;

const TOKEN_SPEC = {
  cat: {
    id: 42,
    vectorLabel: "cat vector",
  },
  the: {
    id: 91,
    vectorLabel: "the vector",
  },
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
  const selected = TOKEN_SPEC[state.token];
  const selectToken = (token: TokenEmbeddingState["token"]) => {
    setState((current) => ({
      replay: current.replay + 1,
      phase: "id",
      token,
    }));
  };

  return (
    <SceneFigure
      annotations={
        <div
          className="token-scene__state"
          data-phase={state.phase}
          data-replay={state.replay}
          data-selected-token={state.token}
          data-testid="token-scene-state"
        >
          <ol className="token-scene__flow">
            <li data-active={state.phase === "id" ? "true" : undefined}>
              <span>1 · TOKEN ID</span>
              <strong>ID {selected.id}</strong>
            </li>
            <li data-active={state.phase === "lookup" ? "true" : undefined}>
              <span>2 · LOOKUP</span>
              <strong>
                {state.phase === "id" ? "row 대기" : `row ${selected.id} 선택`}
              </strong>
            </li>
            <li data-active={state.phase === "vector" ? "true" : undefined}>
              <span>3 · EXTRACT</span>
              <strong>
                {state.phase === "vector"
                  ? selected.vectorLabel
                  : "vector 대기"}
              </strong>
            </li>
          </ol>
          <p>표시된 channel은 학습 개념을 위한 예시입니다.</p>
        </div>
      }
      aspectRatio={1.55}
      controls={
        <>
          <ThreeUiAction
            label="the · ID 91"
            onClick={() => selectToken("the")}
            pressed={state.token === "the"}
            tier={state.token === "the" ? "primary" : "secondary"}
          />
          <ThreeUiAction
            label="cat · ID 42"
            onClick={() => selectToken("cat")}
            pressed={state.token === "cat"}
            tier={state.token === "cat" ? "primary" : "secondary"}
          />
          <ThreeUiAction
            disabled={state.phase === "vector"}
            label={
              state.phase === "id"
                ? "Row 찾기"
                : state.phase === "lookup"
                  ? "Vector 추출"
                  : "Lookup 완료"
            }
            onClick={() =>
              setState((current) => ({
                ...current,
                phase: current.phase === "id" ? "lookup" : "vector",
                replay: current.replay + 1,
              }))
            }
            tier="secondary"
          />
          <ThreeUiAction
            label="Lookup 다시 보기"
            onClick={() =>
              setState((current) => ({
                ...current,
                phase: "id",
                replay: current.replay + 1,
              }))
            }
            tier="tertiary"
          />
        </>
      }
      description="Token ID가 embedding table에서 같은 번호의 row를 선택하고 독립된 vector로 추출되는 LOOKUP 과정"
      fallback={<TokenEmbeddingDiagram />}
      figureId="decoder.diagram.representation.embedding"
      grid
      loadScene={loadTokenEmbeddingScene}
      state={state}
      title="Token ID는 어떻게 하나의 vector를 찾을까요?"
    />
  );
}
