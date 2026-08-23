import { ARCHITECTURE_NODE_IDS, architectureNodeCatalog } from "./catalog";

describe("architecture node catalog", () => {
  test("has 30 stable IDs with canonical capabilities", () => {
    expect(ARCHITECTURE_NODE_IDS).toHaveLength(30);
    expect(new Set(ARCHITECTURE_NODE_IDS).size).toBe(30);
    expect(architectureNodeCatalog["transformer-block"].capability).toBe(
      "drill-down",
    );
    expect(architectureNodeCatalog["self-attention"].capability).toBe(
      "drill-down",
    );
    expect(architectureNodeCatalog.root.capability).toBe("static");
    expect(architectureNodeCatalog["attention-softmax"].capability).toBe(
      "selectable",
    );
  });
});
