import { curriculumTokenExamples } from "../../decoder-only-fundamentals/curriculum/generated/tokenExamples";

const generatedExample = curriculumTokenExamples.find(
  ({ id }) => id === "the-cats",
);
if (generatedExample === undefined) {
  throw new Error("Generated the-cats example is missing");
}

const BYTE_SEGMENTS = generatedExample.generationPrefix
  .filter(({ kind }) => kind === "byte")
  .map(({ display }) => display);

export const TOKEN_UNIT_EXAMPLES = {
  concept: {
    label: "설명용 token",
    source: "The cats are sleeping.",
    segments: ["The", "cats", "are", "sleeping", "."],
  },
  byte: {
    label: "현재 byte",
    source: "the cats",
    segments: BYTE_SEGMENTS,
  },
} as const;

export const TOKENIZATION_SEGMENTS = {
  word: ["the", "cats"],
  character: ["t", "h", "e", "␠", "c", "a", "t", "s"],
  subword: ["the", "cat", "s"],
  byte: BYTE_SEGMENTS,
} as const;

export type TokenUnitMode = keyof typeof TOKEN_UNIT_EXAMPLES;
export type TokenizationMethod = keyof typeof TOKENIZATION_SEGMENTS;
