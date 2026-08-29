import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, test } from "vitest";

import { decoderCurriculum, decoderCurriculumRegistries } from "../../catalog";
import { curriculumReferences } from "../../references";
import { deriveChapterAdjacency, validateCurriculum } from "../../validation";
import { autoregressiveChapterContent } from "./autoregressive";
import { conditionalProbabilityChapterContent } from "./conditionalProbability";
import { definitionChapterContent } from "./definition";
import type { Part1ChapterContent } from "./glossary";
import { nextTokenChapterContent } from "./nextToken";

const CHAPTERS = [
  [
    "decoder.chapter.1.1",
    "언어 모델이란?",
    "decoder.diagram.language-model.definition",
  ],
  [
    "decoder.chapter.1.2",
    "다음 Token 예측",
    "decoder.diagram.language-model.next-token",
  ],
  [
    "decoder.chapter.1.3",
    "조건부 확률",
    "decoder.diagram.language-model.conditional-probability",
  ],
  [
    "decoder.chapter.1.4",
    "Autoregressive Generation",
    "decoder.diagram.language-model.autoregressive",
  ],
] as const;
const DEFINITION_STAGE_IDS = [
  "context",
  "language-model",
  "next-token-candidates",
] as const;
const NEXT_TOKEN_STAGE_IDS = [
  "context",
  "vocabulary-logits",
  "selection-distribution",
  "sampler",
  "next-token",
] as const;
const STOP_CONDITION_IDS = [
  "max-new-tokens",
  "end-of-sequence",
  "context-limit",
  "user-stopped",
  "error",
] as const;
const CHAPTER_ROLES = ["what", "one-step", "probability", "repeat"] as const;

function part1Pages() {
  return decoderCurriculum.guidePages.slice(4, 8);
}

describe("Part 1 curriculum content", () => {
  test("locks four Chapter identities and substantive content contracts", () => {
    // Given: the Part 1 curriculum slice.
    const part = decoderCurriculum.parts[1];
    if (part === undefined) throw new Error("Missing Part 1");

    // When: Chapter and page machine contracts are read.
    const contracts = part.chapters.map((chapter) => [
      chapter.id,
      chapter.title,
      chapter.concepts[0]?.diagramId,
    ]);

    // Then: each independent Chapter has one Figure and sufficient teaching blocks.
    expect(contracts).toEqual(CHAPTERS);
    for (const page of part1Pages()) {
      const blocks = page.sections.flatMap(({ blocks }) => blocks);
      const figures = [...page.introduction, ...blocks].filter(
        ({ kind }) => kind === "figure",
      );
      expect(
        blocks.filter(({ kind }) => kind === "paragraph").length,
      ).toBeGreaterThanOrEqual(6);
      expect(
        blocks.filter(({ kind }) => kind === "callout").length,
      ).toBeGreaterThanOrEqual(2);
      expect(
        blocks.filter(({ kind }) => kind === "term").length,
      ).toBeGreaterThanOrEqual(3);
      expect(page.introduction.length).toBeGreaterThan(0);
      expect(page.keyTakeaway).toHaveLength(1);
      expect(figures).toHaveLength(1);
      expect(
        figures.every(
          (figure) =>
            figure.kind === "figure" &&
            figure.caption.trim().length > 0 &&
            typeof figure.alt === "string" &&
            figure.alt.trim().length > 0,
        ),
      ).toBe(true);
    }
  });

  test("locks distinct chapter roles and figure questions", () => {
    // Given: four typed Part 1 content records.
    const contents: readonly Part1ChapterContent[] = [
      definitionChapterContent,
      nextTokenChapterContent,
      conditionalProbabilityChapterContent,
      autoregressiveChapterContent,
    ];

    // When: editorial responsibility metadata is inspected.
    const roles = contents.map((content) =>
      Reflect.get(content, "chapterRole"),
    );
    const questions = contents.map((content) =>
      Reflect.get(content, "figureQuestion"),
    );

    // Then: WHAT, ONE STEP, PROBABILITY, and REPEAT remain distinct.
    expect(roles).toEqual(CHAPTER_ROLES);
    expect(questions.every((question) => typeof question === "string")).toBe(
      true,
    );
    expect(new Set(questions).size).toBe(4);
  });

  test("preserves Formula order and the score-selection boundary", () => {
    // Given: next-token and conditional-probability pages.
    const [definition, nextToken, conditional] = part1Pages();
    if (
      definition === undefined ||
      nextToken === undefined ||
      conditional === undefined
    )
      throw new Error("Missing Part 1 pages");
    const definitionBlocks = definition.sections.flatMap(
      ({ blocks }) => blocks,
    );
    const nextBlocks = nextToken.sections.flatMap(({ blocks }) => blocks);
    const conditionalBlocks = conditional.sections.flatMap(
      ({ blocks }) => blocks,
    );
    const shapeFlow = definitionBlocks.find(({ id }) => id === "shape-flow");
    const stageBlock = nextBlocks.find(({ id }) => id === "prediction-stages");

    // When: formulas and semantic stages are inspected.
    const formulaIds = [...nextBlocks, ...conditionalBlocks].flatMap((block) =>
      block.kind === "formula" ? [block.formulaId] : [],
    );

    // Then: explanation precedes formulas and each Chapter owns only its responsibility.
    expect(definitionBlocks.some(({ kind }) => kind === "formula")).toBe(false);
    expect(
      shapeFlow?.kind === "steps" ? shapeFlow.items.map(({ id }) => id) : [],
    ).toEqual(DEFINITION_STAGE_IDS);
    expect(formulaIds).toEqual([
      "fundamentals-next-token-softmax",
      "fundamentals-chain-rule-three-token",
      "fundamentals-chain-rule-sequence",
    ]);
    expect(stageBlock?.kind).toBe("steps");
    expect(
      stageBlock?.kind === "steps" ? stageBlock.items.map(({ id }) => id) : [],
    ).toEqual(NEXT_TOKEN_STAGE_IDS);
    expect(JSON.stringify(definition)).not.toMatch(
      /(?:logit|softmax|LM head|hidden state|\[T,Vocab\])/i,
    );
    expect(JSON.stringify(nextToken)).not.toMatch(
      /(?:inspection|retained-set|transport|Worker raw trace|fixture)/i,
    );
    expect(
      validateCurriculum(decoderCurriculum, decoderCurriculumRegistries).filter(
        ({ code }) => code === "formula-before-explanation",
      ),
    ).toEqual([]);
    expect(JSON.stringify(part1Pages())).not.toMatch(
      /\\(?:frac|prod|mid|exp)|\$\$|\\\[/,
    );
  });

  test("pins current model repetition and five learner-facing stop conditions", () => {
    // Given: the autoregressive Chapter's machine-readable block IDs.
    const autoregressive = part1Pages()[3];
    if (autoregressive === undefined)
      throw new Error("Missing autoregressive page");
    const blocks = autoregressive.sections.flatMap(({ blocks }) => blocks);
    const reasons = blocks.find(({ id }) => id === "terminal-reasons");

    // When/Then: full-context repetition and exact terminal variants are present.
    expect(
      blocks.some(
        ({ id }) => id === "current-model.full-context-recalculation",
      ),
    ).toBe(true);
    expect(
      blocks.some(
        ({ id }) => id === "current-model.context-includes-selection",
      ),
    ).toBe(true);
    expect(reasons?.kind).toBe("steps");
    expect(
      reasons?.kind === "steps" ? reasons.items.map(({ id }) => id) : [],
    ).toEqual(STOP_CONDITION_IDS);
  });

  test("validates every Part 1 glossary, Formula, Figure, and link contract", () => {
    expect(
      validateCurriculum(decoderCurriculum, decoderCurriculumRegistries),
    ).toEqual([]);
    expect(deriveChapterAdjacency(decoderCurriculum).slice(4, 8)).toEqual([
      ["decoder.chapter.1.1", "decoder.chapter.1.2"],
      ["decoder.chapter.1.2", "decoder.chapter.1.3"],
      ["decoder.chapter.1.3", "decoder.chapter.1.4"],
      ["decoder.chapter.1.4", "decoder.chapter.2.1"],
    ]);
  });

  test("resolves generation provenance to the current Worker source", () => {
    // Given: the typed implementation reference and both verified Worker source files.
    const reference = curriculumReferences.find(
      ({ id }) => id === "ref.repo.generation",
    );
    const expectedSource = "apps/worker/src/runtime_generation.rs";
    const controlSource = "apps/worker/src/runtime_generation_control.rs";

    // When/Then: the primary metadata path is exact and both split sources exist.
    expect(reference).toMatchObject({
      id: "ref.repo.generation",
      role: "implementation-source",
      source: expectedSource,
    });
    expect(existsSync(resolve(process.cwd(), "../..", expectedSource))).toBe(
      true,
    );
    expect(existsSync(resolve(process.cwd(), "../..", controlSource))).toBe(
      true,
    );
  });

  test("requires exactly one typed current-model callout per Chapter", () => {
    // Given: the four independently typed Part 1 content records.
    const contents: readonly Part1ChapterContent[] = [
      definitionChapterContent,
      nextTokenChapterContent,
      conditionalProbabilityChapterContent,
      autoregressiveChapterContent,
    ];
    const expectedIds = [
      "current-model.definition",
      "current-model.next-token",
      "current-model.conditional-probability",
      "current-model.autoregressive",
    ];

    // When: dedicated callout metadata and matching blocks are inspected.
    const metadataIds = contents.map((content) =>
      Reflect.get(content, "currentModelCalloutId"),
    );
    const callouts = contents.map((content, index) =>
      content.page.sections
        .flatMap(({ blocks }) => blocks)
        .filter(
          (block) =>
            block.id === metadataIds[index] && block.kind === "callout",
        ),
    );

    // Then: each Chapter owns one important current-model callout by typed ID.
    expect(metadataIds).toEqual(expectedIds);
    expect(
      callouts.map((matches) =>
        matches.map((block) => ({
          kind: block.kind,
          tone: block.kind === "callout" ? block.tone : null,
        })),
      ),
    ).toEqual(expectedIds.map(() => [{ kind: "callout", tone: "important" }]));
  });

  test("derives the locked Chapter links from validated order", () => {
    // Given/When: adjacency is derived from curriculum order.
    const adjacency = deriveChapterAdjacency(decoderCurriculum).slice(4, 8);

    // Then: Part 1 flows internally and then enters Part 2.
    expect(adjacency).toEqual([
      ["decoder.chapter.1.1", "decoder.chapter.1.2"],
      ["decoder.chapter.1.2", "decoder.chapter.1.3"],
      ["decoder.chapter.1.3", "decoder.chapter.1.4"],
      ["decoder.chapter.1.4", "decoder.chapter.2.1"],
    ]);
  });
});
