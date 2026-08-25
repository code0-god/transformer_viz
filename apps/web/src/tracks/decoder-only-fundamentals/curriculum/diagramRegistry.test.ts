import { describe, expect, test } from "vitest";
import {
  curriculumDiagramIds,
  curriculumVisualizationIds,
} from "./diagramRegistry";
import { GUIDE_PAGE_IDS } from "./ids";

describe("curriculum Diagram registry", () => {
  test("registers one mandatory independent Diagram per new Guide page", () => {
    // Given: the Phase 2 page and Diagram registries.
    // When: their cardinalities are inspected.
    // Then: all eleven pages have independent Diagram contracts.
    expect(GUIDE_PAGE_IDS).toHaveLength(11);
    expect(curriculumDiagramIds.size).toBe(11);
  });

  test("registers no future Visualization", () => {
    expect(curriculumVisualizationIds.size).toBe(0);
  });
});
