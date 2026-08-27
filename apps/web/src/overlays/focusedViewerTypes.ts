import type { ReactNode } from "react";

import type { ArchitectureNodeId } from "../architecture/catalog";
import type { ArchitectureView } from "../architecture/state";
import type { LearningTrackId } from "../tracks/types";

export const focusedViewerKinds = [
  "diagram",
  "architecture",
  "visualization",
] as const;

export type FocusedViewerKind = (typeof focusedViewerKinds)[number];
export type FocusedViewerSource = "learn" | "lab";

type FocusedViewerRequestBase = Readonly<{
  id: string;
  kind: FocusedViewerKind;
  source: FocusedViewerSource;
  title: string;
  description?: string;
  articleTargetId?: string;
}>;

export type DiagramViewerRequest = FocusedViewerRequestBase &
  Readonly<{
    kind: "diagram";
    trackId: LearningTrackId;
    diagramId: string;
    resetKey: string;
    conceptId?: string;
    renderDiagram?: () => ReactNode | null;
  }>;

export type ArchitectureViewerRequest = FocusedViewerRequestBase &
  Readonly<{
    kind: "architecture";
    view: ArchitectureView;
    highlightedNodeIds: readonly ArchitectureNodeId[];
    conceptId?: string;
  }>;

export type VisualizationViewerRequest = FocusedViewerRequestBase &
  Readonly<{
    kind: "visualization";
    visualizationId: string;
    layer?: number;
    head?: number;
    selectedToken?: number;
    selectedQuery?: number;
    selectedKey?: number;
  }>;

export type FocusedViewerRequest =
  | DiagramViewerRequest
  | ArchitectureViewerRequest
  | VisualizationViewerRequest;
