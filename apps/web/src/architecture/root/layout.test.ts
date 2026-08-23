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
    expect(INPUT).toEqual({ x: 320, y: 24, width: 360, height: 56 });
    expect(EMBEDDINGS).toEqual([
      { x: 220, y: 120, width: 220, height: 54 },
      { x: 560, y: 120, width: 220, height: 54 },
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
      finalLayerNormY: 860,
      lmHeadY: 932,
      logitsY: 1004,
      selectionY: 1076,
      generatedY: 1160,
      appendY: 1238,
      viewHeight: 1332,
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
});
