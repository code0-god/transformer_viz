import type { ArchitectureNodeId } from "../architecture/catalog";
import type { ArchitectureView } from "../architecture/state";

export const focusedViewerKinds = ["architecture", "visualization"] as const;

export type FocusedViewerKind = (typeof focusedViewerKinds)[number];
export type FocusedViewerSource = "lab";

type FocusedViewerRequestBase = Readonly<{
  id: string;
  kind: FocusedViewerKind;
  source: FocusedViewerSource;
  title: string;
  description?: string;
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
  | ArchitectureViewerRequest
  | VisualizationViewerRequest;
