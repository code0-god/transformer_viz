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
  language: "사람이 오늘 영화 정말 재미있었어요라는 문장을 읽습니다.",
  numeric:
    "같은 문장 아래에 개념적인 숫자 셀 배열이 나타나 계산 가능한 표현으로 연결됩니다.",
  transform:
    "같은 숫자 셀의 위치 관계와 강조가 달라지며 모델 내부 계산에 따른 표현 변화를 보여줍니다.",
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

const CELL_GROUPS = [
  ["today-0", "today-1", "today-2", "today-3", "today-4", "today-5"],
  ["movie-0", "movie-1", "movie-2", "movie-3", "movie-4", "movie-5"],
  ["really-0", "really-1", "really-2", "really-3", "really-4", "really-5"],
  [
    "enjoyed-0",
    "enjoyed-1",
    "enjoyed-2",
    "enjoyed-3",
    "enjoyed-4",
    "enjoyed-5",
  ],
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
          {CELL_GROUPS.map((cells, groupIndex) => (
            <span
              className="nlp-golden__cell-group"
              data-nlp-cell-group={groupIndex + 1}
              key={cells[0]}
            >
              {cells.map((cell) => (
                <span data-nlp-cell={cell} key={cell} />
              ))}
            </span>
          ))}
          <span className="nlp-golden__cells-label">개념적 숫자 표현</span>
        </div>
        <svg
          className="nlp-golden__transform-lines"
          viewBox="0 0 640 160"
          aria-hidden="true"
        >
          <path d="M72 106C142 20 214 20 284 106" />
          <path d="M188 118C256 52 334 52 402 118" />
          <path d="M316 106C386 20 458 20 528 106" />
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
          개념적 경계 · 실제 경계는 tokenizer에 따라 달라집니다.
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
