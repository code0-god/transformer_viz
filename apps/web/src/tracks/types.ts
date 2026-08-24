import type { ReactNode } from "react";
import type {
  ArchitectureAction,
  ArchitectureNodeId,
  ArchitectureState,
} from "../architecture";
import type { NotationEntry } from "../domain/notationTypes";
import type {
  ModelArchitectureMetadata,
  ModelMetadata,
} from "../generated/schema";
import type { FormulaDefinition, FormulaId } from "../math/formulaCatalog";

export type LearningTrackId =
  | "decoder-only-fundamentals"
  | "canonical-encoder-decoder";

export type LearningRouteId =
  | "decoder.root"
  | "decoder.block"
  | "decoder.self-attention"
  | `canonical.${string}`;

export type LearningNodeId =
  | `decoder.root.${string}`
  | `decoder.block.${string}`
  | `decoder.attention.${string}`
  | `canonical.${string}`;

export type LearningArchitectureSpec = Readonly<ModelArchitectureMetadata>;

export interface BreadcrumbItem {
  readonly id: string;
  readonly label: string;
  readonly current: boolean;
}

export interface ArchitectureRouteDefinition {
  readonly id: LearningRouteId;
  readonly title: string;
  readonly guidePageId: string;
}

export interface ArchitectureRouteCatalog {
  readonly initialRouteId: LearningRouteId;
  readonly definitions: readonly ArchitectureRouteDefinition[];
}

export interface GuideListItem {
  readonly id: string;
  readonly title: string;
  readonly text: string;
}

export interface GuideStep {
  readonly id: string;
  readonly title: string;
  readonly explanation?: string;
}

export interface ComparisonColumn {
  readonly id: string;
  readonly title: string;
  readonly items: readonly string[];
}

export type GuideBlock =
  | {
      readonly kind: "paragraph";
      readonly text: string;
    }
  | {
      readonly kind: "bullets";
      readonly items: readonly GuideListItem[];
    }
  | {
      readonly kind: "steps";
      readonly items: readonly GuideStep[];
    }
  | {
      readonly kind: "formula";
      readonly formulaId: FormulaId;
      readonly explanation?: string;
    }
  | {
      readonly kind: "callout";
      readonly tone: "note" | "important" | "warning" | "analogy";
      readonly title?: string;
      readonly text: string;
    }
  | {
      readonly kind: "comparison";
      readonly columns: readonly ComparisonColumn[];
    }
  | {
      readonly kind: "example";
      readonly title?: string;
      readonly lines: readonly string[];
    }
  | {
      readonly kind: "term";
      readonly termId: string;
    };

export interface LearningGuideSection {
  readonly id: string;
  readonly title: string;
  readonly associatedNodeIds?: readonly LearningNodeId[];
  readonly blocks: readonly GuideBlock[];
}

export interface GlossaryEntry {
  readonly id: string;
  readonly term: string;
  readonly definition: string;
}

export interface LearningGuideNextStep {
  readonly routeId: LearningRouteId;
  readonly label: string;
}

export interface LearningGuidePage {
  readonly id: string;
  readonly routeId: LearningRouteId;
  readonly title: string;
  readonly learningGoal: string;
  readonly introduction: readonly GuideBlock[];
  readonly sections: readonly LearningGuideSection[];
  readonly keyTakeaway: readonly GuideBlock[];
  readonly glossary: readonly string[];
  readonly nextStep?: LearningGuideNextStep;
}

export interface LearningGuideCatalog {
  readonly pages: Readonly<Partial<Record<LearningRouteId, LearningGuidePage>>>;
  readonly glossary: readonly GlossaryEntry[];
}

export interface LearningNotationCatalog {
  readonly formulas: Readonly<Record<FormulaId, FormulaDefinition>>;
  readonly entries: Readonly<Record<ArchitectureNodeId, NotationEntry>>;
  readonly symbols: readonly Readonly<{
    readonly symbol: string;
    readonly meaning: string;
  }>[];
}

export interface LearningProfileArchitecture {
  readonly expected: LearningArchitectureSpec;
  readonly nodeMap: Readonly<
    Partial<Record<LearningNodeId, ArchitectureNodeId>>
  >;
}

export interface LearningTrackProfile {
  readonly id: LearningTrackId;
  readonly title: string;
  readonly shortTitle: string;
  readonly subtitle: string;
  readonly description: string;
  readonly compatibleArchitectureIds: readonly string[];
  readonly compatibleModelIds?: readonly string[];
  readonly architecture: LearningProfileArchitecture;
  readonly routes: ArchitectureRouteCatalog;
  readonly guide: LearningGuideCatalog;
  readonly notation: LearningNotationCatalog;
}

export interface ArchitectureRenderContext {
  readonly model: Readonly<ModelMetadata>;
  readonly state: ArchitectureState;
  readonly replaySequenceLength: number | null;
  readonly navigate: (action: ArchitectureAction) => void;
}

export interface LearningTrackAdapter {
  readonly profile: LearningTrackProfile;
  supportsModel(metadata: Readonly<ModelMetadata>): boolean;
  getInitialRoute(): ArchitectureRouteDefinition;
  getBreadcrumbs(context: ArchitectureRenderContext): readonly BreadcrumbItem[];
  getGuidePage(context: ArchitectureRenderContext): LearningGuidePage;
  getAvailableRoutes(): readonly ArchitectureRouteDefinition[];
  renderArchitecture(context: ArchitectureRenderContext): ReactNode;
}

export interface LearningTrackRegistration {
  readonly profile: LearningTrackProfile;
  createAdapter(): LearningTrackAdapter;
}

export type LearningTrackResolution =
  | {
      readonly status: "supported";
      readonly adapter: LearningTrackAdapter;
    }
  | {
      readonly status: "unsupported";
      readonly reason:
        | "unknown-architecture"
        | "incompatible-model"
        | "incompatible-architecture";
      readonly model: Readonly<ModelMetadata>;
      readonly supportedTracks: readonly string[];
    };
