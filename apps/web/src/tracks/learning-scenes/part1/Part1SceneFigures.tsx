import { type ReactElement, useState } from "react";

import { AutoregressiveLoopDiagram } from "../../decoder-only-fundamentals/curriculum/diagrams/part1/AutoregressiveLoopDiagram";
import { ConditionalProbabilityDiagram } from "../../decoder-only-fundamentals/curriculum/diagrams/part1/ConditionalProbabilityDiagram";
import { LanguageModelDiagram } from "../../decoder-only-fundamentals/curriculum/diagrams/part1/LanguageModelDiagram";
import { NextTokenPredictionDiagram } from "../../decoder-only-fundamentals/curriculum/diagrams/part1/NextTokenPredictionDiagram";
import { SceneFigure } from "../SceneFigure";
import { SceneStageLabel, SceneStepRail } from "../sceneControls";

import "./part1Scenes.css";

export type LanguageModelState = Readonly<{
  replay: number;
  stage: "context" | "model" | "candidates";
}>;

export type NextTokenState = Readonly<{
  replay: number;
  stage: "logits" | "probability" | "selection";
}>;

export type ConditionalProbabilityState = Readonly<{
  replay: number;
  stage: "w1" | "w2" | "w3";
}>;

export type AutoregressiveState = Readonly<{
  replay: number;
  stage: "predict" | "select" | "append" | "repeat";
}>;

function loadLanguageModelScene() {
  return import("./LanguageModelScene");
}

function loadNextTokenScene() {
  return import("./NextTokenScene");
}

function loadConditionalProbabilityScene() {
  return import("./ConditionalProbabilityScene");
}

function loadAutoregressiveScene() {
  return import("./AutoregressiveScene");
}

export function LanguageModelSceneFigure(): ReactElement {
  const [state, setState] = useState<LanguageModelState>({
    replay: 0,
    stage: "context",
  });
  const stages = [
    { id: "context", label: "Context" },
    { id: "model", label: "Model" },
    { id: "candidates", label: "후보" },
  ] as const;
  return (
    <SceneFigure
      annotations={
        <p
          className="part1-scene__note"
          data-stage={state.stage}
          data-testid="language-model-scene-state"
        >
          후보는 실제 model output이 아닌 설명용입니다.
        </p>
      }
      aspectRatio={2}
      controls={
        <SceneStepRail
          activeStep={state.stage}
          label="언어 모델 역할 단계"
          onReplay={() =>
            setState((current) => ({
              replay: current.replay + 1,
              stage: "context",
            }))
          }
          onSelect={(stage) =>
            setState((current) => ({
              replay: current.replay + 1,
              stage,
            }))
          }
          replayLabel="다시 보기"
          steps={stages}
        />
      }
      description="하나의 context가 structured model core를 지나 여러 next-token 후보 점수로 펼쳐지는 관계"
      fallback={<LanguageModelDiagram />}
      figureId="decoder.diagram.language-model.definition"
      labels={
        <>
          <SceneStageLabel
            mobileX={50}
            mobileY={12}
            tone={state.stage === "context" ? "selected" : "neutral"}
            x={17}
            y={15}
          >
            Current Context
          </SceneStageLabel>
          <SceneStageLabel
            mobileX={50}
            mobileY={49}
            tone={state.stage === "model" ? "selected" : "neutral"}
            x={49}
            y={15}
          >
            Language Model
          </SceneStageLabel>
          {["A", "B", "C"].map((candidate, index) => (
            <SceneStageLabel
              key={candidate}
              mobileX={30 + index * 20}
              mobileY={84}
              tone={state.stage === "candidates" ? "output" : "neutral"}
              x={80}
              y={35 + index * 17}
            >
              Candidate {candidate}
            </SceneStageLabel>
          ))}
        </>
      }
      loadScene={loadLanguageModelScene}
      state={state}
      title="현재 context에서 무엇이 펼쳐질까요?"
    />
  );
}

export function NextTokenSceneFigure(): ReactElement {
  const [state, setState] = useState<NextTokenState>({
    replay: 0,
    stage: "logits",
  });
  return (
    <SceneFigure
      annotations={
        <div
          className="part1-scene__candidate-state"
          data-stage={state.stage}
          data-testid="next-token-scene-state"
        >
          <ol data-testid="next-token-candidates" aria-label="후보 identity">
            <li>A</li>
            <li>B</li>
            <li>C</li>
          </ol>
          <p>
            {state.stage === "selection"
              ? "Sampler가 B를 선택"
              : "세 후보 identity는 모든 단계에서 유지됩니다."}
          </p>
        </div>
      }
      aspectRatio={1.85}
      controls={
        <SceneStepRail
          activeStep={state.stage}
          label="다음 Token 선택 단계"
          onReplay={() =>
            setState((current) => ({
              replay: current.replay + 1,
              stage: "logits",
            }))
          }
          onSelect={(stage) =>
            setState((current) => ({
              replay: current.replay + 1,
              stage,
            }))
          }
          replayLabel="변환 다시 보기"
          steps={[
            { id: "logits", label: "Logits" },
            { id: "probability", label: "Probability" },
            { id: "selection", label: "Selection" },
          ]}
        />
      }
      description="같은 후보 A, B, C가 logit 높이에서 probability 비율로 바뀌고 sampler 선택까지 이어지는 변환"
      fallback={<NextTokenPredictionDiagram />}
      figureId="decoder.diagram.language-model.next-token"
      grid
      labels={["A", "B", "C"].map((candidate, index) => (
        <SceneStageLabel
          key={candidate}
          tone={
            state.stage === "selection" && candidate === "B"
              ? "selected"
              : "neutral"
          }
          x={32 + index * 18}
          y={14}
          mobileX={27 + index * 23}
          mobileY={14}
        >
          Candidate {candidate}
        </SceneStageLabel>
      ))}
      loadScene={loadNextTokenScene}
      state={state}
      title="Logit은 어떻게 token 선택으로 이어질까요?"
    />
  );
}

export function ConditionalProbabilitySceneFigure(): ReactElement {
  const [state, setState] = useState<ConditionalProbabilityState>({
    replay: 0,
    stage: "w1",
  });
  const formulas = {
    w1: "P(w₁)",
    w2: "P(w₂ | w₁)",
    w3: "P(w₃ | w₁,w₂)",
  } as const;
  return (
    <SceneFigure
      annotations={
        <p
          className="part1-scene__formula"
          data-stage={state.stage}
          data-testid="conditional-scene-state"
        >
          {formulas[state.stage]}
        </p>
      }
      aspectRatio={2.15}
      controls={
        <SceneStepRail
          activeStep={state.stage}
          label="조건부 확률 prefix 단계"
          onReplay={() =>
            setState((current) => ({
              replay: current.replay + 1,
              stage: "w1",
            }))
          }
          onSelect={(stage) =>
            setState((current) => ({
              replay: current.replay + 1,
              stage,
            }))
          }
          replayLabel="Prefix 다시 보기"
          steps={[
            { id: "w1", label: "w₁" },
            { id: "w2", label: "w₂ 조건" },
            { id: "w3", label: "w₃ 조건" },
          ]}
        />
      }
      description="정확한 확률식은 KaTeX에 두고 선택된 token 뒤에 context depth가 누적되는 조건 관계"
      fallback={<ConditionalProbabilityDiagram />}
      figureId="decoder.diagram.language-model.conditional-probability"
      labels={["w₁", "w₂", "w₃"].map((token, index) => (
        <SceneStageLabel
          key={token}
          tone={
            index <= ["w1", "w2", "w3"].indexOf(state.stage)
              ? "selected"
              : "neutral"
          }
          x={27 + index * 23}
          y={18}
          mobileX={26 + index * 24}
          mobileY={18}
        >
          {token}
        </SceneStageLabel>
      ))}
      loadScene={loadConditionalProbabilityScene}
      state={state}
      title="앞선 token은 다음 확률의 조건으로 어떻게 쌓일까요?"
    />
  );
}

export function AutoregressiveSceneFigure(): ReactElement {
  const [state, setState] = useState<AutoregressiveState>({
    replay: 0,
    stage: "predict",
  });
  return (
    <SceneFigure
      annotations={
        <div
          className="part1-scene__autoregressive-state"
          data-stage={state.stage}
          data-testid="autoregressive-scene-state"
        >
          <p data-testid="updated-context">
            {state.stage === "predict" || state.stage === "select"
              ? "The cat"
              : "The cat s"}
          </p>
          <p>
            {state.stage === "repeat"
              ? "Updated Context가 다음 입력입니다."
              : "새 token은 context 끝에 붙습니다."}
          </p>
        </div>
      }
      aspectRatio={1.9}
      controls={
        <SceneStepRail
          activeStep={state.stage}
          label="Autoregressive Generation 단계"
          onReplay={() =>
            setState((current) => ({
              replay: current.replay + 1,
              stage: "predict",
            }))
          }
          onSelect={(stage) =>
            setState((current) => ({
              replay: current.replay + 1,
              stage,
            }))
          }
          replayLabel="Generation 다시 보기"
          steps={[
            { id: "predict", label: "Predict" },
            { id: "select", label: "Select" },
            { id: "append", label: "Append" },
            { id: "repeat", label: "Repeat" },
          ]}
        />
      }
      description="현재 context에서 token 하나를 선택하고 끝에 붙인 Updated Context를 다음 입력으로 되돌리는 반복"
      fallback={<AutoregressiveLoopDiagram />}
      figureId="decoder.diagram.language-model.autoregressive"
      labels={
        <>
          <SceneStageLabel
            mobileX={50}
            mobileY={11}
            tone={state.stage === "predict" ? "selected" : "neutral"}
            x={16}
            y={14}
          >
            Current Context
          </SceneStageLabel>
          <SceneStageLabel mobileX={50} mobileY={40} x={44} y={14}>
            Model
          </SceneStageLabel>
          <SceneStageLabel
            mobileX={50}
            mobileY={68}
            tone={state.stage === "select" ? "selected" : "neutral"}
            x={70}
            y={14}
          >
            Selected token · s
          </SceneStageLabel>
          <SceneStageLabel
            mobileX={50}
            mobileY={88}
            tone={
              state.stage === "append" || state.stage === "repeat"
                ? "output"
                : "neutral"
            }
            x={84}
            y={76}
          >
            Updated Context
          </SceneStageLabel>
        </>
      }
      loadScene={loadAutoregressiveScene}
      state={state}
      title="한 번의 prediction은 어떻게 sequence를 늘릴까요?"
    />
  );
}
