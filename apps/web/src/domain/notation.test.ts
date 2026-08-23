import { ARCHITECTURE_NODE_IDS } from "../architecture/catalog";
import { notationCatalog, repeatedBlockLabel } from "./notation";
import { currentAttentionShapes } from "./shapes";

describe("canonical notation", () => {
  test("covers all nodes and preserves Rust visible notation", () => {
    expect(Object.keys(notationCatalog)).toHaveLength(30);
    expect(
      ARCHITECTURE_NODE_IDS.every((id) => notationCatalog[id].id === id),
    ).toBe(true);
    expect(notationCatalog["attention-scores"].plainText).toBe(
      "S_h = Q_h @ K_hᵀ",
    );
    expect(notationCatalog["attention-value-aggregation"].plainText).toBe(
      "Y_h = A_h @ V_h",
    );
    expect(notationCatalog["residual-1"].plainText).toContain("+");
    expect(repeatedBlockLabel(12)).toBe("Transformer Block × 12");
  });

  test("reserves multiplication and at-sign notation for their exact roles", () => {
    const entries = Object.values(notationCatalog);
    expect(entries.every((entry) => !entry.plainText.includes("×"))).toBe(true);
    expect(
      entries
        .filter((entry) => entry.plainText.includes("@"))
        .map((entry) => entry.id),
    ).toEqual(["attention-scores", "attention-value-aggregation"]);
    expect(entries.every((entry) => !entry.tex.includes("@"))).toBe(true);
  });

  test("keeps symbolic and current shapes separate", () => {
    const configured = currentAttentionShapes({ modelWidth: 64, headCount: 4 });
    const traced = currentAttentionShapes({ modelWidth: 64, headCount: 4 }, 18);

    expect(notationCatalog["attention-scores"].symbolicInput).toBe(
      "[T, D] @ [D, T]",
    );
    expect(configured?.sequenceLength).toBeNull();
    expect(configured?.headDimension).toBe(16);
    expect(configured?.scoreMatMul).toBeNull();
    expect(traced?.scoreMatMul).toBe("[18, 16] @ [16, 18] → [18, 18]");
  });
});
