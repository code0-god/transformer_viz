import { curriculumTokenExamples } from "../../generated/tokenExamples";
import { type Part0ChapterContent, part0Authorship } from "./glossary";

const runtimeExample = curriculumTokenExamples.find(
  ({ id }) => id === "the-cats",
);
const koreanExample = curriculumTokenExamples.find(
  ({ id }) => id === "korean-han",
);
if (runtimeExample === undefined || koreanExample === undefined)
  throw new Error("Generated Part 0 token examples are incomplete");

export const tokenChapterContent = {
  page: {
    id: "decoder.curriculum.guide.0.2",
    routeId: "decoder.root",
    title: "Token이란?",
    learningGoal:
      "token 단위가 단어와 같지 않음을 여러 경계 방식으로 비교한다.",
    introduction: [
      {
        id: "intro",
        kind: "paragraph",
        text: "Token은 모델이 sequence의 한 칸으로 처리하는 단위입니다. 눈에 보이는 단어 경계와 token boundary는 tokenizer 방식에 따라 같을 수도, 다를 수도 있습니다.",
      },
    ],
    sections: [
      {
        id: "decoder.curriculum.guide.0.2.section",
        title: "같은 텍스트를 보는 네 가지 렌즈",
        primaryNodeId: "decoder.root.input-context",
        blocks: [
          {
            id: "p.unit",
            kind: "paragraph",
            text: "단어 방식은 공백을 중심으로 큰 단위를 만들지만, character 방식은 글자와 공백을 각각 순서의 한 칸으로 봅니다.",
          },
          {
            id: "p.subword",
            kind: "paragraph",
            text: "Subword 방식은 자주 쓰이는 조각을 재사용해 단어 전체와 문자 하나 사이의 경계를 만들 수 있습니다. 여기의 subword는 방식 비교를 위한 개념 예시입니다.",
          },
          {
            id: "p.runtime",
            kind: "paragraph",
            text: "현재 Rust tokenizer는 결정적 UTF-8 byte fallback을 사용합니다. 브라우저가 경계를 다시 계산하지 않고 exporter가 만든 fixture의 token 순서를 그대로 표시합니다.",
          },
          {
            id: "p.word-token",
            kind: "paragraph",
            text: "따라서 token 수를 단어 수로 대신 세면 입력 길이와 context 사용량을 잘못 판단할 수 있습니다. token은 언어학적 단어가 아니라 모델 입력 규약의 단위입니다.",
          },
          {
            id: "p.korean",
            kind: "paragraph",
            text: "한글 한 글자도 byte 방식에서는 하나의 token이라고 보장되지 않습니다. UTF-8로 표현한 ‘한’은 현재 runtime fixture에서 세 byte token으로 이어집니다.",
          },
          {
            id: "p.unknown",
            kind: "paragraph",
            text: "Byte fallback은 정상 UTF-8 입력의 각 byte를 vocabulary 주소로 나타낼 수 있습니다. 그래서 이 범위의 입력을 곧바로 UNK 하나로 접지 않습니다.",
          },
          {
            id: "example.the-cats",
            kind: "example",
            title: "the cats 경계 비교",
            lines: [
              "word: [the] [cats]",
              "character: [t] [h] [e] [␠] [c] [a] [t] [s]",
              "conceptual subword: [the] [cat] [s]",
              `current Rust UTF-8 bytes: ${runtimeExample.generationPrefix
                .filter(({ kind }) => kind === "byte")
                .map(({ display }) => `[${display}]`)
                .join(" ")}`,
              `secondary edge 한: ${koreanExample.generationPrefix
                .filter(({ kind }) => kind === "byte")
                .map(({ display }) => `[${display}]`)
                .join(" ")}`,
            ],
          },
          {
            id: "misconception.word-equals-token",
            kind: "callout",
            tone: "warning",
            title: "오개념: 한 단어는 항상 한 token",
            text: "Token boundary는 tokenizer 규약이 정하며 단어 경계와 일치할 필요가 없습니다.",
          },
          {
            id: "misconception.korean-one-token",
            kind: "callout",
            tone: "warning",
            title: "오개념: 한글 한 글자는 항상 한 token",
            text: "현재 byte 방식에서 ‘한’은 UTF-8 byte token 세 개입니다.",
          },
          {
            id: "misconception.utf8-unknown",
            kind: "callout",
            tone: "warning",
            title: "오개념: 일반 UTF-8 입력은 UNK",
            text: "현재 byte fallback은 정상 UTF-8 byte를 직접 표현합니다.",
          },
          { id: "term.token", kind: "term", termId: "token" },
          { id: "term.token-boundary", kind: "term", termId: "token-boundary" },
          { id: "term.byte", kind: "term", termId: "byte" },
          { id: "term.subword", kind: "term", termId: "subword" },
        ],
      },
    ],
    outlineSectionIds: ["decoder.curriculum.guide.0.2.section"],
    keyTakeaway: [
      {
        id: "takeaway",
        kind: "paragraph",
        text: "Token은 모델이 한 번에 처리하는 텍스트 단위이며, 단어보다 작거나 여러 글자를 포함할 수 있습니다.",
      },
    ],
    glossary: ["token", "token-boundary", "byte", "subword"],
  },
  primaryDiagramId: "decoder.diagram.tokenization.token",
  referenceIds: ["ref.tistory.22", "ref.repo.tokenizer", "ref.rfc3629"],
  misconceptionIds: ["word-equals-token", "korean-one-token", "utf8-unknown"],
  authorship: part0Authorship("rust-generated-fixture"),
} as const satisfies Part0ChapterContent;
