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
  RunSummary,
} from "../generated/schema";
import type { FormulaDefinition, FormulaId } from "../math/formulaCatalog";
import type { LearningGuideCatalog, LearningGuidePage } from "./guideTypes";
import type { ScoreMatrixInspectionState } from "./visualization/scoreMatrixState";
import type {
  ArchitectureRouteCatalog,
  ArchitectureRouteDefinition,
  BreadcrumbItem,
  LearningNodeId,
  LearningTrackId,
} from "./workspaceTypes";

export type {
  ComparisonColumn,
  GlossaryEntry,
  GuideBlock,
  GuideInline,
  GuideListItem,
  GuideStep,
  LearningGuideCatalog,
  LearningGuideNextStep,
  LearningGuidePage,
  LearningGuideSection,
} from "./guideTypes";
export type {
  ArchitectureRouteCatalog,
  ArchitectureRouteDefinition,
  BreadcrumbItem,
  LearningNodeId,
  LearningRouteId,
  LearningTrackId,
  RuntimeFactPresentation,
  RuntimeFactsPresentation,
  SelectedOperationPresentation,
} from "./workspaceTypes";

export type LearningArchitectureSpec = Readonly<ModelArchitectureMetadata>;

export interface LearningNotationCatalog {
  readonly formulas: Readonly<Record<FormulaId, FormulaDefinition<FormulaId>>>;
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

export interface LearningCourseChapter {
  readonly id: string;
  readonly slug: string;
  readonly title: string;
}

export interface LearningCourseOverview {
  readonly title: string;
  readonly modelLabel: string;
  readonly summary: string;
  readonly journey: readonly string[];
  readonly initialChapterId: string;
  readonly chapters: readonly LearningCourseChapter[];
}

export interface LearningCourseLocation {
  readonly trackId: LearningTrackId;
  readonly chapterId: string;
  readonly homeHref: string;
  readonly chapterHref: (chapterId: string) => string;
  readonly navigateChapter: (chapterId: string) => void;
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
  readonly replaySummary?: Readonly<RunSummary> | null;
  readonly scoreMatrix?: ScoreMatrixInspectionState;
  readonly inspectScoreMatrix?: () => void;
  readonly navigate: (action: ArchitectureAction) => void;
  readonly course?: LearningCourseLocation;
}

export type FocusedArchitectureOptions = Readonly<{
  highlightedNodeIds: readonly ArchitectureNodeId[];
}>;

export type FocusedArchitecturePresentation = Readonly<{
  content: ReactNode;
  controls?: ReactNode;
}>;

export interface LearningTrackAdapter {
  readonly profile: LearningTrackProfile;
  supportsModel(metadata: Readonly<ModelMetadata>): boolean;
  getInitialRoute(): ArchitectureRouteDefinition;
  getBreadcrumbs(context: ArchitectureRenderContext): readonly BreadcrumbItem[];
  getGuidePage(context: ArchitectureRenderContext): LearningGuidePage;
  getAvailableRoutes(): readonly ArchitectureRouteDefinition[];
  renderArchitecture(context: ArchitectureRenderContext): ReactNode;
  renderFocusedArchitecture(
    context: ArchitectureRenderContext,
    options: FocusedArchitectureOptions,
  ): FocusedArchitecturePresentation;
}

export interface LearningTrackRegistration {
  readonly profile: LearningTrackProfile;
  readonly course?: LearningCourseOverview;
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
