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
export const INPUT: RectBounds = { x: 340, y: 36, width: 320, height: 60 };
export const EMBEDDINGS: readonly [RectBounds, RectBounds] = [
  { x: 220, y: 142, width: 240, height: 58 },
  { x: 540, y: 142, width: 240, height: 58 },
];
export const EMBEDDING_BRANCH_Y = 116;
export const EMBEDDING_ADD: CircleBounds = { x: CENTER_X, y: 236, radius: 14 };
export const HIDDEN: RectBounds = { x: 370, y: 260, width: 260, height: 32 };
export const BLOCK: RectBounds = { x: 250, y: 300, width: 500, height: 190 };

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
    finalLayerNormY: 550,
    lmHeadY: 640,
    logitsY: 730,
    selectionY: 820,
    generatedY: 910,
    appendY: 1_000,
    viewHeight: 1_080,
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
  { x: 305, y: 550, width: 390, height: 54 },
  { x: 305, y: 640, width: 390, height: 54 },
  { x: 305, y: 730, width: 390, height: 54 },
  { x: 270, y: 820, width: 460, height: 58 },
  { x: 305, y: 910, width: 390, height: 54 },
  { x: 305, y: 1_000, width: 390, height: 54 },
];
