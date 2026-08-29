import type { ReactElement } from "react";
import type { FormulaDefinition } from "../math/formulaCatalog";
import { GuideBlockView } from "./GuideBlocks";
import type { LearningFigureRegistry } from "./learningFigureTypes";
import type {
  GlossaryEntry,
  LearningGuideNextStep,
  LearningGuidePage,
  LearningNodeId,
  RuntimeFactsPresentation,
  SelectedOperationPresentation,
} from "./types";
import "./learningGuide.css";

interface LearningGuideProps<Id extends string> {
  readonly page: LearningGuidePage<Id>;
  readonly glossary: readonly GlossaryEntry[];
  readonly formulas: Readonly<Record<Id, FormulaDefinition<Id>>>;
  readonly runtimeFacts?: Readonly<Record<string, RuntimeFactsPresentation>>;
  readonly selectedOperations?: Readonly<
    Record<string, SelectedOperationPresentation>
  >;
  readonly activeSectionId?: string;
  readonly selectedNodeId?: LearningNodeId;
  readonly className?: string;
  readonly onSectionRef?: (
    sectionId: string,
    element: HTMLElement | null,
  ) => void;
  readonly onNavigate?: (nextStep: LearningGuideNextStep) => void;
  readonly presentation?: "route" | "chapter";
  readonly labelledBy?: string;
  readonly figures?: LearningFigureRegistry;
}

const EMPTY_RUNTIME_FACTS: Readonly<Record<string, RuntimeFactsPresentation>> =
  {};
const EMPTY_SELECTED_OPERATIONS: Readonly<
  Record<string, SelectedOperationPresentation>
> = {};

function sectionHeadingId(pageId: string, sectionId: string): string {
  return `${pageId}-${sectionId}-title`;
}

export function LearningGuide<Id extends string>({
  page,
  glossary,
  formulas,
  runtimeFacts = EMPTY_RUNTIME_FACTS,
  selectedOperations = EMPTY_SELECTED_OPERATIONS,
  activeSectionId,
  selectedNodeId,
  className,
  onSectionRef,
  onNavigate,
  presentation = "route",
  labelledBy,
  figures,
}: LearningGuideProps<Id>): ReactElement {
  const candidateOutlineSections = (page.outlineSectionIds ?? []).flatMap(
    (sectionId) => {
      const section = page.sections.find(({ id }) => id === sectionId);
      return section === undefined ? [] : [section];
    },
  );
  const outlineMode = page.outline ?? "auto";
  const outlineSections =
    outlineMode === "visible" ||
    (outlineMode === "auto" && candidateOutlineSections.length > 5)
      ? candidateOutlineSections
      : [];
  const glossaryEntries = page.glossary.flatMap((termId) => {
    const entry = glossary.find(({ id }) => id === termId);
    return entry === undefined ? [] : [entry];
  });
  const classes = ["learning-guide", className].filter(
    (value) => value !== undefined,
  );
  const nextStep = page.nextStep;
  const SectionHeading = presentation === "chapter" ? "h2" : "h4";

  return (
    <article
      className={classes.join(" ")}
      data-guide-page-id={page.id}
      data-threeui-surface="article"
      aria-labelledby={labelledBy ?? `${page.id}-title`}
    >
      {presentation === "route" ? (
        <header className="learning-guide-header">
          <h3 id={`${page.id}-title`}>{page.title}</h3>
          <p className="learning-guide-goal" data-testid="learning-goal">
            <strong>학습 목표</strong>
            <span>{page.learningGoal}</span>
          </p>
        </header>
      ) : null}

      {page.introduction.length === 0 ? null : (
        <section
          className="learning-guide-introduction"
          data-testid="guide-introduction"
          aria-label="들어가기"
        >
          {page.introduction.map((block) => (
            <GuideBlockView
              key={block.id}
              block={block}
              pageId={page.id}
              glossary={glossary}
              formulas={formulas}
              runtimeFacts={runtimeFacts}
              selectedOperations={selectedOperations}
              showSelectedOperation={false}
              figures={figures}
            />
          ))}
        </section>
      )}

      {outlineSections.length === 0 ? null : (
        <details className="learning-guide-outline">
          <summary>이 글의 흐름</summary>
          <nav aria-label="학습 목차">
            <ol>
              {outlineSections.map((section) => (
                <li key={section.id}>
                  <a
                    href={`#${sectionHeadingId(page.id, section.id)}`}
                    onClick={(event) => {
                      event.preventDefault();
                      const heading = document.getElementById(
                        sectionHeadingId(page.id, section.id),
                      );
                      if (!(heading instanceof HTMLElement)) return;
                      heading.tabIndex = -1;
                      heading.focus({ preventScroll: true });
                      if (typeof heading.scrollIntoView === "function") {
                        heading.scrollIntoView({ block: "start" });
                      }
                    }}
                    aria-current={
                      section.id === activeSectionId ? "location" : undefined
                    }
                  >
                    {section.title}
                  </a>
                </li>
              ))}
            </ol>
          </nav>
        </details>
      )}

      <div className="learning-guide-sections">
        {page.sections.map((section) => {
          const isActive = section.id === activeSectionId;
          const containsSelectedNode =
            selectedNodeId !== undefined &&
            (section.primaryNodeId === selectedNodeId ||
              section.associatedNodeIds?.includes(selectedNodeId) === true);
          return (
            <section
              key={section.id}
              ref={(element) => onSectionRef?.(section.id, element)}
              className="learning-guide-section"
              data-guide-section-id={section.id}
              tabIndex={-1}
              data-primary-node-id={section.primaryNodeId}
              data-associated-node-ids={section.associatedNodeIds?.join(" ")}
              data-active={isActive}
              {...(section.title === ""
                ? {}
                : { "aria-labelledby": sectionHeadingId(page.id, section.id) })}
            >
              {section.title === "" ? null : (
                <div className="learning-guide-section-heading">
                  <SectionHeading id={sectionHeadingId(page.id, section.id)}>
                    {section.title}
                  </SectionHeading>
                </div>
              )}
              {section.blocks.map((block) => (
                <GuideBlockView
                  key={block.id}
                  block={block}
                  pageId={page.id}
                  glossary={glossary}
                  formulas={formulas}
                  runtimeFacts={runtimeFacts}
                  selectedOperations={selectedOperations}
                  showSelectedOperation={containsSelectedNode}
                  figures={figures}
                />
              ))}
            </section>
          );
        })}
      </div>

      {page.keyTakeaway.length === 0 ? null : (
        <section
          className="learning-guide-takeaway"
          data-testid="key-takeaway"
          aria-label="핵심 정리"
        >
          <SectionHeading>핵심 정리</SectionHeading>
          {page.keyTakeaway.map((block) => (
            <GuideBlockView
              key={block.id}
              block={block}
              pageId={page.id}
              glossary={glossary}
              formulas={formulas}
              runtimeFacts={runtimeFacts}
              selectedOperations={selectedOperations}
              showSelectedOperation={false}
              figures={figures}
            />
          ))}
        </section>
      )}

      {glossaryEntries.length === 0 ? null : (
        <section
          className="learning-guide-glossary"
          data-testid="guide-glossary"
        >
          <SectionHeading>용어 정리</SectionHeading>
          <dl>
            {glossaryEntries.map((entry) => (
              <div key={entry.id} id={`${page.id}-glossary-${entry.id}`}>
                <dt>{entry.term}</dt>
                <dd>{entry.definition}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}

      {nextStep === undefined || onNavigate === undefined ? null : (
        <footer className="learning-guide-next-step">
          <button
            type="button"
            aria-label={nextStep.label}
            onClick={() => onNavigate(nextStep)}
          >
            {nextStep.label}
          </button>
        </footer>
      )}
    </article>
  );
}
