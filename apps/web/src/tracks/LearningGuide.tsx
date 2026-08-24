import type { ReactElement } from "react";
import type { FormulaDefinition, FormulaId } from "../math/formulaCatalog";
import { MathFormula } from "../math/MathFormula";
import type { GlossaryEntry, GuideBlock, LearningGuidePage } from "./types";

interface LearningGuideProps {
  readonly page: LearningGuidePage;
  readonly glossary: readonly GlossaryEntry[];
  readonly formulas: Readonly<Record<FormulaId, FormulaDefinition>>;
  readonly className?: string;
}

function blockKey(block: GuideBlock): string {
  switch (block.kind) {
    case "paragraph":
      return `paragraph:${block.text}`;
    case "bullets":
      return `bullets:${block.items.map(({ id }) => id).join(",")}`;
    case "steps":
      return `steps:${block.items.map(({ id }) => id).join(",")}`;
    case "formula":
      return `formula:${block.formulaId}`;
    case "callout":
      return `callout:${block.tone}:${block.title ?? block.text}`;
    case "comparison":
      return `comparison:${block.columns.map(({ id }) => id).join(",")}`;
    case "example":
      return `example:${block.title ?? block.lines.join(",")}`;
    case "term":
      return `term:${block.termId}`;
  }
}

function GuideBlockView({
  block,
  glossary,
  formulas,
}: Readonly<{
  block: GuideBlock;
  glossary: readonly GlossaryEntry[];
  formulas: Readonly<Record<FormulaId, FormulaDefinition>>;
}>): ReactElement | null {
  switch (block.kind) {
    case "paragraph":
      return <p>{block.text}</p>;
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
              <span>{item.title}</span>
              {item.explanation === undefined ? null : (
                <p>{item.explanation}</p>
              )}
            </li>
          ))}
        </ol>
      );
    case "formula":
      return (
        <div className="learning-guide-formula">
          <MathFormula formula={formulas[block.formulaId]} displayMode />
          {block.explanation === undefined ? null : <p>{block.explanation}</p>}
        </div>
      );
    case "callout":
      return (
        <aside data-guide-tone={block.tone}>
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
        <div className="learning-guide-example">
          {block.title === undefined ? null : <strong>{block.title}</strong>}
          <pre>{block.lines.join("\n")}</pre>
        </div>
      );
    case "term": {
      const entry = glossary.find(({ id }) => id === block.termId);
      return entry === undefined ? null : (
        <dl>
          <dt>{entry.term}</dt>
          <dd>{entry.definition}</dd>
        </dl>
      );
    }
  }
}

export function LearningGuide({
  page,
  glossary,
  formulas,
  className,
}: LearningGuideProps): ReactElement {
  return (
    <article
      className={className}
      data-guide-page-id={page.id}
      aria-labelledby={`${page.id}-title`}
    >
      <h3 id={`${page.id}-title`}>{page.title}</h3>
      {page.introduction.map((block) => (
        <GuideBlockView
          key={blockKey(block)}
          block={block}
          glossary={glossary}
          formulas={formulas}
        />
      ))}
      {page.sections.map((section) => (
        <section
          key={section.id}
          data-guide-section-id={section.id}
          data-associated-node-ids={section.associatedNodeIds?.join(" ")}
        >
          {section.title === "" ? null : <h4>{section.title}</h4>}
          {section.blocks.map((block) => (
            <GuideBlockView
              key={blockKey(block)}
              block={block}
              glossary={glossary}
              formulas={formulas}
            />
          ))}
        </section>
      ))}
      {page.keyTakeaway.map((block) => (
        <GuideBlockView
          key={blockKey(block)}
          block={block}
          glossary={glossary}
          formulas={formulas}
        />
      ))}
    </article>
  );
}
