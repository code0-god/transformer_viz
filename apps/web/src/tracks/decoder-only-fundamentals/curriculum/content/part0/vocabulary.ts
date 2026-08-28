import {
  type CurriculumToken,
  curriculumTokenExamples,
} from "../../generated/tokenExamples";
import { type Part0ChapterContent, part0Authorship } from "./glossary";

const example = curriculumTokenExamples.find(({ id }) => id === "the-cat");
if (example === undefined)
  throw new Error("Generated the-cat example is missing");
const tokenLine = (tokens: readonly CurriculumToken[]): string =>
  tokens.map(({ display, id }) => `${display}→${id}`).join(" · ");

export const vocabularyChapterContent = {
  page: {
    id: "decoder.curriculum.guide.0.3",
    routeId: "decoder.root",
    title: "Vocabulary와 Token ID",
    learningGoal:
      "vocabulary 주소와 embedding에서 시작하는 의미 계산을 분리한다.",
    outline: "hidden",
    visualActions: [
      {
        id: "decoder.diagram.tokenization.vocabulary",
        kind: "diagram",
        label: "Token과 ID 연결 보기",
      },
    ],
    introduction: [
      {
        id: "intro",
        kind: "paragraph",
        text: "Vocabulary는 token 표기와 정수 ID를 연결하는 주소록입니다. 주소를 안다는 것과 그 token의 의미를 계산한다는 것은 서로 다른 단계입니다.",
      },
    ],
    sections: [
      {
        id: "decoder.curriculum.guide.0.3.section",
        title: "주소, 순서, 의미",
        primaryNodeId: "decoder.root.token-embedding",
        blocks: [
          {
            id: "p.address",
            kind: "paragraph",
            text: "Token ID는 vocabulary의 한 행을 찾기 위한 정수 주소입니다. 숫자의 크기나 두 ID 사이의 차이는 의미의 크기나 유사도를 나타내지 않습니다.",
          },
          {
            id: "p.embedding",
            kind: "paragraph",
            text: "모델의 의미 계산은 ID를 embedding table의 행으로 조회하면서 시작됩니다. 같은 ID는 같은 행을 가리키지만, ID 자체는 그 행의 vector가 아닙니다.",
          },
          {
            id: "p.sequence",
            kind: "paragraph",
            text: "Sequence에서는 token의 주소뿐 아니라 순서가 보존되어야 합니다. Display encoding은 문서 경계를 보이기 위해 BOS와 EOS를 모두 포함합니다.",
          },
          {
            id: "p.prefix",
            kind: "paragraph",
            text: "Generation prefix는 앞으로 token을 이어 붙일 입력이므로 BOS 뒤에 실제 byte token을 두고 끝의 EOS는 넣지 않습니다. 두 표현은 목적이 다릅니다.",
          },
          {
            id: "p.reserved",
            kind: "paragraph",
            text: "현재 tokenizer 설정은 BOS=0, EOS=1, UNK=2를 예약하고 byte 주소를 offset 3부터 배치합니다. 예시의 표시와 ID는 Rust exporter 결과만 사용합니다.",
          },
          {
            id: "p.context",
            kind: "paragraph",
            text: "Vocabulary 크기는 가능한 주소의 수이고 context length는 한 번에 놓을 수 있는 token 칸 수입니다. 두 값은 서로 바꿔 말할 수 없습니다.",
          },
          {
            id: "example.display",
            kind: "example",
            title: "the cat — display encoding",
            lines: [tokenLine(example.displayEncoding)],
          },
          {
            id: "example.prefix",
            kind: "example",
            title: "the cat — generation prefix",
            lines: [tokenLine(example.generationPrefix)],
          },
          {
            id: "misconception.id-magnitude",
            kind: "callout",
            tone: "warning",
            title: "오개념: ID가 크면 의미도 크다",
            text: "ID는 주소일 뿐이며 의미 계산은 조회된 embedding vector에서 시작합니다.",
          },
          {
            id: "misconception.id-distance",
            kind: "callout",
            tone: "warning",
            title: "오개념: ID 사이 거리가 의미 거리다",
            text: "연속된 정수 주소가 비슷한 의미를 보장하지 않습니다.",
          },
          {
            id: "misconception.vocab-context",
            kind: "callout",
            tone: "warning",
            title: "오개념: vocabulary 크기와 context 길이는 같다",
            text: "하나는 주소 공간이고 다른 하나는 sequence 용량입니다.",
          },
          { id: "term.vocabulary", kind: "term", termId: "vocabulary" },
          { id: "term.token-id", kind: "term", termId: "token-id" },
          { id: "term.bos", kind: "term", termId: "bos" },
          { id: "term.eos", kind: "term", termId: "eos" },
          { id: "term.unk", kind: "term", termId: "unk" },
          { id: "term.context-length", kind: "term", termId: "context-length" },
        ],
      },
    ],
    outlineSectionIds: ["decoder.curriculum.guide.0.3.section"],
    keyTakeaway: [
      {
        id: "takeaway",
        kind: "paragraph",
        text: "Token ID는 vocabulary에서 token을 찾기 위한 주소이며, 실제 의미 계산은 embedding vector에서 시작됩니다.",
      },
    ],
    glossary: ["vocabulary", "token-id", "bos", "eos", "unk", "context-length"],
  },
  primaryDiagramId: "decoder.diagram.tokenization.vocabulary",
  referenceIds: ["ref.tistory.22", "ref.repo.tokenizer", "ref.rfc3629"],
  misconceptionIds: ["id-magnitude", "id-distance", "vocab-context"],
  authorship: part0Authorship("rust-generated-fixture"),
} as const satisfies Part0ChapterContent;
