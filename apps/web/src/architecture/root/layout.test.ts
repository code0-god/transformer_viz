import {
  BLOCK,
  BLOCK_MODULES,
  CENTER_X,
  diagramLayout,
  EMBEDDINGS,
  INPUT,
  OUTPUT_STAGES,
  RESIDUAL_ADDS,
  RESIDUAL_JUNCTIONS,
} from "./layout";

describe("Root architecture geometry", () => {
  test("preserves the approved fixed root layout", () => {
    expect(INPUT).toEqual({ x: 320, y: 40, width: 360, height: 56 });
    expect(EMBEDDINGS).toEqual([
      { x: 220, y: 177, width: 220, height: 54 },
      { x: 560, y: 177, width: 220, height: 54 },
    ]);
    expect(BLOCK).toEqual({ x: 260, y: 344, width: 480, height: 480 });
    expect(BLOCK_MODULES.map(({ y, height }) => [y, height])).toEqual([
      [392, 42],
      [458, 60],
      [614, 42],
      [680, 54],
    ]);
    expect(RESIDUAL_ADDS).toEqual([
      { x: 500, y: 560, radius: 18 },
      { x: 500, y: 776, radius: 18 },
    ]);
    expect(RESIDUAL_JUNCTIONS).toEqual([
      { x: 500, y: 368 },
      { x: 500, y: 590 },
    ]);
  });

  test("keeps one configured block and exact output rhythm", () => {
    const two = diagramLayout(2);
    const twelve = diagramLayout(12);

    expect(two).toEqual(twelve);
    expect(two).toEqual({
      finalLayerNormY: 924,
      lmHeadY: 1060,
      logitsY: 1196,
      selectionY: 1326,
      generatedY: 1465,
      appendY: 1601,
      viewHeight: 1720,
    });
    expect(OUTPUT_STAGES.map(({ x, width }) => x + width / 2)).toEqual([
      CENTER_X,
      CENTER_X,
      CENTER_X,
      CENTER_X,
      CENTER_X,
      CENTER_X,
    ]);
  });

  test("keeps every actionable 136-unit target disjoint and horizontally contained", () => {
    const targets = [INPUT, ...EMBEDDINGS, BLOCK, ...OUTPUT_STAGES].map(
      ({ x, y, width, height }) => ({
        x: x + width / 2 - Math.max(width, 136) / 2,
        y: y + height / 2 - Math.max(height, 136) / 2,
        width: Math.max(width, 136),
        height: Math.max(height, 136),
      }),
    );

    for (const [index, target] of targets.entries()) {
      expect(target.x).toBeGreaterThanOrEqual(0);
      expect(target.x + target.width).toBeLessThanOrEqual(1_000);
      for (const other of targets.slice(index + 1)) {
        const overlapWidth =
          Math.min(target.x + target.width, other.x + other.width) -
          Math.max(target.x, other.x);
        const overlapHeight =
          Math.min(target.y + target.height, other.y + other.height) -
          Math.max(target.y, other.y);
        expect(Math.max(0, overlapWidth) * Math.max(0, overlapHeight)).toBe(0);
      }
    }
  });
});
