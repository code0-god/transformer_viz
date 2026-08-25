import { describe, expect, test } from "vitest";

import { decoderCurriculum, decoderCurriculumRegistries } from "../../catalog";
import { curriculumTokenExamples } from "../../generated/tokenExamples";
import * as references from "../../references";
import { deriveChapterAdjacency } from "../../validation";

const PART0_CHAPTERS = [
  {
    id: "decoder.chapter.0.1",
    title: "자연어 처리란?",
    diagramId: "decoder.diagram.intro.nlp",
    referenceIds: [
      "ref.tistory.21",
      "ref.repo.generation",
      "ref.transformer-paper",
    ],
  },
  {
    id: "decoder.chapter.0.2",
    title: "Token이란?",
    diagramId: "decoder.diagram.tokenization.token",
    referenceIds: ["ref.tistory.22", "ref.repo.tokenizer", "ref.rfc3629"],
  },
  {
    id: "decoder.chapter.0.3",
    title: "Vocabulary와 Token ID",
    diagramId: "decoder.diagram.tokenization.vocabulary",
    referenceIds: ["ref.tistory.22", "ref.repo.tokenizer", "ref.rfc3629"],
  },
  {
    id: "decoder.chapter.0.4",
    title: "Tokenization 방식",
    diagramId: "decoder.diagram.tokenization.methods",
    referenceIds: ["ref.tistory.22", "ref.repo.tokenizer", "ref.rfc3629"],
  },
] as const;

function part0GuidePage(index: number) {
  const page = decoderCurriculum.guidePages[index];
  if (page === undefined) throw new Error(`Missing Part 0 guide page ${index}`);
  return page;
}

describe("Part 0 curriculum content", () => {
  test("locks Chapter identity, content structure, references, and required Diagram", () => {
    // Given: the Part 0 curriculum slice.
    const part = decoderCurriculum.parts[0];
    if (part === undefined) throw new Error("Missing Part 0");

    // When: its machine-consumed Chapter contracts are read.
    const contracts = part.chapters.map((chapter) => ({
      id: chapter.id,
      title: chapter.title,
      diagramId: chapter.concepts[0]?.diagramId,
      referenceIds: chapter.concepts[0]?.referenceIds,
    }));

    // Then: all four locked identities and registries are complete.
    expect(contracts).toEqual(PART0_CHAPTERS);
    for (const [index] of PART0_CHAPTERS.entries()) {
      const blocks = part0GuidePage(index).sections.flatMap(
        (section) => section.blocks,
      );
      expect(
        blocks.filter(({ kind }) => kind === "paragraph").length,
      ).toBeGreaterThanOrEqual(6);
      expect(
        blocks.filter(
          ({ id, kind }) =>
            kind === "callout" && id.startsWith("misconception."),
        ).length,
      ).toBeGreaterThanOrEqual(2);
      expect(
        blocks.filter(({ kind }) => kind === "term").length,
      ).toBeGreaterThanOrEqual(3);
      expect(blocks.some(({ kind }) => kind === "formula")).toBe(false);
    }
    expect(decoderCurriculumRegistries.termIds.size).toBeGreaterThanOrEqual(15);
  });

  test("exposes typed independent-authorship provenance for Part 0", () => {
    // Given: the curriculum reference module is the provenance boundary.
    const provenance: unknown = Reflect.get(
      references,
      "curriculumAuthorshipProvenance",
    );

    // When/Then: the machine-consumed authorship state is explicit.
    expect(provenance).toEqual({
      kind: "independently-composed",
      sourceBoundary: "plan-and-runtime-facts-only",
      humanSideBySide: "pending",
      rightsClearance: "not-claimed",
    });
  });

  test("uses generated tokenizer provenance and preserves runtime invariants", () => {
    // Given: the generated Rust fixture examples.
    const theCat = curriculumTokenExamples.find(({ id }) => id === "the-cat");
    const theCats = curriculumTokenExamples.find(({ id }) => id === "the-cats");
    const koreanHan = curriculumTokenExamples.find(
      ({ id }) => id === "korean-han",
    );

    // When: runtime token kinds and prefix boundaries are inspected.
    const koreanBytes = koreanHan?.generationPrefix.filter(
      ({ kind }) => kind === "byte",
    );

    // Then: browser content can only consume exporter-owned values.
    expect(theCat?.displayEncoding.at(-1)?.kind).toBe("eos");
    expect(theCat?.generationPrefix.map(({ kind }) => kind)).not.toContain(
      "eos",
    );
    expect(theCats?.text).toBe("the cats");
    expect(koreanBytes).toHaveLength(3);
    expect(koreanBytes?.every(({ kind }) => kind === "byte")).toBe(true);
    expect(koreanHan?.displayEncoding.map(({ kind }) => kind)).not.toContain(
      "unknown",
    );
  });

  test("derives the locked next adjacency without a stored successor field", () => {
    // Given: the validated Part and Chapter order.
    const chapterRecords = decoderCurriculum.parts.flatMap(({ chapters }) =>
      chapters.map((chapter) => chapter),
    );

    // When: adjacency is derived from order.
    const adjacency = deriveChapterAdjacency(decoderCurriculum);

    // Then: Part 0 progresses in sequence and crosses into Part 1.
    expect(adjacency.slice(0, 4)).toEqual([
      ["decoder.chapter.0.1", "decoder.chapter.0.2"],
      ["decoder.chapter.0.2", "decoder.chapter.0.3"],
      ["decoder.chapter.0.3", "decoder.chapter.0.4"],
      ["decoder.chapter.0.4", "decoder.chapter.1.1"],
    ]);
    expect(chapterRecords.every((chapter) => !("next" in chapter))).toBe(true);
  });
});
