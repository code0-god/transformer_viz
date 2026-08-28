import {
  type GuideBlock,
  type GuideInline,
  learningFigureSizes,
} from "../../guideTypes";
import { conceptRegistryIssues } from "./diagramRegistry";
import { referenceRoleIssues } from "./references";
import type {
  CurriculumCandidate,
  CurriculumIssue,
  CurriculumRegistries,
} from "./types";

export type {
  CurriculumCandidate,
  CurriculumConceptCandidate,
  CurriculumIssue,
  CurriculumIssueCode,
  CurriculumRegistries,
} from "./types";

class UnexpectedCurriculumVariantError extends Error {
  constructor() {
    super("Unexpected curriculum content variant");
    this.name = "UnexpectedCurriculumVariantError";
  }
}

function assertNever(_value: never): never {
  throw new UnexpectedCurriculumVariantError();
}

function inlineIssues(
  inline: GuideInline<string>,
  path: string,
  registries: CurriculumRegistries,
): readonly CurriculumIssue[] {
  switch (inline.kind) {
    case "code":
    case "strong":
    case "text":
      return [];
    case "math":
      return registries.formulaIds.has(inline.formulaId)
        ? []
        : [
            {
              code: "unknown-formula",
              path: `${path}.formulaId`,
              relatedId: inline.formulaId,
            },
          ];
    case "term-ref":
      return registries.termIds.has(inline.termId)
        ? []
        : [
            {
              code: "unknown-term",
              path: `${path}.termId`,
              relatedId: inline.termId,
            },
          ];
    default:
      return assertNever(inline);
  }
}

function blockIssues(
  blocks: readonly GuideBlock<string>[],
  blocksPath: string,
  registries: CurriculumRegistries,
): readonly CurriculumIssue[] {
  const issues: CurriculumIssue[] = [];
  let explained = false;
  blocks.forEach((block, index) => {
    const path = `${blocksPath}[${index}]`;
    switch (block.kind) {
      case "formula":
        if (!registries.formulaIds.has(block.formulaId)) {
          issues.push({
            code: "unknown-formula",
            path: `${path}.formulaId`,
            relatedId: block.formulaId,
          });
        }
        if (!explained) {
          issues.push({
            code: "formula-before-explanation",
            path,
            relatedId: block.formulaId,
          });
        }
        break;
      case "term":
        if (!registries.termIds.has(block.termId)) {
          issues.push({
            code: "unknown-term",
            path: `${path}.termId`,
            relatedId: block.termId,
          });
        }
        explained = true;
        break;
      case "rich-paragraph":
        block.content.forEach((inline, inlineIndex) => {
          issues.push(
            ...inlineIssues(
              inline,
              `${path}.content[${inlineIndex}]`,
              registries,
            ),
          );
        });
        explained = true;
        break;
      case "figure":
        if (!registries.figureIds.has(block.figureId)) {
          issues.push({
            code: "unknown-figure",
            path: `${path}.figureId`,
            relatedId: block.figureId,
          });
        }
        if (block.caption.trim() === "") {
          issues.push({
            code: "missing-figure-caption",
            path: `${path}.caption`,
          });
        }
        if (
          block.size !== undefined &&
          !learningFigureSizes.includes(block.size)
        ) {
          issues.push({
            code: "invalid-figure-size",
            path: `${path}.size`,
            relatedId: block.size,
          });
        }
        explained = true;
        break;
      case "bullets":
      case "callout":
      case "comparison":
      case "example":
      case "paragraph":
      case "steps":
        explained = true;
        break;
      case "runtime-facts":
      case "selected-operation":
        break;
      default:
        assertNever(block);
    }
  });
  return issues;
}

type FigureReference = Readonly<{
  figureId: string;
  path: string;
}>;

function figureReferences(
  page: CurriculumCandidate["guidePages"][number],
  pagePath: string,
): readonly FigureReference[] {
  const references: FigureReference[] = [];
  const collect = (
    blocks: readonly GuideBlock<string>[],
    path: string,
  ): void => {
    blocks.forEach((block, index) => {
      if (block.kind === "figure") {
        references.push({
          figureId: block.figureId,
          path: `${path}[${index}]`,
        });
      }
    });
  };
  collect(page.introduction, `${pagePath}.introduction`);
  page.sections.forEach((section, index) => {
    collect(section.blocks, `${pagePath}.sections[${index}].blocks`);
  });
  collect(page.keyTakeaway, `${pagePath}.keyTakeaway`);
  return references;
}

export function validateCurriculum(
  curriculum: CurriculumCandidate,
  registries: CurriculumRegistries,
): readonly CurriculumIssue[] {
  const issues: CurriculumIssue[] = [];
  const partIds = new Set<string>();
  const chapterIds = new Set<string>();
  const conceptIds = new Set<string>();
  const pages = new Map<
    string,
    Readonly<{
      page: CurriculumCandidate["guidePages"][number];
      path: string;
    }>
  >();

  curriculum.guidePages.forEach((page, index) => {
    const path = `guidePages[${index}]`;
    if (page.id.trim() === "")
      issues.push({ code: "missing-guide-page-id", path: `${path}.id` });
    if (pages.has(page.id))
      issues.push({
        code: "duplicate-guide-page-id",
        path: `${path}.id`,
        relatedId: page.id,
      });
    pages.set(page.id, { page, path });
    issues.push(
      ...blockIssues(page.introduction, `${path}.introduction`, registries),
    );
    page.sections.forEach((section, sectionIndex) => {
      issues.push(
        ...blockIssues(
          section.blocks,
          `${path}.sections[${sectionIndex}].blocks`,
          registries,
        ),
      );
    });
    issues.push(
      ...blockIssues(page.keyTakeaway, `${path}.keyTakeaway`, registries),
    );
  });

  curriculum.parts.forEach((part, partIndex) => {
    const partPath = `parts[${partIndex}]`;
    if (part.id.trim() === "")
      issues.push({ code: "missing-part-id", path: `${partPath}.id` });
    if (partIds.has(part.id))
      issues.push({
        code: "duplicate-part-id",
        path: `${partPath}.id`,
        relatedId: part.id,
      });
    if (part.order !== partIndex)
      issues.push({
        code: "noncontiguous-part-order",
        path: `${partPath}.order`,
      });
    partIds.add(part.id);
    part.chapters.forEach((chapter, chapterIndex) => {
      const chapterPath = `${partPath}.chapters[${chapterIndex}]`;
      if (chapter.id.trim() === "")
        issues.push({ code: "missing-chapter-id", path: `${chapterPath}.id` });
      if (chapterIds.has(chapter.id))
        issues.push({
          code: "duplicate-chapter-id",
          path: `${chapterPath}.id`,
          relatedId: chapter.id,
        });
      if (chapter.order !== chapterIndex)
        issues.push({
          code: "noncontiguous-chapter-order",
          path: `${chapterPath}.order`,
        });
      if (chapter.partId !== part.id)
        issues.push({
          code: "chapter-parent-mismatch",
          path: `${chapterPath}.partId`,
          relatedId: chapter.partId,
        });
      if (chapter.concepts.length !== 1)
        issues.push({
          code: "invalid-chapter-concept-count",
          path: `${chapterPath}.concepts`,
        });
      chapterIds.add(chapter.id);
      chapter.concepts.forEach((concept, conceptIndex) => {
        const path = `${chapterPath}.concepts[${conceptIndex}]`;
        if (concept.id.trim() === "")
          issues.push({ code: "missing-concept-id", path: `${path}.id` });
        if (conceptIds.has(concept.id))
          issues.push({
            code: "duplicate-concept-id",
            path: `${path}.id`,
            relatedId: concept.id,
          });
        if (concept.chapterId !== chapter.id)
          issues.push({
            code: "concept-parent-mismatch",
            path: `${path}.chapterId`,
            relatedId: concept.chapterId,
          });
        conceptIds.add(concept.id);
        issues.push(...conceptRegistryIssues(concept, path, registries));
        if (concept.guidePageId !== undefined) {
          const pageRecord = pages.get(concept.guidePageId);
          if (pageRecord === undefined)
            issues.push({
              code: "unknown-guide-page",
              path: `${path}.guidePageId`,
              relatedId: concept.guidePageId,
            });
          else {
            const { page, path: pagePath } = pageRecord;
            concept.guideSectionIds.forEach((id, index) => {
              if (!page.sections.some((section) => section.id === id))
                issues.push({
                  code: "unknown-guide-section",
                  path: `${path}.guideSectionIds[${index}]`,
                  relatedId: id,
                });
            });
            figureReferences(page, pagePath).forEach((reference) => {
              const owner = registries.figureOwners.get(reference.figureId);
              if (owner !== undefined && owner !== chapter.id) {
                issues.push({
                  code: "figure-chapter-mismatch",
                  path: `${reference.path}.figureId`,
                  relatedId: reference.figureId,
                });
              }
            });
          }
        }
      });
    });
  });

  issues.push(...referenceRoleIssues(registries.references));
  return issues;
}

export function deriveChapterAdjacency(
  curriculum: CurriculumCandidate,
): readonly (readonly [string, string])[] {
  const chapters = curriculum.parts.flatMap((part) =>
    part.chapters.map(({ id }) => id),
  );
  return chapters
    .slice(0, -1)
    .map((id, index) => [id, chapters[index + 1] ?? ""]);
}
