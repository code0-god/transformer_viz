import { type ReactElement, useId } from "react";

import { useVisualNarrative } from "../../../../VisualNarrative";

import "./nlpGoldenNarrative.css";
import "./nlpGoldenNarrativeStates.css";

export const NLP_GOLDEN_STAGES = [
  "language",
  "numeric",
  "transform",
  "result",
  "token-preview",
] as const;

export type NlpGoldenStage = (typeof NLP_GOLDEN_STAGES)[number];

const STAGE_LABELS: Readonly<Record<NlpGoldenStage, string>> = {
  language: "사람이 읽는 문장",
  numeric: "언어를 숫자로",
  transform: "모델의 계산",
  result: "사람이 사용하는 결과",
  "token-preview": "다음 질문",
};

const STAGE_SUMMARIES: Readonly<Record<NlpGoldenStage, string>> = {
  language: "사람이 문장을 읽고 의미와 분위기를 이해합니다.",
  numeric:
    "같은 문장 아래에 실제 모델 값이 아닌 설명용 숫자 표현이 나타납니다.",
  transform: "같은 숫자 표현의 값이 계산 전 값에서 계산 후 값으로 바뀝니다.",
  result:
    "변화한 숫자 표현이 개념적인 긍정 결과와 여러 활용 형태로 이어집니다.",
  "token-preview":
    "처음 문장에 개념적인 경계가 나타나며 Token Chapter로 이어집니다.",
};

const VISUAL_DESCRIPTION =
  "문장이 여러 숫자로 이루어진 표현으로 바뀌고, 그 숫자들이 계산 과정에서 다른 값으로 변한 뒤 사람이 이해할 수 있는 결과로 연결되는 개념을 보여줍니다.";

const PHRASES = [
  { id: "today", text: "오늘", trailingSpace: true },
  { id: "movie", text: "영화", trailingSpace: true },
  { id: "really", text: "정말", trailingSpace: true },
  { id: "enjoyed", text: "재미있었어요", trailingSpace: false },
  { id: "period", text: ".", trailingSpace: false },
] as const;

const NUMERIC_VALUES = [
  { id: "value-1", before: "0.24", after: "0.51" },
  { id: "value-2", before: "-0.71", after: "-0.12" },
  { id: "value-3", before: "0.18", after: "0.84" },
  { id: "value-4", before: "0.63", after: "0.27" },
  { id: "value-5", before: "-0.09", after: "0.36" },
  { id: "ellipsis", before: "…", after: "…" },
] as const;

const RESULT_SCOPE = ["분류", "질문 답변", "번역", "글 생성"] as const;

function isNlpGoldenStage(stage: string | undefined): stage is NlpGoldenStage {
  switch (stage) {
    case "language":
    case "numeric":
    case "transform":
    case "result":
    case "token-preview":
      return true;
    default:
      return false;
  }
}

export function NlpPipelineDiagram(): ReactElement {
  const narrative = useVisualNarrative();
  const stage = isNlpGoldenStage(narrative?.activeStage)
    ? narrative.activeStage
    : "language";
  const descriptionId = useId();
  const showsHandoff = stage === "token-preview";

  return (
    <div className="nlp-golden" data-nlp-stage={stage}>
      <div
        className="nlp-golden__visual"
        data-testid="nlp-golden-visual"
        data-nlp-stage={stage}
        role="img"
        aria-label="자연어 처리 연속 설명"
        aria-describedby={descriptionId}
      >
        <span className="nlp-golden__state-label" aria-hidden="true">
          {STAGE_LABELS[stage]}
        </span>
        <p
          className="nlp-golden__sentence"
          data-testid="nlp-golden-sentence"
          aria-hidden="true"
        >
          {PHRASES.map((phrase) => (
            <span
              data-nlp-phrase={phrase.id}
              data-nlp-space={phrase.trailingSpace ? "true" : "false"}
              key={phrase.id}
            >
              {phrase.text}
              {phrase.trailingSpace ? " " : null}
            </span>
          ))}
        </p>
        <div
          className="nlp-golden__numeric"
          data-testid="nlp-golden-numeric"
          aria-hidden="true"
        >
          <p className="nlp-golden__before-trace">
            <span>계산 전</span>
            <span>[ 0.24 -0.71 0.18 0.63 -0.09 … ]</span>
          </p>
          <span className="nlp-golden__numeric-label">
            계산 가능한 숫자 표현
          </span>
          <span className="nlp-golden__after-label">계산 후</span>
          <span
            className="nlp-golden__numeric-strip"
            data-nlp-representation="sequence"
            data-testid="nlp-golden-numeric-strip"
          >
            {NUMERIC_VALUES.map((value) => (
              <span data-nlp-value={value.id} key={value.id}>
                <span data-value-phase="before">{value.before}</span>
                <span data-value-phase="after">{value.after}</span>
              </span>
            ))}
          </span>
          <span className="nlp-golden__example-note">
            설명을 위한 예시 · 실제 모델 값 아님
          </span>
        </div>
        <div className="nlp-golden__result" aria-hidden="true">
          <span>개념 예시</span>
          <p>
            <span>이 문장의 분위기</span>
            <strong>긍정</strong>
          </p>
          <p className="nlp-golden__result-range">{RESULT_SCOPE.join(" · ")}</p>
        </div>
        <p className="nlp-golden__token-note" aria-hidden="true">
          개념적 경계 · 실제 경계는 토크나이저에 따라 달라집니다.
        </p>
        <p className="learning-visually-hidden" id={descriptionId}>
          {VISUAL_DESCRIPTION} {STAGE_SUMMARIES[stage]}
        </p>
      </div>
      {showsHandoff ? (
        <a
          className="nlp-golden__handoff"
          data-next-chapter="decoder.chapter.0.2"
          href="#/learn/decoder-only-fundamentals/0-2"
          aria-label="다음: Token이란?"
        >
          Token이란? →
        </a>
      ) : null}
      <fieldset
        className="nlp-golden__fallback learning-visually-hidden"
        aria-label="자연어 처리란? 의미 설명"
      >
        <legend>자연어 처리 단계 설명</legend>
        <ol>
          {NLP_GOLDEN_STAGES.map((item) => (
            <li
              aria-current={item === stage ? "step" : undefined}
              data-nlp-fallback-stage={item}
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
