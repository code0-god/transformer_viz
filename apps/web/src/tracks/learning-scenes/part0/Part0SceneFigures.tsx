import { type ReactElement, useState } from "react";

import { TokenComparisonDiagram } from "../../decoder-only-fundamentals/curriculum/diagrams/part0/TokenComparisonDiagram";
import { TokenizationMethodsDiagram } from "../../decoder-only-fundamentals/curriculum/diagrams/part0/TokenizationMethodsDiagram";
import { VocabularyAddressDiagram } from "../../decoder-only-fundamentals/curriculum/diagrams/part0/VocabularyAddressDiagram";
import { useVisualNarrative } from "../../VisualNarrative";
import { SceneFigure } from "../SceneFigure";
import {
  SceneChoiceGroup,
  SceneStageLabel,
  SceneStepRail,
} from "../sceneControls";
import {
  TOKEN_UNIT_EXAMPLES,
  TOKENIZATION_SEGMENTS,
  type TokenizationMethod,
  type TokenUnitMode,
} from "./part0SceneData";

import "./part0Scenes.css";

export type TokenSegmentationState = Readonly<{
  mode: TokenUnitMode;
  narrative?: boolean;
  phase: "boundaries" | "source" | "split";
  replay: number;
}>;

export type VocabularyAddressState = Readonly<{
  phase: "token" | "address" | "id";
  replay: number;
  token: "cat" | "the";
}>;

export type TokenizationMethodsState = Readonly<{
  method: TokenizationMethod;
  phase: "source" | "split";
  replay: number;
}>;

function loadTokenSegmentationScene() {
  return import("./TokenSegmentationScene");
}

function loadVocabularyAddressScene() {
  return import("./VocabularyAddressScene");
}

function loadTokenizationMethodsScene() {
  return import("./TokenizationMethodsScene");
}

function SegmentLabels({
  output = false,
  segments,
}: Readonly<{
  output?: boolean;
  segments: readonly string[];
}>): ReactElement {
  const seen = new Map<string, number>();
  const items = segments.map((segment) => {
    const occurrence = seen.get(segment) ?? 0;
    seen.set(segment, occurrence + 1);
    return { id: `${segment}-${occurrence}`, label: segment };
  });
  return (
    <ol
      className="part0-scene__segment-labels"
      data-tone={output ? "output" : "selected"}
      aria-label="분리된 token 순서"
    >
      {items.map((item) => (
        <li key={item.id}>{item.label}</li>
      ))}
    </ol>
  );
}

export function TokenSegmentationSceneFigure(): ReactElement {
  const [state, setState] = useState<TokenSegmentationState>({
    mode: "concept",
    phase: "source",
    replay: 0,
  });
  const narrative = useVisualNarrative();
  const phase =
    narrative?.activeStage === "source" ||
    narrative?.activeStage === "boundaries" ||
    narrative?.activeStage === "split"
      ? narrative.activeStage
      : state.phase;
  const sceneState = { ...state, narrative: narrative !== null, phase };
  const example = TOKEN_UNIT_EXAMPLES[sceneState.mode];
  return (
    <SceneFigure
      annotations={
        <p
          className="part0-scene__note"
          data-mode={sceneState.mode}
          data-narrative={sceneState.narrative ? "true" : "false"}
          data-phase={sceneState.phase}
          data-testid="tokenization-unit-scene-state"
        >
          {sceneState.mode === "byte"
            ? "실제 byte tokenizer 예시"
            : "설명용 token 경계 예시"}
        </p>
      }
      aspectRatio={2.4}
      controls={
        <div className="part0-scene__controls">
          <SceneChoiceGroup
            choices={[
              { id: "concept", label: "설명용 token" },
              { id: "byte", label: "현재 byte" },
            ]}
            label="Token 예시 선택"
            onSelect={(mode) =>
              setState((current) => ({
                mode,
                phase: "source",
                replay: current.replay + 1,
              }))
            }
            selected={sceneState.mode}
          />
          {narrative === null ? (
            <SceneStepRail
              activeStep={sceneState.phase}
              label="Token 경계 단계"
              onReplay={() =>
                setState((current) => ({
                  ...current,
                  phase: "source",
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
              replayLabel="다시 나누기"
              steps={[
                { id: "source", label: "원문" },
                { id: "boundaries", label: "경계" },
                { id: "split", label: "경계 나누기" },
              ]}
            />
          ) : null}
        </div>
      }
      description="하나의 text strip에 tokenizer가 경계를 만들고 순서를 가진 token 단위로 분리하는 과정"
      fallback={<TokenComparisonDiagram />}
      figureId="decoder.diagram.tokenization.token"
      labels={
        <>
          <SceneStageLabel x={50} y={17} mobileX={50} mobileY={16}>
            {example.source}
          </SceneStageLabel>
          {sceneState.phase === "boundaries" || sceneState.phase === "split" ? (
            <SegmentLabels segments={example.segments} />
          ) : null}
        </>
      }
      loadScene={loadTokenSegmentationScene}
      state={sceneState}
      title="문장은 어디에서 token으로 나뉠까요?"
    />
  );
}

export function VocabularyAddressSceneFigure(): ReactElement {
  const [state, setState] = useState<VocabularyAddressState>({
    phase: "token",
    replay: 0,
    token: "the",
  });
  const id = state.token === "the" ? 91 : 42;
  return (
    <SceneFigure
      annotations={
        <p
          className="part0-scene__note"
          data-phase={state.phase}
          data-testid="vocabulary-scene-state"
          data-token={state.token}
        >
          ID {id}는 vocabulary 안의 주소이며 의미의 크기나 거리가 아닙니다.
        </p>
      }
      aspectRatio={1.9}
      controls={
        <div className="part0-scene__controls">
          <SceneChoiceGroup
            choices={[
              { id: "the", label: "the" },
              { id: "cat", label: "cat" },
            ]}
            label="Token 선택"
            onSelect={(token) =>
              setState((current) => ({
                phase: "token",
                replay: current.replay + 1,
                token,
              }))
            }
            selected={state.token}
          />
          <SceneStepRail
            activeStep={state.phase}
            label="Vocabulary 주소 단계"
            onReplay={() =>
              setState((current) => ({
                ...current,
                phase: "token",
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
            replayLabel="주소 다시 찾기"
            steps={[
              { id: "token", label: "Token" },
              { id: "address", label: "주소" },
              { id: "id", label: "Token ID" },
            ]}
          />
        </div>
      }
      description="Token이 vocabulary의 한 slot과 연결되고 그 위치가 Token ID가 되는 주소 lookup"
      fallback={<VocabularyAddressDiagram />}
      figureId="decoder.diagram.tokenization.vocabulary"
      labels={
        <>
          <SceneStageLabel
            mobileX={50}
            mobileY={12}
            tone={state.phase === "token" ? "selected" : "neutral"}
            x={17}
            y={16}
          >
            Token · {state.token}
          </SceneStageLabel>
          <SceneStageLabel
            mobileX={50}
            mobileY={48}
            tone={state.phase === "address" ? "selected" : "neutral"}
            x={50}
            y={16}
          >
            Vocabulary slot
          </SceneStageLabel>
          <SceneStageLabel
            mobileX={50}
            mobileY={85}
            tone={state.phase === "id" ? "output" : "neutral"}
            x={83}
            y={16}
          >
            ID {id}
          </SceneStageLabel>
        </>
      }
      loadScene={loadVocabularyAddressScene}
      state={state}
      title="Token은 어떻게 vocabulary 주소를 얻을까요?"
    />
  );
}

export function TokenizationMethodsSceneFigure(): ReactElement {
  const [state, setState] = useState<TokenizationMethodsState>({
    method: "word",
    phase: "source",
    replay: 0,
  });
  const segments = TOKENIZATION_SEGMENTS[state.method];
  return (
    <SceneFigure
      annotations={
        <p
          className="part0-scene__note"
          data-method={state.method}
          data-phase={state.phase}
          data-testid="tokenization-method-scene-state"
        >
          {state.method === "byte"
            ? "Current Byte는 실제 nanoGPT Edu tokenizer 경계입니다."
            : "비교를 위한 설명용 tokenization 예시입니다."}
        </p>
      }
      aspectRatio={2.55}
      controls={
        <div className="part0-scene__controls">
          <SceneChoiceGroup
            choices={[
              { id: "word", label: "Word" },
              { id: "character", label: "Character" },
              { id: "subword", label: "Subword" },
              { id: "byte", label: "Current Byte" },
            ]}
            label="Tokenization 방식"
            onSelect={(method) =>
              setState((current) => ({
                method,
                phase: "source",
                replay: current.replay + 1,
              }))
            }
            selected={state.method}
          />
          <SceneStepRail
            activeStep={state.phase}
            label="Tokenization 분할 단계"
            onReplay={() =>
              setState((current) => ({
                ...current,
                phase: "source",
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
            replayLabel="다시 비교하기"
            steps={[
              { id: "source", label: "같은 text" },
              { id: "split", label: "분할 보기" },
            ]}
          />
        </div>
      }
      description="같은 text가 Word, Character, Subword, Current Byte 방식에 따라 다른 경계로 다시 나뉘는 비교"
      fallback={<TokenizationMethodsDiagram />}
      figureId="decoder.diagram.tokenization.methods"
      labels={
        <>
          <SceneStageLabel x={50} y={17} mobileX={50} mobileY={16}>
            the cats
          </SceneStageLabel>
          {state.phase === "split" ? (
            <SegmentLabels
              output={state.method === "byte"}
              segments={segments}
            />
          ) : null}
        </>
      }
      loadScene={loadTokenizationMethodsScene}
      state={state}
      title="같은 text는 방식에 따라 어떻게 다시 나뉠까요?"
    />
  );
}
