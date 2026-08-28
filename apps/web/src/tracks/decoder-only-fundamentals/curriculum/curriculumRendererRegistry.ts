import type { ComponentType } from "react";

import type { FormulaDefinition } from "../../../math/formulaCatalog";
import type { LearningFigureRegistry } from "../../learningFigureTypes";
import type {
  GlossaryEntry,
  LearningGuidePage,
  RuntimeFactsPresentation,
} from "../../types";
import type { DiagramId, GuidePageId, LearningCurriculum } from "./types";

export type CurriculumDiagramRendererProps = Readonly<Record<never, never>>;

export type CurriculumRendererRegistry = {
  readonly resolveGuidePage: (
    pageId: GuidePageId,
  ) => LearningGuidePage<string> | undefined;
  readonly resolveDiagram: (
    diagramId: DiagramId,
  ) => ComponentType<CurriculumDiagramRendererProps> | undefined;
  readonly glossary: readonly GlossaryEntry[];
  readonly formulas: Readonly<Record<string, FormulaDefinition<string>>>;
  readonly runtimeFacts: Readonly<Record<string, RuntimeFactsPresentation>>;
  readonly figures: LearningFigureRegistry;
};

export type RenderableCurriculum = LearningCurriculum & {
  readonly rendererRegistry?: CurriculumRendererRegistry;
};
