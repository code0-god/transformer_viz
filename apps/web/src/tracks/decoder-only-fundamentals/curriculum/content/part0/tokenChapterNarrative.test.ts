import { describe, expect, test } from "vitest";

import { tokenChapterContent } from "./token";

const TOKEN_STAGES = [
  "why-split",
  "token-units",
  "not-word",
  "current-byte",
  "next-token-id",
] as const;

describe("Token Chapter Golden narrative", () => {
  test("owns one five-stage segmentation narrative", () => {
    const blocks = tokenChapterContent.page.sections.flatMap(
      ({ blocks: sectionBlocks }) => sectionBlocks,
    );
    const narrative = blocks.find((block) => block.kind === "visual-narrative");

    expect(tokenChapterContent.page.sections).toHaveLength(1);
    expect(
      narrative?.kind === "visual-narrative"
        ? {
            figureId: narrative.figure.figureId,
            figureSize: narrative.figure.size,
            layout: narrative.layout,
            stages: narrative.beats.map(({ stage }) => stage),
          }
        : null,
    ).toEqual({
      figureId: "decoder.diagram.tokenization.token",
      figureSize: "full",
      layout: "golden",
      stages: TOKEN_STAGES,
    });
  });

  test("keeps Token and Token ID responsibilities separate", () => {
    expect(tokenChapterContent.page.glossary).toEqual([
      "token",
      "tokenizer",
      "token-id",
    ]);
    expect(tokenChapterContent.page.keyTakeaway).toHaveLength(1);
    expect(
      tokenChapterContent.page.sections.flatMap(({ blocks }) =>
        blocks.map(({ kind }) => kind),
      ),
    ).toEqual(["visual-narrative"]);
  });
});
