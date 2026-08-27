import type { ComponentType } from "react";
import type { ScoreMatrixSceneProps } from "./score-matrix/ScoreMatrixScene";
import type { VisualizationDefinition } from "./visualizationTypes";

export const SCORE_MATRIX_VISUALIZATION_ID =
  "decoder.visualization.attention.score-matrix-3d";

const scoreMatrixDefinition: VisualizationDefinition = {
  id: SCORE_MATRIX_VISUALIZATION_ID,
  kind: "score-matrix-3d",
  title: "Attention Score Matrix",
  description: "Query와 Key의 실제 내적 점수를 3D 높이로 비교합니다.",
};

const definitions = new Map<string, VisualizationDefinition>([
  [scoreMatrixDefinition.id, scoreMatrixDefinition],
]);

export type ScoreMatrixRendererModule = Readonly<{
  default: ComponentType<ScoreMatrixSceneProps>;
}>;

export type ScoreMatrixRendererLoader =
  () => Promise<ScoreMatrixRendererModule>;

const loadScoreMatrixRenderer: ScoreMatrixRendererLoader = () =>
  import("./score-matrix/ScoreMatrixScene");

export function resolveVisualizationDefinition(
  id: string,
): VisualizationDefinition | null {
  return definitions.get(id) ?? null;
}

export function resolveVisualizationRenderer(
  definition: VisualizationDefinition,
): ScoreMatrixRendererLoader | null {
  return definition.kind === "score-matrix-3d" ? loadScoreMatrixRenderer : null;
}

export const visualizationIds = new Set(definitions.keys());
