export interface RectBounds {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export interface CircleBounds {
  readonly x: number;
  readonly y: number;
  readonly radius: number;
}

export const VIEW_WIDTH = 1_000;
export const CENTER_X = VIEW_WIDTH / 2;
export const STACK_GAP = 24;
export const INPUT: RectBounds = { x: 320, y: 24, width: 360, height: 56 };
export const EMBEDDINGS: readonly [RectBounds, RectBounds] = [
  { x: 220, y: 120, width: 220, height: 54 },
  { x: 560, y: 120, width: 220, height: 54 },
];
export const EMBEDDING_BRANCH_Y = 96;
export const EMBEDDING_ADD: CircleBounds = { x: CENTER_X, y: 224, radius: 16 };
export const HIDDEN: RectBounds = { x: 370, y: 264, width: 260, height: 36 };
export const BLOCK: RectBounds = { x: 260, y: 344, width: 480, height: 480 };
export const BLOCK_MODULES: readonly [
  RectBounds,
  RectBounds,
  RectBounds,
  RectBounds,
] = [
  { x: 340, y: 392, width: 320, height: 42 },
  { x: 340, y: 458, width: 320, height: 60 },
  { x: 340, y: 614, width: 320, height: 42 },
  { x: 340, y: 680, width: 320, height: 54 },
];
export const RESIDUAL_ADDS: readonly [CircleBounds, CircleBounds] = [
  { x: CENTER_X, y: 560, radius: 18 },
  { x: CENTER_X, y: 776, radius: 18 },
];
export const RESIDUAL_JUNCTIONS: readonly [
  Readonly<{ x: number; y: number }>,
  Readonly<{ x: number; y: number }>,
] = [
  { x: CENTER_X, y: 368 },
  { x: CENTER_X, y: 590 },
];
export const RESIDUAL_RAIL_X = 700;

export interface DiagramLayout {
  readonly finalLayerNormY: number;
  readonly lmHeadY: number;
  readonly logitsY: number;
  readonly selectionY: number;
  readonly generatedY: number;
  readonly appendY: number;
  readonly viewHeight: number;
}

export function diagramLayout(_layerCount: number): DiagramLayout {
  return {
    finalLayerNormY: 860,
    lmHeadY: 932,
    logitsY: 1004,
    selectionY: 1076,
    generatedY: 1160,
    appendY: 1238,
    viewHeight: 1332,
  };
}

export const OUTPUT_STAGES: readonly [
  RectBounds,
  RectBounds,
  RectBounds,
  RectBounds,
  RectBounds,
  RectBounds,
] = [
  { x: 305, y: 860, width: 390, height: 48 },
  { x: 305, y: 932, width: 390, height: 48 },
  { x: 305, y: 1004, width: 390, height: 48 },
  { x: 270, y: 1076, width: 460, height: 60 },
  { x: 305, y: 1160, width: 390, height: 54 },
  { x: 305, y: 1238, width: 390, height: 54 },
];
