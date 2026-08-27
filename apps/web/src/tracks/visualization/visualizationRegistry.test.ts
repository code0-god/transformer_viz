import { describe, expect, test } from "vitest";

import {
  resolveVisualizationDefinition,
  resolveVisualizationRenderer,
  SCORE_MATRIX_VISUALIZATION_ID,
} from "./visualizationRegistry";

describe("visualization renderer registry", () => {
  test("resolves the single shipped Score Matrix capability", () => {
    const definition = resolveVisualizationDefinition(
      SCORE_MATRIX_VISUALIZATION_ID,
    );

    expect(definition).toEqual({
      id: SCORE_MATRIX_VISUALIZATION_ID,
      kind: "score-matrix-3d",
      title: "Attention Score Matrix",
      description: "Query와 Key의 실제 내적 점수를 3D 높이로 비교합니다.",
    });
    if (definition === null) throw new Error("Score Matrix definition missing");
    expect(resolveVisualizationRenderer(definition)).not.toBeNull();
  });

  test("rejects unknown capability IDs without a placeholder renderer", () => {
    expect(resolveVisualizationDefinition("unknown.visualization")).toBeNull();
  });
});
