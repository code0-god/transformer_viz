import { describe, expect, test } from "vitest";

import { decoderCurriculum, decoderCurriculumRegistries } from "../../catalog";
import { deriveChapterAdjacency, validateCurriculum } from "../../validation";
import { embeddingChapterContent } from "./embedding";
import type { Part2ChapterContent } from "./glossary";
import { hiddenStateChapterContent } from "./hiddenState";
import { positionChapterContent } from "./position";

const CHAPTERS = [
  [
    "decoder.chapter.2.1",
    "Token Embedding",
    "decoder.diagram.representation.embedding",
  ],
  [
    "decoder.chapter.2.2",
    "Position Embedding",
    "decoder.diagram.representation.position",
  ],
  [
    "decoder.chapter.2.3",
    "Hidden State",
    "decoder.diagram.representation.hidden-state",
  ],
] as const;
const NEW_FORMULAS = [
  "fundamentals-embedding-table-shape",
  "fundamentals-hidden-state-shape",
] as const;
const SHAPE_STAGES = [
  "token-ids-[T]",
  "hidden-[T,C]",
  "all-logits-[T,Vocab]",
  "final-logits-[Vocab]",
] as const;

function part2Pages() {
  return decoderCurriculum.guidePages.slice(8, 11);
}

describe("Part 2 curriculum content", () => {
  test("locks three Chapter identities and substantive block roles", () => {
    // Given: the Part 2 curriculum slice.
    const part = decoderCurriculum.parts[2];
    if (part === undefined) throw new Error("Missing Part 2");

    // When: Chapter and page contracts are read.
    const contracts = part.chapters.map((chapter) => [
      chapter.id,
      chapter.title,
      chapter.concepts[0]?.diagramId,
    ]);

    // Then: each Chapter has explanations, misconceptions, and glossary.
    expect(contracts).toEqual(CHAPTERS);
    for (const page of part2Pages()) {
      const blocks = page.sections.flatMap(({ blocks }) => blocks);
      expect(
        blocks.filter(({ kind }) => kind === "paragraph").length,
      ).toBeGreaterThanOrEqual(6);
      expect(
        blocks.filter(({ kind }) => kind === "runtime-facts"),
      ).toHaveLength(0);
      expect(
        blocks.filter(({ kind }) => kind === "callout").length,
      ).toBeGreaterThanOrEqual(3);
      expect(
        blocks.filter(({ kind }) => kind === "term").length,
      ).toBeGreaterThanOrEqual(3);
      expect(page.introduction.length).toBeGreaterThan(0);
      expect(page.keyTakeaway).toHaveLength(1);
    }
  });

  test("keeps dimensions and implementation details out of prose", () => {
    // Given: Part 2 learner-visible static copy and machine blocks.
    const pages = part2Pages();
    const prose = pages
      .flatMap((page) => [
        page.learningGoal,
        ...page.introduction.flatMap((block) =>
          block.kind === "paragraph" ? [block.text] : [],
        ),
        ...page.sections.flatMap(({ blocks }) =>
          blocks.flatMap((block) =>
            block.kind === "paragraph" || block.kind === "callout"
              ? [block.text]
              : [],
          ),
        ),
      ])
      .join(" ");

    // When/Then: current dimensions and developer terms stay out of prose.
    expect(prose).not.toMatch(
      /(?:Vocab|block_size|\bC\b|\bN\b)[^.!]{0,24}\b(?:259|64|24|2)\b/,
    );
    expect(prose).not.toMatch(
      /(?:current|현재)[^.!]{0,30}(?:sinusoidal|RoPE)/i,
    );
    expect(prose).not.toMatch(
      /\b(?:asset|fixture|metadata|provenance|runtime|source|typed)\b/i,
    );
    expect(
      pages
        .flatMap((page) => page.sections)
        .flatMap(({ blocks }) => blocks)
        .some((block) => block.kind === "runtime-facts"),
    ).toBe(false);
  });

  test("orders explanation before trusted formulas and preserves shape semantics", () => {
    // Given: all Part 2 blocks in reading order.
    const blocks = part2Pages().map((page) =>
      page.sections.flatMap(({ blocks }) => blocks),
    );
    const formulas = blocks.map((chapterBlocks) =>
      chapterBlocks.flatMap((block) =>
        block.kind === "formula" ? [block.formulaId] : [],
      ),
    );
    const hiddenStages = blocks[2]?.find(
      ({ id }) => id === "shape-progression",
    );

    // When/Then: the new formulas and approved reuses follow explanations.
    expect(formulas).toEqual([
      ["fundamentals-embedding-table-shape", "token-embedding"],
      ["position-embedding", "embedding-add"],
      ["fundamentals-hidden-state-shape", "hidden-state", "transformer-block"],
    ]);
    expect(
      hiddenStages?.kind === "steps"
        ? hiddenStages.items.map(({ id }) => id)
        : [],
    ).toEqual(SHAPE_STAGES);
    expect(
      validateCurriculum(decoderCurriculum, decoderCurriculumRegistries).filter(
        ({ code }) => code === "formula-before-explanation",
      ),
    ).toEqual([]);
    expect(JSON.stringify(part2Pages())).not.toMatch(/\$\$|\\\[|\\mathbb/);
  });

  test("rejects embedding-table and coordinate-semantic confusion", () => {
    // Given: machine labels from the embedding and hidden-state Chapters.
    const [embedding, , hidden] = part2Pages();
    const labels = [embedding, hidden].flatMap(
      (page) =>
        page?.sections.flatMap(({ blocks }) =>
          blocks.flatMap((block) =>
            block.kind === "steps" ? block.items.map(({ title }) => title) : [],
          ),
        ) ?? [],
    );

    // When/Then: table address space and sequence output stay distinct.
    expect(labels).toEqual(
      expect.arrayContaining([
        "Embedding table [Vocab,C]",
        "Sequence vectors [T,C]",
      ]),
    );
    expect(labels).not.toContain("Embedding table [T,C]");
    expect(JSON.stringify(part2Pages())).not.toMatch(
      /coordinate-(?:meaning|semantics)|좌표 의미/,
    );
  });

  test("requires one dedicated typed current-model callout per Chapter", () => {
    // Given: all independently authored Part 2 content records.
    const contents: readonly Part2ChapterContent[] = [
      embeddingChapterContent,
      positionChapterContent,
      hiddenStateChapterContent,
    ];

    // When: metadata is matched to important callout blocks and runtime adapters.
    const contracts = contents.map((content) => {
      const matches = content.page.sections
        .flatMap(({ blocks }) => blocks)
        .filter(
          (block) =>
            block.kind === "callout" &&
            block.id === content.currentModelCalloutId &&
            block.tone === "important",
        );
      return {
        calloutId: content.currentModelCalloutId,
        adapterId: content.runtimeFactsAdapterId,
        matches: matches.length,
      };
    });

    // Then: each Chapter binds exactly one callout to its typed adapter.
    expect(contracts).toEqual([
      {
        calloutId: "current-model.embedding",
        adapterId: "current-model.embedding",
        matches: 1,
      },
      {
        calloutId: "current-model.position",
        adapterId: "current-model.position",
        matches: 1,
      },
      {
        calloutId: "current-model.hidden-state",
        adapterId: "current-model.hidden-state",
        matches: 1,
      },
    ]);
  });

  test("derives 2.3 next exactly to Part 3.1", () => {
    // Given/When: adjacency is derived from locked curriculum order.
    const adjacency = deriveChapterAdjacency(decoderCurriculum).slice(8, 11);

    // Then: Part 2 flows internally and Hidden State enters GPT.
    expect(adjacency).toEqual([
      ["decoder.chapter.2.1", "decoder.chapter.2.2"],
      ["decoder.chapter.2.2", "decoder.chapter.2.3"],
      ["decoder.chapter.2.3", "decoder.chapter.3.1"],
    ]);
  });

  test("closes exactly the two Part 2 Formula foreign keys", () => {
    // Given/When: Part 2 formula IDs are read from the registered pages.
    const formulaIds = part2Pages().flatMap((page) =>
      page.sections.flatMap(({ blocks }) =>
        blocks.flatMap((block) =>
          block.kind === "formula" &&
          block.formulaId.startsWith("fundamentals-")
            ? [block.formulaId]
            : [],
        ),
      ),
    );

    // Then: exactly the two new IDs are consumed.
    expect(formulaIds).toEqual(NEW_FORMULAS);
  });
});
