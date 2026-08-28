import { curriculumTokenExamples } from "../../generated/tokenExamples";
import { type Part0ChapterContent, part0Authorship } from "./glossary";

const runtimeExample = curriculumTokenExamples.find(
  ({ id }) => id === "the-cats",
);
if (runtimeExample === undefined)
  throw new Error("Generated tokenization method example is missing");

export const methodsChapterContent = {
  page: {
    id: "decoder.curriculum.guide.0.4",
    routeId: "decoder.root",
    title: "Tokenization 방식",
    learningGoal:
      "같은 텍스트를 Word, Character, Subword, Byte 방식으로 나누어 비교합니다.",
    outline: "hidden",
    introduction: [
      {
        id: "intro",
        kind: "paragraph",
        text: "Tokenization 방식은 같은 텍스트를 어디에서 나눌지 정합니다. 여기서는 ‘the cats’라는 하나의 예시를 네 방식으로 계속 비교합니다.",
      },
    ],
    sections: [
      {
        id: "word",
        title: "Word: 단어로 나누기",
        primaryNodeId: "decoder.root.input-context",
        blocks: [
          {
            id: "p.word",
            kind: "paragraph",
            text: "Word 방식에서는 ‘the cats’를 [the] [cats]처럼 단어 단위로 나눕니다. 익숙한 단위라 읽기 쉽고, 한 문장을 비교적 짧은 sequence로 만들기 쉽습니다.",
          },
        ],
      },
      {
        id: "character",
        title: "Character: 문자로 나누기",
        primaryNodeId: "decoder.root.input-context",
        blocks: [
          {
            id: "p.character",
            kind: "paragraph",
            text: "Character 방식에서는 ‘the cats’를 [t] [h] [e] [␠] [c] [a] [t] [s]처럼 문자와 공백으로 나눕니다. 기본 단위는 작지만, 같은 문장이 더 긴 sequence가 됩니다.",
          },
        ],
      },
      {
        id: "subword",
        title: "Subword: 단어 조각으로 나누기",
        primaryNodeId: "decoder.root.input-context",
        blocks: [
          {
            id: "p.subword",
            kind: "paragraph",
            text: "Subword 방식은 자주 쓰이는 단어 조각을 단위로 씁니다. ‘the cats’를 [the] [cat] [s]로 나누는 것은 방식 차이를 보여 주는 개념 예시이며, 현재 nanoGPT Edu tokenizer의 실제 분할 결과를 뜻하지 않습니다.",
          },
        ],
      },
      {
        id: "byte",
        title: "Byte: byte로 나누기",
        primaryNodeId: "decoder.root.input-context",
        blocks: [
          {
            id: "p.byte",
            kind: "paragraph",
            text: "Byte 방식은 텍스트를 byte 단위까지 나누어 표현합니다. 이 방식에서는 사람이 보는 글자 수와 token 수가 같다고 가정할 수 없습니다.",
          },
          {
            id: "example.the-cats",
            kind: "example",
            title: "the cats — 같은 입력을 네 방식으로 보기",
            lines: [
              "word: [the] [cats]",
              "character: [t] [h] [e] [␠] [c] [a] [t] [s]",
              "conceptual subword: [the] [cat] [s]",
              `current byte: ${runtimeExample.generationPrefix
                .filter(({ kind }) => kind === "byte")
                .map(({ display }) => `[${display}]`)
                .join(" ")}`,
            ],
          },
        ],
      },
      {
        id: "trade-off",
        title: "Vocabulary와 sequence 길이의 균형",
        primaryNodeId: "decoder.root.input-context",
        blocks: [
          {
            id: "p.trade-off",
            kind: "paragraph",
            text: "Vocabulary는 사용할 수 있는 token 종류의 목록이고, sequence 길이는 한 입력을 나타내는 token 칸의 수입니다. Word처럼 큰 단위는 vocabulary가 커지는 대신 sequence가 짧아지기 쉽고, character나 byte처럼 작은 단위는 vocabulary를 작게 유지하는 대신 sequence가 길어지기 쉽습니다. Subword는 그 사이를 조절하려는 방식입니다.",
          },
          {
            id: "figure.tokenization-methods",
            kind: "figure",
            figureId: "decoder.diagram.tokenization.methods",
            size: "wide",
            caption:
              "같은 텍스트도 tokenization 방식에 따라 경계, vocabulary 크기, sequence 길이가 달라집니다.",
            alt: "the cats를 Word, Character, Subword, Byte 방식으로 비교",
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
                title: "새 표기 표현",
                items: [
                  "word: 새 단어에 민감",
                  "character: 문자 조합으로 표현",
                  "subword: 조각을 재사용",
                  "byte: byte 조합으로 표현",
                ],
              },
            ],
          },
          {
            id: "misconception.always-best",
            kind: "callout",
            tone: "warning",
            title: "오개념: 한 방식이 모든 경우에 가장 좋다",
            text: "방식마다 vocabulary 크기, sequence 길이, 새 표기를 다루는 방법의 균형이 다릅니다.",
          },
          {
            id: "misconception.context-characters",
            kind: "callout",
            tone: "warning",
            title: "오개념: context 길이는 문자 수다",
            text: "Context는 tokenizer가 만든 token 수로 측정하므로 문자 수와 같지 않을 수 있습니다.",
          },
        ],
      },
      {
        id: "current-nanogpt",
        title: "현재 nanoGPT Edu에서는",
        primaryNodeId: "decoder.root.input-context",
        blocks: [
          {
            id: "p.current-nanogpt",
            kind: "paragraph",
            text: "현재 nanoGPT Edu에서는 byte 방식의 결과를 실제 예시로 살펴보고, 나머지 세 방식은 차이를 이해하기 위한 비교 개념으로 사용합니다.",
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
          {
            id: "implementation.current-tokenizer",
            kind: "implementation-note",
            title: "구현 노트",
            items: [
              "현재 runtime은 Rust tokenizer의 결정적 UTF-8 byte fallback을 사용합니다.",
              "Exporter가 만든 fixture의 byte token 순서를 브라우저가 그대로 표시하며, 브라우저는 경계를 다시 계산하지 않습니다.",
              "이 예시의 provenance는 생성된 curriculumTokenExamples에 연결되어 있습니다.",
            ],
          },
        ],
      },
    ],
    outlineSectionIds: [
      "word",
      "character",
      "subword",
      "byte",
      "trade-off",
      "current-nanogpt",
    ],
    keyTakeaway: [
      {
        id: "takeaway",
        kind: "paragraph",
        text: "Tokenization 방식은 vocabulary 크기와 sequence 길이 사이의 균형을 다르게 만듭니다.",
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
  misconceptionIds: ["always-best", "context-characters"],
  authorship: part0Authorship("rust-generated-fixture"),
} as const satisfies Part0ChapterContent;
