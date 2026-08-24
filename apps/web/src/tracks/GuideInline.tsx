import type { ReactElement } from "react";
import type { FormulaDefinition } from "../math/formulaCatalog";
import { MathFormula } from "../math/MathFormula";
import type { GlossaryEntry, GuideInline } from "./types";

interface GuideInlineViewProps<Id extends string> {
  readonly inline: GuideInline<Id>;
  readonly pageId: string;
  readonly glossary: readonly GlossaryEntry[];
  readonly formulas: Readonly<Record<Id, FormulaDefinition<Id>>>;
}

export function GuideInlineView<Id extends string>({
  inline,
  pageId,
  glossary,
  formulas,
}: GuideInlineViewProps<Id>): ReactElement | null {
  switch (inline.kind) {
    case "text":
      return <>{inline.text}</>;
    case "strong":
      return <strong>{inline.text}</strong>;
    case "math":
      return <MathFormula formula={formulas[inline.formulaId]} />;
    case "term-ref": {
      const entry = glossary.find(({ id }) => id === inline.termId);
      return entry === undefined ? null : (
        <a href={`#${pageId}-glossary-${entry.id}`}>
          {inline.label ?? entry.term}
        </a>
      );
    }
    case "code":
      return <code>{inline.code}</code>;
  }
}
