import type { ReactElement } from "react";
import type { FormulaDefinition } from "../math/formulaCatalog";
import { MathFormula } from "../math/MathFormula";
import type {
  RuntimeFactPresentation,
  RuntimeFactsPresentation,
  SelectedOperationPresentation,
} from "./types";

function Fact({
  fact,
}: Readonly<{ fact: RuntimeFactPresentation }>): ReactElement {
  return (
    <div data-guide-fact-id={fact.id}>
      <dt>{fact.label}</dt>
      <dd>
        <span data-fact-status={fact.status}>{fact.value}</span>
        {fact.detail === undefined ? null : <small>{fact.detail}</small>}
      </dd>
    </div>
  );
}

export function RuntimeFacts({
  presentation,
}: Readonly<{
  presentation: RuntimeFactsPresentation;
}>): ReactElement {
  return (
    <details
      className="learning-guide-runtime"
      data-runtime-presentation-id={presentation.id}
    >
      <summary>{presentation.title ?? "구현 노트"}</summary>
      <dl>
        {presentation.facts.map((fact) => (
          <Fact key={fact.id} fact={fact} />
        ))}
      </dl>
    </details>
  );
}

export function SelectedOperation({
  presentation,
  formulas,
}: Readonly<{
  presentation: SelectedOperationPresentation;
  formulas: readonly FormulaDefinition[];
}>): ReactElement {
  return (
    <aside
      className="learning-guide-operation"
      data-operation-presentation-id={presentation.id}
    >
      <strong>{presentation.title}</strong>
      <p>{presentation.summary}</p>
      {presentation.formulaIds.map((formulaId) => {
        const formula = formulas.find(({ id }) => id === formulaId);
        return formula === undefined ? null : (
          <div className="learning-guide-math-scroll" key={formulaId}>
            <MathFormula formula={formula} displayMode />
          </div>
        );
      })}
      <dl>
        {presentation.facts.map((fact) => (
          <Fact key={fact.id} fact={fact} />
        ))}
      </dl>
    </aside>
  );
}
