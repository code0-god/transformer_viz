import {
  BLOCK,
  CENTER_X,
  diagramLayout,
  EMBEDDINGS,
  INPUT,
  OUTPUT_STAGES,
} from "./layout";

describe("Root architecture geometry", () => {
  test("keeps one compact vertical root composition", () => {
    expect(INPUT).toEqual({ x: 340, y: 36, width: 320, height: 60 });
    expect(EMBEDDINGS).toEqual([
      { x: 220, y: 142, width: 240, height: 58 },
      { x: 540, y: 142, width: 240, height: 58 },
    ]);
    expect(BLOCK).toEqual({ x: 250, y: 300, width: 500, height: 190 });
  });

  test("keeps one grouped block and compact output rhythm", () => {
    const two = diagramLayout(2);
    const twelve = diagramLayout(12);

    expect(two).toEqual(twelve);
    expect(two).toEqual({
      finalLayerNormY: 550,
      lmHeadY: 640,
      logitsY: 730,
      selectionY: 820,
      generatedY: 910,
      appendY: 1_000,
      viewHeight: 1_080,
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

  test("keeps every actionable 88-unit target disjoint and contained", () => {
    const targets = [INPUT, ...EMBEDDINGS, BLOCK, ...OUTPUT_STAGES].map(
      ({ x, y, width, height }) => ({
        x: x + width / 2 - Math.max(width, 88) / 2,
        y: y + height / 2 - Math.max(height, 88) / 2,
        width: Math.max(width, 88),
        height: Math.max(height, 88),
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
