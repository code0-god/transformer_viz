import { describe, expect, test } from "vitest";
import { allowsVisualizationUi, initialLearningPaneState } from "./paneMode";

describe("curriculum pane policy", () => {
  test("starts in explanation mode", () => {
    expect(initialLearningPaneState).toEqual({ mode: "explanation" });
  });

  test("omits Visualization UI when a Concept has no registered Visualization", () => {
    expect(allowsVisualizationUi(undefined)).toBe(false);
  });
});
