import { type ReactElement, useId } from "react";

import { useVisualNarrative } from "../../../../VisualNarrative";

import "./nlpGoldenNarrative.css";

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
  numeric: "계산 가능한 표현",
  transform: "표현이 계산으로 변하는 중",
  result: "사람이 사용하는 결과",
  "token-preview": "다음 질문",
};

const STAGE_SUMMARIES: Readonly<Record<NlpGoldenStage, string>> = {
  language: "사람이 “오늘 영화 정말 재미있었어요.”라는 문장을 읽습니다.",
  numeric:
    "같은 문장 아래에 여러 숫자가 모인 하나의 개념적인 표현이 나타나 계산 가능한 형태로 연결됩니다.",
  transform:
    "같은 숫자 표현의 배치와 크기는 유지되고 색과 연결 강조가 달라지며 계산에 따른 변화를 보여줍니다.",
  result:
    "변화한 숫자 표현이 문장의 긍정적인 분위기와 분류, 답변, 번역, 글 생성 같은 활용 결과로 이어집니다.",
  "token-preview":
    "처음 문장에 개념적인 경계가 나타나며 다음 Chapter에서 문장을 작은 단위로 나누는 질문으로 이어집니다.",
};

const PHRASES = [
  { id: "today", text: "오늘", trailingSpace: true },
  { id: "movie", text: "영화", trailingSpace: true },
  { id: "really", text: "정말", trailingSpace: true },
  { id: "enjoyed", text: "재미있었어요", trailingSpace: false },
  { id: "period", text: ".", trailingSpace: false },
] as const;

const NUMERIC_CELLS = [
  "field-01",
  "field-02",
  "field-03",
  "field-04",
  "field-05",
  "field-06",
  "field-07",
  "field-08",
  "field-09",
  "field-10",
  "field-11",
  "field-12",
  "field-13",
  "field-14",
  "field-15",
  "field-16",
] as const;

const RESULT_RANGE = [
  ["분류", "긍정"],
  ["질문 답변", "관련 답변"],
  ["번역", "다른 언어"],
  ["글 생성", "이어지는 문장"],
] as const;

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
          className="nlp-golden__cells"
          data-testid="nlp-golden-cells"
          aria-hidden="true"
        >
          <span
            className="nlp-golden__numeric-field"
            data-nlp-columns="8"
            data-nlp-mobile-columns="6"
            data-nlp-representation="single"
            data-nlp-rows="2"
            data-testid="nlp-golden-numeric-field"
          >
            {NUMERIC_CELLS.map((cell) => (
              <span data-nlp-cell={cell} key={cell} />
            ))}
          </span>
          <span className="nlp-golden__cells-label">계산 가능한 숫자 표현</span>
        </div>
        <svg
          className="nlp-golden__transform-lines"
          viewBox="0 0 560 96"
          aria-hidden="true"
        >
          <path d="M42 68C116 10 188 10 260 68" />
          <path d="M148 76C222 26 338 26 412 76" />
          <path d="M300 68C374 10 446 10 518 68" />
        </svg>
        <div className="nlp-golden__result" aria-hidden="true">
          <p>
            <span>이 문장의 분위기</span>
            <strong>긍정</strong>
          </p>
          <div className="nlp-golden__result-range">
            {RESULT_RANGE.map(([task, outcome]) => (
              <span key={task}>
                <b>{task}</b>
                {outcome}
              </span>
            ))}
          </div>
        </div>
        <p className="nlp-golden__token-note" aria-hidden="true">
          개념적 경계 · 실제 경계는 토크나이저에 따라 달라집니다.
        </p>
        <p className="learning-visually-hidden" id={descriptionId}>
          {STAGE_SUMMARIES[stage]}
        </p>
      </div>
      <fieldset
        className="nlp-golden__fallback learning-visually-hidden"
        aria-label="자연어 처리란? 의미 설명"
      >
        <legend>자연어 처리 연속 설명 상태</legend>
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
