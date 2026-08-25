import type { GlossaryEntry, LearningGuidePage } from "../../../../guideTypes";
import {
  type CurriculumAuthorshipProvenance,
  curriculumAuthorshipProvenance,
} from "../../references";
import type { DiagramId, ReferenceId } from "../../types";

export const part2Glossary = [
  {
    id: "embedding",
    term: "embedding",
    definition: "Token ID가 가리키는 학습된 연속 숫자 vector입니다.",
  },
  {
    id: "lookup-table",
    term: "lookup table",
    definition: "주소로 한 행을 찾아 읽는 학습 파라미터 표입니다.",
  },
  {
    id: "vocab",
    term: "Vocab",
    definition: "Embedding table에서 token 주소가 차지하는 행의 수입니다.",
  },
  {
    id: "channel",
    term: "channel C",
    definition: "각 token 표현을 이루는 숫자 성분의 개수입니다.",
  },
  {
    id: "position-embedding",
    term: "position embedding",
    definition: "Sequence 안의 절대 위치를 나타내는 학습된 vector입니다.",
  },
  {
    id: "learned-absolute-position",
    term: "learned absolute position",
    definition: "위치 번호마다 별도 학습 행을 조회하는 방식입니다.",
  },
  {
    id: "element-wise-addition",
    term: "element-wise addition",
    definition: "같은 shape의 두 vector에서 대응 성분끼리 더하는 연산입니다.",
  },
  {
    id: "x-zero",
    term: "X_0",
    definition: "Token과 position embedding을 더한 첫 hidden state입니다.",
  },
  {
    id: "hidden-state",
    term: "hidden state",
    definition: "각 위치에서 다음 계산으로 전달되는 현재 내부 표현입니다.",
  },
  {
    id: "transformer-block",
    term: "Transformer Block",
    definition:
      "Hidden state에 문맥 정보를 반영해 같은 경계 shape로 내보내는 계산 단위입니다.",
  },
  {
    id: "causal-prefix",
    term: "causal prefix",
    definition:
      "한 위치가 참고할 수 있는 시작부터 현재 위치까지의 token 범위입니다.",
  },
  {
    id: "shape",
    term: "shape",
    definition: "Tensor 축의 순서와 각 축의 크기를 나타내는 표기입니다.",
  },
] as const satisfies readonly GlossaryEntry[];

export type Part2Authorship = CurriculumAuthorshipProvenance & {
  readonly runtimeExample: "symbolic-with-typed-current-facts";
};

export const part2Authorship = {
  ...curriculumAuthorshipProvenance,
  runtimeExample: "symbolic-with-typed-current-facts",
} as const satisfies Part2Authorship;

export type Part2ChapterContent = {
  readonly page: LearningGuidePage<string>;
  readonly currentModelCalloutId: `current-model.${string}`;
  readonly runtimeFactsAdapterId: `current-model.${string}`;
  readonly primaryDiagramId: DiagramId;
  readonly referenceIds: readonly [ReferenceId, ReferenceId, ReferenceId];
  readonly misconceptionIds: readonly string[];
  readonly authorship: Part2Authorship;
};
