import type { GuideBlock, LearningGuidePage } from "../../guideTypes";

export type PartId = `decoder.part.${0 | 1 | 2 | 3 | 4 | 5}`;
export type ChapterId =
  | `decoder.chapter.${0 | 1 | 2}.${1 | 2 | 3 | 4}`
  | `decoder.chapter.${3 | 4 | 5}.1`;
export type ConceptId = `decoder.${string}`;
export type GuidePageId =
  `decoder.curriculum.guide.${0 | 1 | 2}.${1 | 2 | 3 | 4}`;
export type DiagramId =
  | `decoder.diagram.${string}`
  | "root"
  | "transformer-block"
  | "self-attention";

export function isDiagramId(value: string): value is DiagramId {
  return (
    value === "root" ||
    value === "transformer-block" ||
    value === "self-attention" ||
    value.startsWith("decoder.diagram.")
  );
}
export type VisualizationId = `decoder.visualization.${string}`;
export type ReferenceId = `ref.${string}`;
export type ReferenceRole =
  | "pedagogical-reference"
  | "implementation-source"
  | "primary-technical-source";

export type LearningReference = {
  readonly id: ReferenceId;
  readonly role: ReferenceRole;
  readonly source: string;
  readonly topicUsed: string;
  readonly currentModelCorrection: string;
  readonly exclusion: string;
  readonly accessDate: string;
};

export type LearningConcept = {
  readonly id: ConceptId;
  readonly chapterId: ChapterId;
  readonly title: string;
  readonly guidePageId?: GuidePageId;
  readonly guideSectionIds: readonly string[];
  readonly relatedNodeIds: readonly string[];
  readonly diagramId: DiagramId;
  readonly visualizationId?: VisualizationId;
  readonly visualizationCtaCount: number;
  readonly referenceIds: readonly ReferenceId[];
};

export type LearningChapter = {
  readonly id: ChapterId;
  readonly partId: PartId;
  readonly order: number;
  readonly title: string;
  readonly concepts: readonly LearningConcept[];
};

export type LearningPart = {
  readonly id: PartId;
  readonly order: number;
  readonly title: string;
  readonly chapters: readonly LearningChapter[];
};

export type CurriculumGuidePage = Pick<
  LearningGuidePage<string>,
  "id" | "sections"
>;

export type LearningCurriculum = {
  readonly parts: readonly LearningPart[];
  readonly guidePages: readonly CurriculumGuidePage[];
};

export type CurriculumConceptCandidate = {
  readonly id: string;
  readonly chapterId: string;
  readonly title: string;
  readonly guidePageId?: string;
  readonly guideSectionIds: readonly string[];
  readonly relatedNodeIds: readonly string[];
  readonly diagramId: string;
  readonly visualizationId?: string;
  readonly visualizationCtaCount: number;
  readonly referenceIds: readonly string[];
};

export type CurriculumCandidate = {
  readonly parts: readonly {
    readonly id: string;
    readonly order: number;
    readonly title: string;
    readonly chapters: readonly {
      readonly id: string;
      readonly partId: string;
      readonly order: number;
      readonly title: string;
      readonly concepts: readonly CurriculumConceptCandidate[];
    }[];
  }[];
  readonly guidePages: readonly {
    readonly id: string;
    readonly sections: readonly {
      readonly id: string;
      readonly title: string;
      readonly blocks: readonly GuideBlock<string>[];
    }[];
  }[];
};

export type CurriculumRegistries = {
  readonly diagramIds: ReadonlySet<string>;
  readonly visualizationIds: ReadonlySet<string>;
  readonly nodeIds: ReadonlySet<string>;
  readonly formulaIds: ReadonlySet<string>;
  readonly termIds: ReadonlySet<string>;
  readonly references: readonly LearningReference[];
};

export type CurriculumIssueCode =
  | "chapter-parent-mismatch"
  | "concept-parent-mismatch"
  | "duplicate-chapter-id"
  | "duplicate-concept-id"
  | "duplicate-guide-page-id"
  | "duplicate-part-id"
  | "formula-before-explanation"
  | "invalid-chapter-concept-count"
  | "missing-chapter-id"
  | "missing-concept-id"
  | "missing-diagram"
  | "missing-guide-page-id"
  | "missing-part-id"
  | "noncontiguous-chapter-order"
  | "noncontiguous-part-order"
  | "unknown-diagram"
  | "unknown-formula"
  | "unknown-guide-page"
  | "unknown-guide-section"
  | "unknown-reference"
  | "unknown-related-node"
  | "unknown-term"
  | "unknown-visualization"
  | "visualization-cta-without-visualization"
  | "wrong-reference-role";

export type CurriculumIssue = {
  readonly code: CurriculumIssueCode;
  readonly path: string;
  readonly relatedId?: string;
};
