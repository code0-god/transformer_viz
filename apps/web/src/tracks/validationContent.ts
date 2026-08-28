import type { GuideBlock, GuideInline } from "./guideTypes";
import type {
  LearningProfileIssue,
  ValidationContext,
} from "./validationTypes";

class UnexpectedGuideVariantError extends Error {
  constructor() {
    super("Unexpected guide variant");
    this.name = "UnexpectedGuideVariantError";
  }
}

function assertNever(_value: never): never {
  throw new UnexpectedGuideVariantError();
}

type ContentScan<Id extends string> = {
  readonly context: ValidationContext<Id>;
  readonly ids: Set<string>;
  readonly issues: LearningProfileIssue[];
  explained: boolean;
};

function registerId(id: string, path: string, scan: ContentScan<string>): void {
  if (id.trim() === "") {
    scan.issues.push({ code: "missing-content-id", path });
    return;
  }
  if (scan.ids.has(id)) {
    scan.issues.push({ code: "duplicate-content-id", path, relatedId: id });
  }
  scan.ids.add(id);
}

function scanInline<Id extends string>(
  inline: GuideInline<Id>,
  path: string,
  scan: ContentScan<Id>,
): void {
  switch (inline.kind) {
    case "code":
    case "strong":
    case "text":
      return;
    case "math":
      if (
        scan.context.profile.notation.formulas[inline.formulaId] === undefined
      ) {
        scan.issues.push({
          code: "unknown-formula",
          path: `${path}.formulaId`,
          relatedId: inline.formulaId,
        });
      }
      return;
    case "term-ref":
      if (!scan.context.glossaryIds.has(inline.termId)) {
        scan.issues.push({
          code: "unknown-glossary-term",
          path: `${path}.termId`,
          relatedId: inline.termId,
        });
      }
      return;
    default:
      assertNever(inline);
  }
}

export function scanGuideBlock<Id extends string>(
  block: GuideBlock<Id>,
  path: string,
  scan: ContentScan<Id>,
): void {
  registerId(block.id, `${path}.id`, scan);
  switch (block.kind) {
    case "paragraph":
    case "callout":
    case "example":
    case "implementation-note":
      scan.explained = true;
      return;
    case "rich-paragraph":
      block.content.forEach((inline, index) => {
        scanInline(inline, `${path}.content[${index}]`, scan);
      });
      scan.explained = true;
      return;
    case "bullets":
    case "steps":
      block.items.forEach((item, index) => {
        registerId(item.id, `${path}.items[${index}].id`, scan);
      });
      scan.explained = true;
      return;
    case "comparison":
      block.columns.forEach((column, index) => {
        registerId(column.id, `${path}.columns[${index}].id`, scan);
      });
      scan.explained = true;
      return;
    case "term":
      if (!scan.context.glossaryIds.has(block.termId)) {
        scan.issues.push({
          code: "unknown-glossary-term",
          path: `${path}.termId`,
          relatedId: block.termId,
        });
      }
      scan.explained = true;
      return;
    case "formula":
      if (
        scan.context.profile.notation.formulas[block.formulaId] === undefined
      ) {
        scan.issues.push({
          code: "unknown-formula",
          path: `${path}.formulaId`,
          relatedId: block.formulaId,
        });
      }
      if (!scan.explained) {
        scan.issues.push({
          code: "formula-before-explanation",
          path,
          relatedId: block.formulaId,
        });
      }
      return;
    case "runtime-facts":
      if (!scan.context.runtimeAdapterIds.has(block.adapterId)) {
        scan.issues.push({
          code: "unknown-runtime-adapter",
          path: `${path}.adapterId`,
          relatedId: block.adapterId,
        });
      }
      return;
    case "selected-operation":
      if (!scan.context.operationAdapterIds.has(block.adapterId)) {
        scan.issues.push({
          code: "unknown-operation-adapter",
          path: `${path}.adapterId`,
          relatedId: block.adapterId,
        });
      }
      return;
    default:
      assertNever(block);
  }
}

export function createContentScan<Id extends string>(
  context: ValidationContext<Id>,
): ContentScan<Id> {
  return { context, ids: new Set<string>(), issues: [], explained: false };
}
