import type { GlossaryEntry, LearningGuidePage } from "../../../../guideTypes";
import {
  type CurriculumAuthorshipProvenance,
  curriculumAuthorshipProvenance,
} from "../../references";
import type { DiagramId, ReferenceId } from "../../types";

export const part1Glossary = [
  {
    id: "language-model",
    term: "언어 모델",
    definition:
      "이전 token들을 바탕으로 다음 token 후보의 점수를 계산하는 모델입니다.",
  },
  {
    id: "context",
    term: "context",
    definition: "현재 예측에 입력되는 앞선 token들의 순서입니다.",
  },
  {
    id: "decoder-only",
    term: "decoder-only",
    definition:
      "앞선 위치만 참고하며 다음 token을 예측하는 Transformer 구성입니다.",
  },
  {
    id: "lm-head",
    term: "LM head",
    definition:
      "마지막 hidden state를 vocabulary 크기의 후보 점수로 투영하는 층입니다.",
  },
  {
    id: "softmax",
    term: "softmax",
    definition: "후보 점수들을 합이 1인 확률 분포로 바꾸는 연산입니다.",
  },
  {
    id: "probability-distribution",
    term: "probability distribution",
    definition: "서로 배타적인 후보에 배정된 확률들의 모음입니다.",
  },
  {
    id: "sampler",
    term: "sampler",
    definition:
      "생성 설정을 적용한 분포에서 다음 token을 선택하는 구성 요소입니다.",
  },
  {
    id: "selected-token",
    term: "selected token",
    definition: "한 생성 단계에서 실제로 고른 다음 token입니다.",
  },
  {
    id: "conditional-probability",
    term: "조건부 확률",
    definition: "주어진 정보가 있을 때 어떤 사건이 일어날 확률입니다.",
  },
  {
    id: "joint-probability",
    term: "joint probability",
    definition: "여러 사건이 정해진 순서로 함께 일어날 확률입니다.",
  },
  {
    id: "chain-rule",
    term: "chain rule",
    definition:
      "공동 확률을 prefix별 조건부 확률의 곱으로 분해하는 규칙입니다.",
  },
  {
    id: "prefix",
    term: "prefix",
    definition: "현재 위치보다 앞에 놓인 token들의 순서입니다.",
  },
  {
    id: "autoregressive",
    term: "autoregressive",
    definition:
      "방금 고른 출력을 다음 입력에 포함해 한 단계씩 이어 가는 생성 방식입니다.",
  },
  {
    id: "generation-step",
    term: "generation step",
    definition:
      "현재 context에서 다음 token 하나를 예측하고 선택해 붙이는 한 차례입니다.",
  },
  {
    id: "terminal-reason",
    term: "terminal reason",
    definition:
      "한 generation run이 더 진행되지 않고 끝난 원인을 나타내는 값입니다.",
  },
] as const satisfies readonly GlossaryEntry[];

export type Part1Authorship = CurriculumAuthorshipProvenance & {
  readonly runtimeExample: "symbolic";
};

export const part1Authorship = {
  ...curriculumAuthorshipProvenance,
  runtimeExample: "symbolic",
} as const satisfies Part1Authorship;

export type Part1ChapterContent = {
  readonly page: LearningGuidePage<string>;
  readonly currentModelCalloutId: `current-model.${string}`;
  readonly primaryDiagramId: DiagramId;
  readonly referenceIds: readonly [ReferenceId, ReferenceId, ReferenceId];
  readonly misconceptionIds: readonly string[];
  readonly authorship: Part1Authorship;
};
