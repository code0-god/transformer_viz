import { describe, expect, test } from "vitest";

import { architectureNodeCatalog } from "../../architecture/catalog";
import { decoderLearningNodeByArchitecture, decoderNodeMap } from "./nodes";

describe("decoder Diagram and Guide node mapping", () => {
  test("has a reverse entry for every non-static forward mapping", () => {
    // Given: every decoder learning-node mapping used by an interactive Diagram node.
    const interactiveMappings = Object.entries(decoderNodeMap).filter(
      ([, architectureNodeId]) =>
        architectureNodeCatalog[architectureNodeId].capability !== "static",
    );

    // When: each architecture node is resolved back to its Guide node.
    const reverseMisses = interactiveMappings.filter(
      ([learningNodeId, architectureNodeId]) =>
        decoderLearningNodeByArchitecture[architectureNodeId] !==
        learningNodeId,
    );

    // Then: bidirectional focus has no missing interactive target.
    expect(reverseMisses).toEqual([]);
  });

  test("maps the generated token in both directions", () => {
    // Given/When: the exact generated-token Diagram and Guide IDs are resolved.
    const architectureNodeId = decoderNodeMap["decoder.root.generated-token"];
    const learningNodeId = decoderLearningNodeByArchitecture["generated-token"];

    // Then: both directions identify the incumbent generated-token target.
    expect(architectureNodeId).toBe("generated-token");
    expect(learningNodeId).toBe("decoder.root.generated-token");
  });
});
