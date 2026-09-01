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
  language:
    "사람이 문장을 읽고 단어 사이의 관계와 문장 전체의 의미를 자연스럽게 받아들이는 모습을 보여줍니다.",
  numeric:
    "문장이 아래쪽 화살표를 따라 실제 모델 값이 아닌 한 줄의 설명용 숫자 표현으로 이어집니다.",
  transform:
    "같은 여섯 숫자 칸에서 계산 전 값이 아래쪽 화살표를 따라 계산 후 값으로 바뀌는 모습을 보여줍니다.",
  result:
    "계산된 숫자 표현을 문장 분류 결과로 읽어 개념적인 긍정 예시로 보여주고, 질문 답변과 번역과 글 생성은 다른 자연어 처리 문제로 구분합니다.",
  "token-preview":
    "처음 문장에 개념적인 경계가 순서대로 나타나며 다음 Token Chapter로 이어집니다.",
};

const VISUAL_DESCRIPTION =
  "문장이 여러 숫자로 이루어진 표현으로 바뀌고, 그 숫자들이 계산 과정에서 다른 값으로 변한 뒤 사람이 이해할 수 있는 결과로 연결되는 개념을 보여줍니다.";

const PHRASES = [
  { boundaryStep: 1, id: "today", text: "오늘", trailingSpace: true },
  { boundaryStep: 2, id: "movie", text: "영화", trailingSpace: true },
  { boundaryStep: 3, id: "really", text: "정말", trailingSpace: true },
  {
    boundaryStep: 4,
    id: "enjoyed",
    text: "재미있었어요",
    trailingSpace: false,
  },
  { boundaryStep: null, id: "period", text: ".", trailingSpace: false },
] as const;

const NUMERIC_VALUES = [
  { id: "value-1", before: "0.24", after: "0.51" },
  { id: "value-2", before: "-0.71", after: "-0.12" },
  { id: "value-3", before: "0.18", after: "0.84" },
  { id: "value-4", before: "0.63", after: "0.27" },
  { id: "value-5", before: "-0.09", after: "0.36" },
  { id: "ellipsis", before: "…", after: "…" },
] as const;

const OTHER_NLP_TASKS = ["질문 답변", "번역", "글 생성"] as const;

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
              data-nlp-boundary-step={phrase.boundaryStep ?? undefined}
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
          <span className="nlp-golden__numeric-action" data-nlp-calculation-cue>
            <span data-nlp-action="numeric">숫자로 표현</span>
            <span data-nlp-action="transform">여러 계산</span>
            <span className="nlp-golden__action-arrow">↓</span>
          </span>
          <span
            className="nlp-golden__numeric-strip"
            data-nlp-representation="sequence"
            data-testid="nlp-golden-numeric-strip"
          >
            {NUMERIC_VALUES.map((value) => (
              <span data-nlp-value={value.id} key={value.id}>
                <span data-value-phase="before">{value.before}</span>
                {value.id === "ellipsis" ? null : (
                  <span
                    className="nlp-golden__value-arrow"
                    data-value-change-direction="down"
                  >
                    ↓
                  </span>
                )}
                <span data-value-phase="after">{value.after}</span>
              </span>
            ))}
          </span>
          <span className="nlp-golden__example-note">
            설명을 위한 예시 · 실제 모델 값 아님
          </span>
        </div>
        <div
          className="nlp-golden__result"
          data-testid="nlp-golden-result"
          aria-hidden="true"
        >
          <span
            className="nlp-golden__result-connector"
            data-nlp-result-connector
          >
            문장 분류로 읽기
            <span>↓</span>
          </span>
          <p className="nlp-golden__result-primary">
            <span>문장의 분위기</span>
            <strong data-nlp-result-value>긍정</strong>
          </p>
          <span className="nlp-golden__result-task" data-nlp-result-task>
            개념 예시 · 문장 분류
          </span>
          <div className="nlp-golden__other-tasks">
            <span>다른 자연어 처리 문제</span>
            <p>
              {OTHER_NLP_TASKS.map((task) => (
                <span data-nlp-other-task key={task}>
                  {task}
                </span>
              ))}
            </p>
          </div>
        </div>
        <p className="nlp-golden__token-note" aria-hidden="true">
          개념적 경계 · 실제 경계는 토크나이저에 따라 달라집니다.
        </p>
        <p className="learning-visually-hidden" id={descriptionId}>
          {VISUAL_DESCRIPTION} {STAGE_SUMMARIES[stage]}
        </p>
      </div>
      <a
        className="nlp-golden__handoff"
        data-next-chapter={showsHandoff ? "decoder.chapter.0.2" : undefined}
        href="#/learn/decoder-only-fundamentals/0-2"
        aria-label={showsHandoff ? "다음: Token이란?" : undefined}
        tabIndex={showsHandoff ? undefined : -1}
      >
        Token이란? →
      </a>
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
