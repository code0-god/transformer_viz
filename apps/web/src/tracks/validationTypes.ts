import type { ArchitectureNodeId } from "../architecture/catalog";
import type { FormulaDefinition } from "../math/formulaCatalog";
import type { LearningGuideCatalog } from "./guideTypes";
import type { ArchitectureRouteCatalog } from "./workspaceTypes";

export type LearningProfileIssueCode =
  | "associated-node-route-mismatch"
  | "duplicate-content-id"
  | "duplicate-glossary-id"
  | "duplicate-guide-page-id"
  | "duplicate-guide-section-id"
  | "duplicate-primary-node"
  | "duplicate-route-id"
  | "formula-before-explanation"
  | "guide-page-id-mismatch"
  | "guide-page-route-mismatch"
  | "missing-content-id"
  | "missing-glossary-id"
  | "missing-guide-page"
  | "missing-guide-page-id"
  | "missing-guide-section-id"
  | "missing-key-takeaway"
  | "missing-learning-goal"
  | "missing-next-step"
  | "missing-page-glossary"
  | "primary-node-not-interactive"
  | "primary-not-associated"
  | "terminal-next-step"
  | "uncovered-selectable-node"
  | "unknown-associated-node"
  | "unknown-formula"
  | "unknown-glossary-term"
  | "unknown-initial-route"
  | "unknown-next-step-route"
  | "unknown-operation-adapter"
  | "unknown-outline-section"
  | "unknown-primary-node"
  | "unknown-runtime-adapter";

export type LearningProfileIssue = {
  readonly [Code in LearningProfileIssueCode]: {
    readonly code: Code;
    readonly path: string;
    readonly relatedId?: string;
  };
}[LearningProfileIssueCode];

export type LearningProfileValidationInput<Id extends string> = {
  readonly architecture: {
    readonly nodeMap: Readonly<Record<string, ArchitectureNodeId | undefined>>;
  };
  readonly routes: ArchitectureRouteCatalog;
  readonly guide: LearningGuideCatalog<Id>;
  readonly notation: {
    readonly formulas: Readonly<Partial<Record<Id, FormulaDefinition<Id>>>>;
  };
};

export type ValidationContext<Id extends string> = {
  readonly profile: LearningProfileValidationInput<Id>;
  readonly glossaryIds: ReadonlySet<string>;
  readonly runtimeAdapterIds: ReadonlySet<string>;
  readonly operationAdapterIds: ReadonlySet<string>;
};
