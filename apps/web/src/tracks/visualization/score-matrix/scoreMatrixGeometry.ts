import type { ScoreMatrixModel } from "../scoreMatrixModel";

export type ScoreMatrixCellKey = string;
export type ScoreMatrixSemanticTone = "negative" | "neutral" | "positive";

export type ScoreMatrixRenderCell = Readonly<{
  key: ScoreMatrixCellKey;
  instanceIndex: number;
  queryIndex: number;
  keyIndex: number;
  value: number;
  allowed: boolean;
  blockedByLaterCausalMask: boolean;
  x: number;
  z: number;
  signedHeight: number;
  displayHeight: number;
  centerY: number;
  semanticTone: ScoreMatrixSemanticTone;
  color: number;
  scaleXZ: number;
  selectionLift: number;
}>;

export type ScoreMatrixLegendEntry = Readonly<{
  tone: ScoreMatrixSemanticTone;
  value: number;
  label: string;
  color: number;
}>;

export type ScoreMatrixGeometry = Readonly<{
  cells: readonly ScoreMatrixRenderCell[];
  maxAbsoluteValue: number;
  legend: readonly ScoreMatrixLegendEntry[];
}>;

const SCORE_COLORS = {
  negative: 0x6f4c78,
  neutral: 0x8b8374,
  positive: 0xa53d23,
} as const;

const CELL_SPACING = 1.08;
const BASE_CELL_SCALE = 0.82;
const SELECTED_CELL_SCALE = 0.94;
const MINIMUM_VISIBLE_HEIGHT = 0.045;
const SELECTED_CELL_LIFT = 0.04;

export function scoreMatrixCellKey(
  queryIndex: number,
  keyIndex: number,
): ScoreMatrixCellKey {
  return `${queryIndex}:${keyIndex}`;
}

export function formatScoreMatrixValue(value: number): string {
  return Object.is(value, -0) ? "-0" : String(value);
}

function semanticTone(value: number): ScoreMatrixSemanticTone {
  if (value < 0) return "negative";
  if (value > 0) return "positive";
  return "neutral";
}

export function buildScoreMatrixGeometry(
  model: ScoreMatrixModel,
  selectedCellKey: ScoreMatrixCellKey | null,
): ScoreMatrixGeometry {
  const maxAbsoluteValue = model.cells.reduce(
    (maximum, cell) => Math.max(maximum, Math.abs(cell.value)),
    0,
  );
  const normalizationScale = maxAbsoluteValue === 0 ? 1 : maxAbsoluteValue;
  const centerOffset = (model.size - 1) / 2;
  const cells = model.cells.map((cell, instanceIndex) => {
    const key = scoreMatrixCellKey(cell.queryIndex, cell.keyIndex);
    const signedHeight = cell.value / normalizationScale;
    const displayHeight = Math.max(
      Math.abs(signedHeight),
      MINIMUM_VISIBLE_HEIGHT,
    );
    const centerY =
      signedHeight > 0
        ? displayHeight / 2
        : signedHeight < 0
          ? -displayHeight / 2
          : 0;
    const tone = semanticTone(cell.value);
    const selected = key === selectedCellKey;
    return {
      key,
      instanceIndex,
      queryIndex: cell.queryIndex,
      keyIndex: cell.keyIndex,
      value: cell.value,
      allowed: cell.allowed,
      blockedByLaterCausalMask: cell.blockedByLaterCausalMask,
      x: (cell.keyIndex - centerOffset) * CELL_SPACING,
      z: (cell.queryIndex - centerOffset) * CELL_SPACING,
      signedHeight,
      displayHeight,
      centerY,
      semanticTone: tone,
      color: SCORE_COLORS[tone],
      scaleXZ: selected ? SELECTED_CELL_SCALE : BASE_CELL_SCALE,
      selectionLift: selected ? SELECTED_CELL_LIFT : 0,
    } satisfies ScoreMatrixRenderCell;
  });

  const legend = [
    {
      tone: "negative",
      value: -maxAbsoluteValue,
      label: formatScoreMatrixValue(-maxAbsoluteValue),
      color: SCORE_COLORS.negative,
    },
    {
      tone: "neutral",
      value: 0,
      label: "0",
      color: SCORE_COLORS.neutral,
    },
    {
      tone: "positive",
      value: maxAbsoluteValue,
      label: formatScoreMatrixValue(maxAbsoluteValue),
      color: SCORE_COLORS.positive,
    },
  ] as const;

  return { cells, maxAbsoluteValue, legend };
}
