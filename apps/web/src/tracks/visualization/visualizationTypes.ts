export type VisualizationKind =
  | "score-matrix-3d"
  | "qkv-features"
  | "causal-mask"
  | "softmax"
  | "value-aggregation";

export type VisualizationDefinition = Readonly<{
  id: string;
  kind: VisualizationKind;
  title: string;
  description: string;
}>;
