import { describe, expect, test } from "vitest";

import { FORMULA_IDS, formulaCatalog } from "./formulaCatalog";

const PART1_FORMULAS = {
  "fundamentals-next-token-softmax": String.raw`P(w_{t+1}=i \mid w_{1:t}) = \frac{\exp(z_i)}{\sum_j \exp(z_j)}`,
  "fundamentals-chain-rule-three-token": String.raw`P(w_1,w_2,w_3)=P(w_1)P(w_2\mid w_1)P(w_3\mid w_1,w_2)`,
  "fundamentals-chain-rule-sequence": String.raw`P(w_1,\ldots,w_n)=\prod_{t=1}^{n}P(w_t\mid w_1,\ldots,w_{t-1})`,
} as const;
const PART1_FORMULA_IDS = Object.keys(PART1_FORMULAS);

describe("Part 1 trusted Formula catalog", () => {
  test("adds exactly the three locked Part 1 Formula IDs", () => {
    // Given: the trusted static Formula catalog.
    const fundamentalsIds = FORMULA_IDS.filter((id) =>
      id.startsWith("fundamentals-"),
    );

    // When/Then: only the three Phase 5 IDs are present.
    expect(fundamentalsIds).toEqual(PART1_FORMULA_IDS);
  });

  test("keeps key and record identity in exact parity", () => {
    // Given: the Formula ID list and catalog record.
    const catalogKeys = Object.keys(formulaCatalog);

    // When/Then: every ID is unique and names its own trusted record.
    expect(new Set(FORMULA_IDS).size).toBe(FORMULA_IDS.length);
    expect(catalogKeys).toEqual([...FORMULA_IDS]);
    for (const id of PART1_FORMULA_IDS) {
      expect(Object.hasOwn(formulaCatalog, id)).toBe(true);
      expect(Reflect.get(formulaCatalog, id)).toMatchObject({
        id,
        tex: Reflect.get(PART1_FORMULAS, id),
      });
    }
  });
});
