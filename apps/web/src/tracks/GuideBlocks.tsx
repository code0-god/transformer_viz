import type { ReactElement } from "react";
import type { FormulaDefinition } from "../math/formulaCatalog";
import { MathFormula } from "../math/MathFormula";
import { RuntimeFacts, SelectedOperation } from "./GuideDynamicBlocks";
import { GuideInlineView } from "./GuideInline";
import type {
  GlossaryEntry,
  GuideBlock,
  RuntimeFactsPresentation,
  SelectedOperationPresentation,
} from "./types";

interface GuideBlockViewProps<Id extends string> {
  readonly block: GuideBlock<Id>;
  readonly pageId: string;
  readonly glossary: readonly GlossaryEntry[];
  readonly formulas: Readonly<Record<Id, FormulaDefinition<Id>>>;
  readonly runtimeFacts: Readonly<Record<string, RuntimeFactsPresentation>>;
  readonly selectedOperations: Readonly<
    Record<string, SelectedOperationPresentation>
  >;
  readonly showSelectedOperation: boolean;
}

export function GuideBlockView<Id extends string>({
  block,
  pageId,
  glossary,
  formulas,
  runtimeFacts,
  selectedOperations,
  showSelectedOperation,
}: GuideBlockViewProps<Id>): ReactElement | null {
  switch (block.kind) {
    case "paragraph":
      return <p>{block.text}</p>;
    case "rich-paragraph":
      return (
        <p>
          {block.content.map((inline) => (
            <GuideInlineView
              key={JSON.stringify(inline)}
              inline={inline}
              pageId={pageId}
              glossary={glossary}
              formulas={formulas}
            />
          ))}
        </p>
      );
    case "bullets":
      return (
        <ul>
          {block.items.map((item) => (
            <li key={item.id}>
              <strong>{item.title}</strong>
              <span>{item.text}</span>
            </li>
          ))}
        </ul>
      );
    case "steps":
      return (
        <ol>
          {block.items.map((item) => (
            <li key={item.id}>
              <strong>{item.title}</strong>
              {item.explanation === undefined ? null : (
                <p>{item.explanation}</p>
              )}
            </li>
          ))}
        </ol>
      );
    case "formula":
      return (
        <div className="learning-guide-formula learning-guide-math-scroll">
          <MathFormula formula={formulas[block.formulaId]} displayMode />
          {block.explanation === undefined ? null : <p>{block.explanation}</p>}
        </div>
      );
    case "callout":
      return (
        <aside className="learning-guide-callout" data-guide-tone={block.tone}>
          {block.title === undefined ? null : <strong>{block.title}</strong>}
          <p>{block.text}</p>
        </aside>
      );
    case "comparison":
      return (
        <div className="learning-guide-comparison">
          {block.columns.map((column) => (
            <section key={column.id}>
              <strong>{column.title}</strong>
              <ul>
                {column.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      );
    case "example":
      return (
        <figure className="learning-guide-example">
          {block.title === undefined ? null : (
            <figcaption>{block.title}</figcaption>
          )}
          <pre>{block.lines.join("\n")}</pre>
        </figure>
      );
    case "term": {
      const entry = glossary.find(({ id }) => id === block.termId);
      return entry === undefined ? null : (
        <dl className="learning-guide-term">
          <dt>{entry.term}</dt>
          <dd>{entry.definition}</dd>
        </dl>
      );
    }
    case "runtime-facts": {
      const presentation = runtimeFacts[block.adapterId];
      return presentation === undefined ? null : (
        <RuntimeFacts presentation={presentation} />
      );
    }
    case "selected-operation": {
      const presentation = selectedOperations[block.adapterId];
      return presentation === undefined || !showSelectedOperation ? null : (
        <SelectedOperation
          presentation={presentation}
          formulas={Object.values(formulas)}
        />
      );
    }
    case "implementation-note":
      return (
        <details className="learning-guide-implementation-note">
          <summary>{block.title ?? "구현 노트"}</summary>
          <ul>
            {block.items.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </details>
      );
  }
}
