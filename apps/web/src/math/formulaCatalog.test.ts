import { describe, expect, test } from "vitest";

import { FORMULA_IDS, formulaCatalog } from "./formulaCatalog";

const PART1_FORMULAS = {
  "fundamentals-next-token-softmax": String.raw`P_i = \frac{\exp(z_i)}{\sum_j \exp(z_j)}`,
  "fundamentals-chain-rule-three-token": String.raw`P(w_1,w_2,w_3)=P(w_1)P(w_2\mid w_1)P(w_3\mid w_1,w_2)`,
  "fundamentals-chain-rule-sequence": String.raw`P(w_1,\ldots,w_T)=\prod_{t=1}^{T}P(w_t\mid w_{<t})`,
} as const;
const PART2_FORMULAS = {
  "fundamentals-embedding-table-shape": String.raw`W_E \in \mathbb{R}^{Vocab \times C}`,
  "fundamentals-hidden-state-shape": String.raw`X \in \mathbb{R}^{T \times C}`,
} as const;
const FUNDAMENTALS_FORMULAS = {
  ...PART1_FORMULAS,
  ...PART2_FORMULAS,
} as const;
const FUNDAMENTALS_FORMULA_IDS = Object.keys(FUNDAMENTALS_FORMULAS);

describe("fundamentals trusted Formula catalog", () => {
  test("closes exactly the five locked fundamentals Formula IDs", () => {
    // Given: the trusted static Formula catalog.
    const fundamentalsIds = FORMULA_IDS.filter((id) =>
      id.startsWith("fundamentals-"),
    );

    // When/Then: the three Phase 5 IDs and two Phase 6 IDs are the full closure.
    expect(fundamentalsIds).toEqual(FUNDAMENTALS_FORMULA_IDS);
  });

  test("keeps key and record identity in exact parity", () => {
    // Given: the Formula ID list and catalog record.
    const catalogKeys = Object.keys(formulaCatalog);

    // When/Then: every ID is unique and names its own trusted record.
    expect(new Set(FORMULA_IDS).size).toBe(FORMULA_IDS.length);
    expect(catalogKeys).toEqual([...FORMULA_IDS]);
    for (const id of FUNDAMENTALS_FORMULA_IDS) {
      expect(Object.hasOwn(formulaCatalog, id)).toBe(true);
      expect(Reflect.get(formulaCatalog, id)).toMatchObject({
        id,
        tex: Reflect.get(FUNDAMENTALS_FORMULAS, id),
      });
    }
  });
});
