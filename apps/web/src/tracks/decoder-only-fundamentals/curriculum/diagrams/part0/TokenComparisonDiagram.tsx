import { type ReactElement, useId } from "react";

import { useVisualNarrative } from "../../../../VisualNarrative";

import "./tokenGoldenNarrative.css";
import "./tokenGoldenNarrativeStates.css";

export const TOKEN_GOLDEN_STAGES = [
  "why-split",
  "token-units",
  "not-word",
  "current-byte",
  "next-token-id",
] as const;

export type TokenGoldenStage = (typeof TOKEN_GOLDEN_STAGES)[number];

const STAGE_LABELS: Readonly<Record<TokenGoldenStage, string>> = {
  "why-split": "어디에서 나눌까요?",
  "token-units": "순서를 가진 처리 단위",
  "not-word": "Token은 단어와 다를 수 있음",
  "current-byte": "",
  "next-token-id": "다음 질문",
};

const STAGE_SUMMARIES: Readonly<Record<TokenGoldenStage, string>> = {
  "why-split":
    "앞 Chapter의 문장에 설명용 경계가 나타나 순서를 가진 작은 단위들로 나눌 위치를 보여줍니다. 실제 경계는 토크나이저가 정합니다.",
  "token-units":
    "같은 문장이 다섯 개의 순서 있는 단위로 분리되며, 모델이 순서열의 한 칸으로 다루는 각각의 텍스트 단위를 Token이라고 설명합니다.",
  "not-word":
    "사람이 한 단어로 보는 cats가 토크나이저에 따라 cat과 s 두 Token으로 나뉠 수 있음을 설명용 예시로 보여줍니다.",
  "current-byte":
    "현재 nanoGPT Edu가 byte 단위를 사용하며 ASCII cat의 내용이 c, a, t 세 byte Token으로 나뉨을 보여줍니다.",
  "next-token-id":
    "c Token이 선택되어 아래쪽의 Token ID 질문으로 이어지며, 실제 숫자 연결은 다음 Chapter에서 살펴본다는 점을 보여줍니다.",
};

const CONCEPTUAL_TOKENS = [
  { id: "today", text: "오늘" },
  { id: "movie", text: "영화" },
  { id: "really", text: "정말" },
  { id: "enjoyed", text: "재미있었어요" },
  { id: "period", text: "." },
] as const;

const CURRENT_BYTE_TOKENS = [
  { id: "c", text: "c" },
  { id: "a", text: "a" },
  { id: "t", text: "t" },
] as const;

function isTokenGoldenStage(
  stage: string | undefined,
): stage is TokenGoldenStage {
  switch (stage) {
    case "why-split":
    case "token-units":
    case "not-word":
    case "current-byte":
    case "next-token-id":
      return true;
    default:
      return false;
  }
}

export function TokenComparisonDiagram(): ReactElement {
  const narrative = useVisualNarrative();
  const stage = isTokenGoldenStage(narrative?.activeStage)
    ? narrative.activeStage
    : "why-split";
  const descriptionId = useId();
  const mappingArrowheadId = useId();
  const showsHandoff = stage === "next-token-id";

  return (
    <div className="token-golden" data-token-stage={stage}>
      <div
        className="token-golden__visual"
        data-token-golden-visual
        data-token-stage={stage}
        role="img"
        aria-label="Token 분절 연속 설명"
        aria-describedby={descriptionId}
      >
        <span className="token-golden__state-label" aria-hidden="true">
          {STAGE_LABELS[stage]}
        </span>
        <div className="token-golden__scene" aria-hidden="true">
          <div className="token-golden__conceptual">
            <div className="token-golden__conceptual-rail" data-token-sentence>
              {CONCEPTUAL_TOKENS.map((token, index) => (
                <span
                  className="token-golden__chip"
                  data-token-sequence="conceptual"
                  key={token.id}
                >
                  <span>{token.text}</span>
                  {index === CONCEPTUAL_TOKENS.length - 1 ? null : (
                    <span
                      className="token-golden__boundary"
                      data-token-boundary
                    />
                  )}
                  <span className="token-golden__ordinal" data-token-ordinal>
                    {index + 1}
                  </span>
                </span>
              ))}
            </div>
            <p
              className="token-golden__concept-note"
              data-token-example="conceptual"
            >
              개념적 경계 · 실제 경계는 토크나이저가 정합니다.
            </p>
          </div>

          <div className="token-golden__resegment">
            <p className="token-golden__word">
              <span>사람이 보는 한 단어</span>
              <strong data-token-resegmentation="whole">cats</strong>
            </p>
            <div
              className="token-golden__segmentation-preview"
              data-token-segmentation="word-to-token-pieces"
            >
              <span data-token-segment-preview>cat</span>
              <span
                className="token-golden__segment-boundary"
                data-token-segment-boundary
              />
              <span data-token-segment-preview>s</span>
            </div>
            <div
              className="token-golden__resegment-rail"
              data-token-rail="wordpiece"
              data-token-rail-layout="intrinsic"
            >
              <span
                className="token-golden__chip"
                data-token-resegmentation="split"
              >
                <span data-token-chip-content>cat</span>
              </span>
              <span
                className="token-golden__chip"
                data-token-resegmentation="split"
              >
                <span data-token-chip-content>s</span>
              </span>
            </div>
            <p className="token-golden__example-note">설명용 예시</p>
          </div>

          <div
            className="token-golden__current"
            data-current-tokenizer="byte_fallback_v1"
          >
            <span className="token-golden__current-marker">
              현재 nanoGPT Edu · byte 기반
            </span>
            <strong className="token-golden__current-source">cat</strong>
            <div
              className="token-golden__segmentation-preview"
              data-token-segmentation="text-to-byte-tokens"
            >
              {CURRENT_BYTE_TOKENS.map((token, index) => (
                <span key={token.id}>
                  <span data-token-segment-preview>{token.text}</span>
                  {index === CURRENT_BYTE_TOKENS.length - 1 ? null : (
                    <span
                      className="token-golden__segment-boundary"
                      data-token-segment-boundary
                    />
                  )}
                </span>
              ))}
            </div>
            <div
              className="token-golden__byte-rail"
              data-token-rail="byte"
              data-token-rail-layout="intrinsic"
            >
              {CURRENT_BYTE_TOKENS.map((token) => (
                <span
                  className="token-golden__chip"
                  data-current-byte-token={token.id}
                  data-token-selected={
                    showsHandoff && token.id === "c" ? "true" : undefined
                  }
                  key={token.id}
                >
                  <span data-token-chip-content>{token.text}</span>
                </span>
              ))}
            </div>
            <p className="token-golden__korean-note">
              ASCII 예시에서 c, a, t는 각각 한 byte입니다.
            </p>
            <svg
              className="token-golden__connector token-golden__mapping-arrow"
              data-token-connector="mapping"
              data-token-direction="down"
              data-token-transformation="token-to-id-question"
              viewBox="0 0 12 44"
              aria-hidden="true"
              focusable="false"
            >
              <defs>
                <marker
                  id={mappingArrowheadId}
                  markerWidth="5"
                  markerHeight="4.75"
                  refX="4.5"
                  refY="2.375"
                  orient="auto"
                  markerUnits="strokeWidth"
                >
                  <path d="M 0 0 L 5 2.375 L 0 4.75 Z" fill="currentColor" />
                </marker>
              </defs>
              <line
                x1="6"
                y1="2"
                x2="6"
                y2="35"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
                vectorEffect="non-scaling-stroke"
                markerEnd={`url(#${mappingArrowheadId})`}
              />
            </svg>
            <div className="token-golden__identity">
              <span data-token-identity-label="token-id">Token ID</span>
              <strong data-token-identity="unknown">?</strong>
              <span>숫자로 어떻게 가리킬까?</span>
            </div>
          </div>
        </div>
        <p className="learning-visually-hidden" id={descriptionId}>
          {STAGE_SUMMARIES[stage]}
          {showsHandoff ? (
            <>
              <span data-token-semantic="selected-token">선택된 Token: c.</span>
              <span data-token-semantic="unknown-token-id">
                Token ID: 알 수 없음.
              </span>
            </>
          ) : null}
        </p>
      </div>
      <fieldset
        className="token-golden__fallback learning-visually-hidden"
        aria-label="Token이란? 의미 설명"
      >
        <legend>Token 단계 설명</legend>
        <ol>
          {TOKEN_GOLDEN_STAGES.map((item) => (
            <li
              aria-current={item === stage ? "step" : undefined}
              data-token-fallback-stage={item}
              key={item}
            >
              {STAGE_SUMMARIES[item]}
            </li>
          ))}
        </ol>
      </fieldset>
    </div>
  );
}
