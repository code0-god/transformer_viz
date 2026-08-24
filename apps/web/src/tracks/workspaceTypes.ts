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

export type BreadcrumbItem = {
  readonly id: string;
  readonly label: string;
  readonly current: boolean;
};

export type ArchitectureRouteDefinition = {
  readonly id: LearningRouteId;
  readonly title: string;
  readonly subtitle: string;
  readonly guidePageId: string;
  readonly terminal: boolean;
};

export type ArchitectureRouteCatalog = {
  readonly initialRouteId: LearningRouteId;
  readonly definitions: readonly ArchitectureRouteDefinition[];
};

export type RuntimeFactPresentation = {
  readonly id: string;
  readonly label: string;
  readonly value: string;
  readonly status: "ready" | "pending";
  readonly detail?: string;
};

export type RuntimeFactsPresentation = {
  readonly id: string;
  readonly title?: string;
  readonly facts: readonly RuntimeFactPresentation[];
};

export type SelectedOperationPresentation = {
  readonly id: string;
  readonly title: string;
  readonly summary: string;
  readonly formulaIds: readonly string[];
  readonly facts: readonly RuntimeFactPresentation[];
};
