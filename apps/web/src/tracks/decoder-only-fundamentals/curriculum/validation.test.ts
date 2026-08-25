import { describe, expect, test } from "vitest";
import { decoderCurriculum, decoderCurriculumRegistries } from "./catalog";
import { CHAPTER_IDS, CONCEPT_IDS, GUIDE_PAGE_IDS, PART_IDS } from "./ids";
import { destinationForChapter } from "./navigation";
import {
  type CurriculumCandidate,
  type CurriculumConceptCandidate,
  type CurriculumRegistries,
  deriveChapterAdjacency,
  validateCurriculum,
} from "./validation";

function fixtureValue<T>(value: T | undefined): T {
  if (value === undefined) throw new TypeError("Incomplete curriculum fixture");
  return value;
}

function withFirstPart(
  update: (
    part: CurriculumCandidate["parts"][number],
  ) => CurriculumCandidate["parts"][number],
): CurriculumCandidate {
  return {
    ...decoderCurriculum,
    parts: [
      update(fixtureValue(decoderCurriculum.parts[0])),
      ...decoderCurriculum.parts.slice(1),
    ],
  };
}

function withFirstConcept(
  update: (concept: CurriculumConceptCandidate) => CurriculumConceptCandidate,
): CurriculumCandidate {
  return withFirstPart((part) => ({
    ...part,
    chapters: [
      {
        ...firstChapter,
        concepts: [update(fixtureValue(firstChapter.concepts[0]))],
      },
      ...part.chapters.slice(1),
    ],
  }));
}

type GuideSections = CurriculumCandidate["guidePages"][number]["sections"];

function withFirstPageSections(sections: GuideSections): CurriculumCandidate {
  return {
    ...decoderCurriculum,
    guidePages: [
      { ...firstPage, sections },
      ...decoderCurriculum.guidePages.slice(1),
    ],
  };
}

function issueCodes(
  candidate: CurriculumCandidate,
  registries: CurriculumRegistries = decoderCurriculumRegistries,
): readonly string[] {
  return validateCurriculum(candidate, registries).map(({ code }) => code);
}

const firstPart = fixtureValue(decoderCurriculum.parts[0]);
const firstChapter = fixtureValue(firstPart.chapters[0]);
const firstPage = fixtureValue(decoderCurriculum.guidePages[0]);

// allow: SIZE_OK — fixed curriculum validator mutation matrix

describe("decoder curriculum structural validation", () => {
  test("models the exact fixed spine and eleven independent pages", () => {
    const chapters = decoderCurriculum.parts.flatMap((part) => part.chapters);
    const concepts = chapters.flatMap((chapter) => chapter.concepts);
    expect(decoderCurriculum.parts.map(({ id }) => id)).toEqual(PART_IDS);
    expect(chapters.map(({ id }) => id)).toEqual(CHAPTER_IDS);
    expect(concepts.map(({ id }) => id)).toEqual(CONCEPT_IDS);
    expect(decoderCurriculum.guidePages.map(({ id }) => id)).toEqual(
      GUIDE_PAGE_IDS,
    );
    expect(issueCodes(decoderCurriculum)).toEqual([]);
  });

  test.each([
    [
      "duplicate ID",
      { ...decoderCurriculum, parts: [...decoderCurriculum.parts, firstPart] },
      "duplicate-part-id",
    ],
    [
      "missing ID",
      withFirstPart((part) => ({ ...part, id: "" })),
      "missing-part-id",
    ],
    [
      "noncontiguous order",
      withFirstPart((part) => ({ ...part, order: 4 })),
      "noncontiguous-part-order",
    ],
    [
      "wrong parent",
      withFirstPart((part) => ({
        ...part,
        chapters: [
          { ...firstChapter, partId: "part.wrong" },
          ...part.chapters.slice(1),
        ],
      })),
      "chapter-parent-mismatch",
    ],
    [
      "one Concept per Chapter",
      withFirstPart((part) => ({
        ...part,
        chapters: [
          { ...firstChapter, concepts: [] },
          ...part.chapters.slice(1),
        ],
      })),
      "invalid-chapter-concept-count",
    ],
  ] as const)("reports %s", (_name, candidate, code) => {
    expect(issueCodes(candidate)).toContain(code);
  });

  test.each([
    [
      "section",
      withFirstConcept((value) => ({
        ...value,
        guideSectionIds: ["section.missing"],
      })),
      "unknown-guide-section",
    ],
    [
      "node",
      withFirstConcept((value) => ({
        ...value,
        relatedNodeIds: ["node.missing"],
      })),
      "unknown-related-node",
    ],
    [
      "Diagram",
      withFirstConcept((value) => ({ ...value, diagramId: "diagram.missing" })),
      "unknown-diagram",
    ],
    [
      "reference",
      withFirstConcept((value) => ({
        ...value,
        referenceIds: ["ref.missing"],
      })),
      "unknown-reference",
    ],
    [
      "mandatory Diagram",
      withFirstConcept((value) => ({ ...value, diagramId: "" })),
      "missing-diagram",
    ],
    [
      "Visualization registration",
      withFirstConcept((value) => ({
        ...value,
        visualizationId: "visualization.missing",
      })),
      "unknown-visualization",
    ],
    [
      "CTA Visualization policy",
      withFirstConcept((value) => ({ ...value, visualizationCtaCount: 1 })),
      "visualization-cta-without-visualization",
    ],
  ] as const)("reports a %s foreign key", (_name, candidate, code) => {
    expect(issueCodes(candidate)).toContain(code);
  });

  test.each([
    [
      "Formula",
      { id: "formula", kind: "formula", formulaId: "formula.missing" },
      "unknown-formula",
    ],
    [
      "term",
      { id: "term", kind: "term", termId: "term.missing" },
      "unknown-term",
    ],
  ] as const)(
    "reports a %s foreign key with a distinct issue type",
    (_name, block, code) => {
      const candidate = withFirstPageSections([
        { ...fixtureValue(firstPage.sections[0]), blocks: [block] },
      ]);
      expect(issueCodes(candidate)).toContain(code);
    },
  );

  test("rejects a wrong fixed reference role", () => {
    const references = decoderCurriculumRegistries.references.map(
      (reference, index) =>
        index === 0
          ? { ...reference, role: "implementation-source" as const }
          : reference,
    );
    expect(
      issueCodes(decoderCurriculum, {
        ...decoderCurriculumRegistries,
        references,
      }),
    ).toContain("wrong-reference-role");
  });

  test("does not let prior-section prose satisfy Formula ordering", () => {
    const candidate = withFirstPageSections([
      {
        ...fixtureValue(firstPage.sections[0]),
        blocks: [{ id: "prose", kind: "paragraph", text: "Explanation" }],
      },
      {
        id: "formula-section",
        title: "Formula",
        blocks: [
          { id: "formula", kind: "formula", formulaId: "formula.known" },
        ],
      },
    ]);
    expect(
      issueCodes(candidate, {
        ...decoderCurriculumRegistries,
        formulaIds: new Set(["formula.known"]),
      }),
    ).toContain("formula-before-explanation");
  });

  test.each([
    [
      "missing page",
      {
        ...decoderCurriculum,
        guidePages: decoderCurriculum.guidePages.slice(1),
      },
      "unknown-guide-page",
    ],
    [
      "duplicate page",
      {
        ...decoderCurriculum,
        guidePages: [...decoderCurriculum.guidePages, firstPage],
      },
      "duplicate-guide-page-id",
    ],
  ] as const)("reports %s", (_name, candidate, code) => {
    expect(issueCodes(candidate)).toContain(code);
  });

  test("rejects synthetic and duplicate incumbent Guide pages", () => {
    // Given: the fixed curriculum and a duplicate fixture using an incumbent page ID.
    const incumbentRootPage = {
      ...firstPage,
      id: "decoder-guide-root",
    };
    const duplicateRoot = {
      ...decoderCurriculum,
      guidePages: [
        ...decoderCurriculum.guidePages,
        incumbentRootPage,
        incumbentRootPage,
      ],
    };

    // When/Then: no synthetic Part 3–5 page exists and duplicate incumbent identity is rejected.
    expect(decoderCurriculum.guidePages.map(({ id }) => id)).toEqual(
      GUIDE_PAGE_IDS,
    );
    expect(issueCodes(duplicateRoot)).toContain("duplicate-guide-page-id");
  });

  test("maps Parts 3 through 5 only to exact incumbent destinations", () => {
    // Given/When: architecture Chapter destinations are resolved from the fixed spine.
    const destinations = CHAPTER_IDS.slice(11).map((chapterId) =>
      destinationForChapter(chapterId),
    );

    // Then: no synthetic route or section enters the curriculum boundary.
    expect(destinations).toEqual([
      {
        routeId: "decoder.root",
        pageId: "decoder-guide-root",
        sectionId: "root-generation-overview",
        nodeId: "decoder.root.architecture",
      },
      {
        routeId: "decoder.block",
        pageId: "decoder-guide-block",
        sectionId: "block-overview",
        nodeId: "decoder.root.transformer-block",
      },
      {
        routeId: "decoder.self-attention",
        pageId: "decoder-guide-self-attention",
        sectionId: "qkv",
        nodeId: "decoder.attention.qkv-projection",
      },
    ]);
  });

  test("derives successor and exposes a wrong-next CTA adjacency mutant", () => {
    const adjacency = deriveChapterAdjacency(decoderCurriculum);
    const mutant = withFirstPart((part) => ({
      ...part,
      chapters: [...part.chapters].reverse(),
    }));
    expect(adjacency[0]).toEqual([CHAPTER_IDS[0], CHAPTER_IDS[1]]);
    expect(adjacency[12]).toEqual([CHAPTER_IDS[12], CHAPTER_IDS[13]]);
    expect(deriveChapterAdjacency(mutant)).not.toEqual(adjacency);
  });
});
