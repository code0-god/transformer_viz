import { curriculumTokenExamples } from "../../generated/tokenExamples";
import { type Part0ChapterContent, part0Authorship } from "./glossary";

const runtimeExample = curriculumTokenExamples.find(
  ({ id }) => id === "the-cats",
);
const koreanExample = curriculumTokenExamples.find(
  ({ id }) => id === "korean-han",
);
if (runtimeExample === undefined || koreanExample === undefined)
  throw new Error("Generated tokenization method examples are incomplete");

export const methodsChapterContent = {
  page: {
    id: "decoder.curriculum.guide.0.4",
    routeId: "decoder.root",
    title: "Tokenization 방식",
    learningGoal:
      "word, character, subword, byte 방식의 vocabulary 크기·sequence 길이·coverage 균형을 질적으로 비교한다.",
    introduction: [
      {
        id: "intro",
        kind: "paragraph",
        text: "Tokenization 방식은 텍스트를 어느 크기의 단위로 나눌지 정합니다. 단위를 크게 잡을수록 항상 좋은 것도, 작게 잡을수록 항상 안전한 것도 아닙니다.",
      },
    ],
    sections: [
      {
        id: "decoder.curriculum.guide.0.4.section",
        title: "네 방식의 정성적 균형",
        primaryNodeId: "decoder.root.input-context",
        blocks: [
          {
            id: "p.word",
            kind: "paragraph",
            text: "Word-level은 읽기 쉬운 짧은 sequence를 만들 수 있지만, 가능한 단어를 넓게 담으려면 vocabulary가 커지고 새 단어 coverage가 어려워질 수 있습니다.",
          },
          {
            id: "p.character",
            kind: "paragraph",
            text: "Character-level은 작은 기본 목록으로 많은 표기를 조합할 수 있는 대신, 같은 문장을 더 긴 sequence로 펼치는 경향이 있습니다.",
          },
          {
            id: "p.subword",
            kind: "paragraph",
            text: "Subword 계열은 빈번한 조각을 묶어 vocabulary와 sequence 길이 사이를 조절합니다. BPE는 이 일반 비교의 한 방식이며 현재 교육용 tokenizer의 구현이라고 말하지 않습니다.",
          },
          {
            id: "p.byte",
            kind: "paragraph",
            text: "Byte 방식은 UTF-8 byte를 기본 단위로 삼아 폭넓은 입력을 작은 고정 주소 집합으로 표현합니다. 현재 Rust runtime은 결정적 byte fallback을 사용합니다.",
          },
          {
            id: "p.korean",
            kind: "paragraph",
            text: "‘한’은 UTF-8에서 byte 세 개이며 현재 fixture에서도 byte token 세 개로 나타납니다. 화면은 브라우저에서 이를 재계산하지 않고 exporter 결과를 소비합니다.",
          },
          {
            id: "p.truncation",
            kind: "paragraph",
            text: "Byte token sequence를 길이 제한에서 자를 때는 디코딩 결과가 UTF-8 문자 경계를 깨지 않도록 안전하게 처리해야 합니다. token 수와 문자 수를 같은 값으로 가정할 수 없습니다.",
          },
          {
            id: "example.methods",
            kind: "example",
            title: "the cats — 네 방식",
            lines: [
              "word: [the] [cats]",
              "character: [t] [h] [e] [␠] [c] [a] [t] [s]",
              "conceptual subword: [the] [cat] [s]",
              `current byte: ${runtimeExample.generationPrefix
                .filter(({ kind }) => kind === "byte")
                .map(({ display }) => `[${display}]`)
                .join(" ")}`,
              `한: ${koreanExample.generationPrefix
                .filter(({ kind }) => kind === "byte")
                .map(({ display }) => `[${display}]`)
                .join(" ")} — UTF-8-safe truncation required`,
            ],
          },
          {
            id: "comparison.axes",
            kind: "comparison",
            columns: [
              {
                id: "vocabulary",
                title: "Vocabulary 크기",
                items: [
                  "word: 큰 편",
                  "character: 작은 편",
                  "subword: 중간 조절",
                  "byte: 작고 고정적",
                ],
              },
              {
                id: "sequence",
                title: "Sequence 길이",
                items: [
                  "word: 짧은 편",
                  "character: 긴 편",
                  "subword: 중간 조절",
                  "byte: 입력에 따라 길어짐",
                ],
              },
              {
                id: "coverage",
                title: "Coverage",
                items: [
                  "word: 새 단어에 민감",
                  "character: 폭넓음",
                  "subword: 조각 재사용",
                  "byte: 정상 UTF-8 byte 표현",
                ],
              },
            ],
          },
          {
            id: "misconception.current-bpe",
            kind: "callout",
            tone: "warning",
            title: "오개념: BPE가 현재 edu tokenizer다",
            text: "BPE는 일반 방식 비교이며 현재 runtime은 UTF-8 byte fallback입니다.",
          },
          {
            id: "misconception.always-best",
            kind: "callout",
            tone: "warning",
            title: "오개념: 한 방식이 모든 축에서 항상 최선",
            text: "각 방식은 vocabulary, sequence 길이, coverage 사이에 다른 균형을 만듭니다.",
          },
          {
            id: "misconception.context-characters",
            kind: "callout",
            tone: "warning",
            title: "오개념: context 길이는 문자 수다",
            text: "Context는 tokenizer가 만든 token 수로 측정합니다.",
          },
          { id: "term.word-level", kind: "term", termId: "word-level" },
          {
            id: "term.character-level",
            kind: "term",
            termId: "character-level",
          },
          { id: "term.bpe", kind: "term", termId: "bpe" },
          { id: "term.byte-fallback", kind: "term", termId: "byte-fallback" },
          {
            id: "term.sequence-length",
            kind: "term",
            termId: "sequence-length",
          },
        ],
      },
    ],
    outlineSectionIds: ["decoder.curriculum.guide.0.4.section"],
    keyTakeaway: [
      {
        id: "takeaway",
        kind: "paragraph",
        text: "Tokenization 방식은 vocabulary 크기와 sequence 길이 사이의 균형을 결정합니다.",
      },
    ],
    glossary: [
      "word-level",
      "character-level",
      "bpe",
      "byte-fallback",
      "sequence-length",
    ],
  },
  primaryDiagramId: "decoder.diagram.tokenization.methods",
  referenceIds: ["ref.tistory.22", "ref.repo.tokenizer", "ref.rfc3629"],
  misconceptionIds: ["current-bpe", "always-best", "context-characters"],
  authorship: part0Authorship("rust-generated-fixture"),
} as const satisfies Part0ChapterContent;
