import type { ScoreMatrixModel } from "../scoreMatrixModel";
import {
  buildScoreMatrixGeometry,
  scoreMatrixCellKey,
} from "./scoreMatrixGeometry";

const model: ScoreMatrixModel = {
  layer: 1,
  head: 2,
  size: 2,
  queryTokenLabels: ["q0", "q1"],
  keyTokenLabels: ["k0", "k1"],
  cells: [
    {
      queryIndex: 0,
      keyIndex: 0,
      queryTokenLabel: "q0",
      keyTokenLabel: "k0",
      value: -4,
      allowed: true,
      blockedByLaterCausalMask: false,
    },
    {
      queryIndex: 0,
      keyIndex: 1,
      queryTokenLabel: "q0",
      keyTokenLabel: "k1",
      value: -0,
      allowed: false,
      blockedByLaterCausalMask: true,
    },
    {
      queryIndex: 1,
      keyIndex: 0,
      queryTokenLabel: "q1",
      keyTokenLabel: "k0",
      value: 2,
      allowed: true,
      blockedByLaterCausalMask: false,
    },
    {
      queryIndex: 1,
      keyIndex: 1,
      queryTokenLabel: "q1",
      keyTokenLabel: "k1",
      value: 0,
      allowed: true,
      blockedByLaterCausalMask: false,
    },
  ],
};

describe("Score Matrix cell geometry", () => {
  test("maps every row-major source cell to one exact render cell", () => {
    // Given: a two-by-two score matrix with distinct coordinates and values.
    // When: render geometry is built.
    const geometry = buildScoreMatrixGeometry(model, null);

    // Then: all source cells retain their key, index, coordinates, and value.
    expect(geometry.cells).toHaveLength(4);
    expect(
      geometry.cells.map(
        ({ key, instanceIndex, queryIndex, keyIndex, value }) => ({
          key,
          instanceIndex,
          queryIndex,
          keyIndex,
          value,
        }),
      ),
    ).toEqual([
      { key: "0:0", instanceIndex: 0, queryIndex: 0, keyIndex: 0, value: -4 },
      { key: "0:1", instanceIndex: 1, queryIndex: 0, keyIndex: 1, value: -0 },
      { key: "1:0", instanceIndex: 2, queryIndex: 1, keyIndex: 0, value: 2 },
      { key: "1:1", instanceIndex: 3, queryIndex: 1, keyIndex: 1, value: 0 },
    ]);
  });

  test("uses symmetric max-absolute signed heights and visible legend values", () => {
    // Given: scores spanning negative four through positive two, including signed zero.
    // When: render geometry is normalized.
    const geometry = buildScoreMatrixGeometry(model, null);

    // Then: the shared domain is symmetric and bars preserve side of the zero plane.
    expect(geometry.maxAbsoluteValue).toBe(4);
    expect(geometry.minimumValue).toBe(-4);
    expect(geometry.maximumValue).toBe(2);
    expect(geometry.legend.map(({ value }) => value)).toEqual([-4, 0, 2]);
    expect(geometry.cells[0]?.signedHeight).toBe(-1);
    expect(geometry.cells[0]?.centerY).toBeLessThan(0);
    expect(geometry.cells[2]?.signedHeight).toBe(0.5);
    expect(geometry.cells[2]?.centerY).toBeGreaterThan(0);
    expect(Object.is(geometry.cells[1]?.signedHeight, -0)).toBe(true);
    expect(geometry.cells[1]?.centerY).toBe(0);
  });

  test("encodes score sign by semantic color and selection by transform", () => {
    // Given: negative, neutral, and positive cells with one selected key.
    // When: geometry is built for that selection.
    const geometry = buildScoreMatrixGeometry(model, scoreMatrixCellKey(1, 0));

    // Then: sign has three semantic colors and selection also changes scale and lift.
    expect(new Set(geometry.cells.map(({ color }) => color)).size).toBe(3);
    expect(geometry.cells[0]?.semanticTone).toBe("negative");
    expect(geometry.cells[1]?.semanticTone).toBe("neutral");
    expect(geometry.cells[2]?.semanticTone).toBe("positive");
    expect(geometry.legend.map(({ color }) => color)).toEqual([
      0x4b9dc2, 0x7d898c, 0xe58f3f,
    ]);
    expect(geometry.cells[2]?.scaleXZ).toBeGreaterThan(
      geometry.cells[0]?.scaleXZ ?? 1,
    );
    expect(geometry.cells[2]?.selectionLift).toBeGreaterThan(0);
  });
});
