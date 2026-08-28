import type { FormulaId } from "../math/formulaCatalog";
import type { LearningNodeId, LearningRouteId } from "./workspaceTypes";

export type GuideInline<Id extends string = FormulaId> =
  | {
      readonly kind: "text";
      readonly text: string;
    }
  | {
      readonly kind: "strong";
      readonly text: string;
    }
  | {
      readonly kind: "math";
      readonly formulaId: Id;
    }
  | {
      readonly kind: "term-ref";
      readonly termId: string;
      readonly label?: string;
    }
  | {
      readonly kind: "code";
      readonly code: string;
    };

export type GuideListItem = {
  readonly id: string;
  readonly title: string;
  readonly text: string;
};

export type GuideStep = {
  readonly id: string;
  readonly title: string;
  readonly explanation?: string;
};

export type ComparisonColumn = {
  readonly id: string;
  readonly title: string;
  readonly items: readonly string[];
};

export const learningFigureSizes = ["prose", "wide", "full"] as const;
export type LearningFigureSize = (typeof learningFigureSizes)[number];

export type GuideBlock<Id extends string = FormulaId> =
  | {
      readonly id: string;
      readonly kind: "paragraph";
      readonly text: string;
    }
  | {
      readonly id: string;
      readonly kind: "rich-paragraph";
      readonly content: readonly GuideInline<Id>[];
    }
  | {
      readonly id: string;
      readonly kind: "bullets";
      readonly items: readonly GuideListItem[];
    }
  | {
      readonly id: string;
      readonly kind: "steps";
      readonly items: readonly GuideStep[];
    }
  | {
      readonly id: string;
      readonly kind: "formula";
      readonly formulaId: Id;
      readonly explanation?: string;
    }
  | {
      readonly id: string;
      readonly kind: "callout";
      readonly tone: "note" | "important" | "warning" | "analogy";
      readonly title?: string;
      readonly text: string;
    }
  | {
      readonly id: string;
      readonly kind: "comparison";
      readonly columns: readonly ComparisonColumn[];
    }
  | {
      readonly id: string;
      readonly kind: "example";
      readonly title?: string;
      readonly lines: readonly string[];
    }
  | {
      readonly id: string;
      readonly kind: "term";
      readonly termId: string;
    }
  | {
      readonly id: string;
      readonly kind: "runtime-facts";
      readonly adapterId: string;
    }
  | {
      readonly id: string;
      readonly kind: "selected-operation";
      readonly adapterId: string;
    }
  | {
      readonly id: string;
      readonly kind: "figure";
      readonly figureId: string;
      readonly size?: LearningFigureSize;
      readonly caption: string;
      readonly alt?: string;
    };

export type LearningGuideSection<Id extends string = FormulaId> = {
  readonly id: string;
  readonly title: string;
  readonly primaryNodeId?: LearningNodeId;
  readonly associatedNodeIds?: readonly LearningNodeId[];
  readonly blocks: readonly GuideBlock<Id>[];
};

export type GlossaryEntry = {
  readonly id: string;
  readonly term: string;
  readonly definition: string;
};

export type LearningGuideNextStep = {
  readonly routeId: LearningRouteId;
  readonly label: string;
};

export type LearningGuidePage<Id extends string = FormulaId> = {
  readonly id: string;
  readonly routeId: LearningRouteId;
  readonly title: string;
  readonly learningGoal: string;
  readonly outline?: "hidden" | "auto" | "visible";
  readonly introduction: readonly GuideBlock<Id>[];
  readonly sections: readonly LearningGuideSection<Id>[];
  readonly outlineSectionIds?: readonly string[];
  readonly keyTakeaway: readonly GuideBlock<Id>[];
  readonly glossary: readonly string[];
  readonly nextStep?: LearningGuideNextStep;
};

export type LearningGuideCatalog<Id extends string = FormulaId> = {
  readonly pages: Readonly<
    Partial<Record<LearningRouteId, LearningGuidePage<Id>>>
  >;
  readonly glossary: readonly GlossaryEntry[];
  readonly runtimeAdapterIds?: readonly string[];
  readonly operationAdapterIds?: readonly string[];
  readonly figureIds?: readonly string[];
};
