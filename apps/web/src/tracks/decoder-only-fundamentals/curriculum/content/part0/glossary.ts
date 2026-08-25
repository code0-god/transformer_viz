import type { GlossaryEntry, LearningGuidePage } from "../../../../guideTypes";
import {
  type CurriculumAuthorshipProvenance,
  curriculumAuthorshipProvenance,
} from "../../references";
import type { DiagramId, ReferenceId } from "../../types";

export const part0Glossary = [
  {
    id: "natural-language",
    term: "자연어",
    definition: "사람이 일상에서 뜻을 주고받기 위해 사용하는 언어입니다.",
  },
  {
    id: "inference",
    term: "추론",
    definition: "학습이 끝난 가중치로 입력에 대한 출력을 계산하는 과정입니다.",
  },
  {
    id: "logit",
    term: "logit",
    definition: "확률로 정규화되기 전, 모델이 각 후보에 부여한 점수입니다.",
  },
  {
    id: "pretrained-weights",
    term: "사전 학습 가중치",
    definition: "추론 전에 학습되어 모델 내부에 저장된 수치입니다.",
  },
  {
    id: "token",
    term: "토큰(token)",
    definition: "모델이 순서열의 한 칸으로 다루는 텍스트 단위입니다.",
  },
  {
    id: "token-boundary",
    term: "token boundary",
    definition: "한 token이 끝나고 다음 token이 시작되는 경계입니다.",
  },
  {
    id: "byte",
    term: "byte",
    definition: "컴퓨터가 데이터를 저장하는 8-bit 단위입니다.",
  },
  {
    id: "subword",
    term: "subword",
    definition:
      "단어 전체보다 작고 문자 하나보다 클 수도 있는 token 단위입니다.",
  },
  {
    id: "vocabulary",
    term: "vocabulary",
    definition: "token과 token ID의 대응을 정한 목록입니다.",
  },
  {
    id: "token-id",
    term: "token ID",
    definition: "vocabulary의 한 항목을 가리키는 정수 주소입니다.",
  },
  {
    id: "bos",
    term: "BOS",
    definition: "sequence 시작을 표시하는 예약 token입니다.",
  },
  {
    id: "eos",
    term: "EOS",
    definition: "sequence 끝을 표시하는 예약 token입니다.",
  },
  {
    id: "unk",
    term: "UNK",
    definition: "표현할 수 없는 입력을 표시하도록 예약된 token입니다.",
  },
  {
    id: "context-length",
    term: "context length",
    definition: "한 번의 forward에서 모델이 참고하는 token 수입니다.",
  },
  {
    id: "word-level",
    term: "word-level",
    definition: "단어를 기본 token 단위로 삼는 방식입니다.",
  },
  {
    id: "character-level",
    term: "character-level",
    definition: "문자를 기본 token 단위로 삼는 방식입니다.",
  },
  {
    id: "bpe",
    term: "BPE",
    definition:
      "자주 함께 나타나는 단위를 병합해 subword vocabulary를 만드는 계열의 방식입니다.",
  },
  {
    id: "byte-fallback",
    term: "byte fallback",
    definition: "텍스트를 UTF-8 byte 단위까지 내려가 표현하는 방식입니다.",
  },
  {
    id: "sequence-length",
    term: "sequence length",
    definition: "tokenization 뒤 sequence에 들어 있는 token 수입니다.",
  },
] as const satisfies readonly GlossaryEntry[];

type Part0RuntimeExample = "symbolic" | "rust-generated-fixture";

export type Part0Authorship<
  RuntimeExample extends Part0RuntimeExample = Part0RuntimeExample,
> = CurriculumAuthorshipProvenance & {
  readonly runtimeExample: RuntimeExample;
};

export function part0Authorship<
  const RuntimeExample extends Part0RuntimeExample,
>(runtimeExample: RuntimeExample): Part0Authorship<RuntimeExample> {
  return { ...curriculumAuthorshipProvenance, runtimeExample };
}

export type Part0ChapterContent = {
  readonly page: LearningGuidePage<string>;
  readonly primaryDiagramId: DiagramId;
  readonly referenceIds: readonly [ReferenceId, ReferenceId, ReferenceId];
  readonly misconceptionIds: readonly string[];
  readonly authorship: Part0Authorship;
};
