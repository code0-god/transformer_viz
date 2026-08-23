import katex from "katex";
import { useLayoutEffect, useRef } from "react";

import type { FormulaDefinition, FormulaId } from "./formulaCatalog";

export interface MathFormulaProps {
  readonly formula: FormulaDefinition;
  readonly displayMode?: boolean;
  readonly className?: string;
}

const reportedFormulaErrors = new Set<FormulaId>();

function reportFormulaError(formula: FormulaDefinition): void {
  if (import.meta.env.DEV && !reportedFormulaErrors.has(formula.id)) {
    reportedFormulaErrors.add(formula.id);
    console.error(`Invalid trusted formula: ${formula.id}`);
  }
}

export function MathFormula({
  formula,
  displayMode = false,
  className,
}: MathFormulaProps) {
  const html = katex.renderToString(formula.tex, {
    displayMode,
    throwOnError: false,
    strict: "warn",
    trust: false,
    output: "htmlAndMathml",
  });
  const hasError = html.includes("katex-error");
  const containerRef = useRef<HTMLSpanElement>(null);

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (container !== null && !hasError) {
      katex.render(formula.tex, container, {
        displayMode,
        throwOnError: false,
        strict: "warn",
        trust: false,
        output: "htmlAndMathml",
      });
    }
  }, [displayMode, formula, hasError]);

  if (hasError) {
    reportFormulaError(formula);
    return (
      <span
        className={className}
        role="math"
        aria-label={formula.accessibleLabel}
      >
        {formula.plainText}
      </span>
    );
  }

  return (
    <span
      ref={containerRef}
      className={className}
      role="math"
      aria-label={formula.accessibleLabel}
    />
  );
}
