import type { AttentionHeadTrace, TokenInfo } from "../../generated/schema";
import { buildScoreMatrixModel } from "./scoreMatrixModel";

const stats = { min: 0, max: 0, mean: 0, std: 0, l2_norm: 0 };
const source = {
  file: "model.py",
  symbol: "attention",
  start_line: 1,
  end_line: 1,
};

function tokens(...labels: readonly string[]): readonly TokenInfo[] {
  return labels.map((display, id) => ({
    id,
    display,
    piece: [...new TextEncoder().encode(display)],
    byte_start: id,
    byte_end: id + 1,
    kind: "byte",
  }));
}

function trace(
  overrides: {
    readonly layer?: number;
    readonly head?: number;
    readonly shape?: readonly number[];
    readonly values?: readonly number[];
    readonly maskRows?: number;
    readonly maskCols?: number;
    readonly allowed?: readonly boolean[];
  } = {},
): AttentionHeadTrace {
  const tensor = {
    id: "unused",
    label: "unused",
    shape: [1],
    values: [0],
    stats,
  };
  return {
    layer: overrides.layer ?? 2,
    head: overrides.head ?? 1,
    query: tensor,
    key: tensor,
    value: tensor,
    raw_scores: {
      id: "attention_raw_scores",
      label: "attention_raw_scores",
      shape: [...(overrides.shape ?? [1, 1, 2, 2])],
      values: [...(overrides.values ?? [-0, 0.125, -3.5, 9.25])],
      stats,
    },
    scaled_scores: tensor,
    mask: {
      rows: overrides.maskRows ?? 2,
      cols: overrides.maskCols ?? 2,
      allowed: [...(overrides.allowed ?? [true, false, true, true])],
    },
    probabilities: tensor,
    output: tensor,
    source,
  };
}

function build(overrides: Parameters<typeof trace>[0] = {}) {
  return buildScoreMatrixModel({
    trace: trace(overrides),
    replayTokens: tokens("고양", "이"),
    layer: 2,
    head: 1,
  });
}

describe("Score Matrix model", () => {
  test("extracts a nonzero selected head from the producer-narrowed tensor", () => {
    // Given: head one metadata, its narrowed tensor, and a causal mask.
    const input = {
      trace: trace(),
      replayTokens: tokens("고양", "이"),
      layer: 2,
      head: 1,
    };

    // When: the Score Matrix view model is built for head one.
    const result = buildScoreMatrixModel(input);

    // Then: head one's exact values and labels appear in query-major order.
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value).toEqual({
      layer: 2,
      head: 1,
      size: 2,
      queryTokenLabels: ["고양", "이"],
      keyTokenLabels: ["고양", "이"],
      cells: [
        {
          queryIndex: 0,
          keyIndex: 0,
          queryTokenLabel: "고양",
          keyTokenLabel: "고양",
          value: -0,
          allowed: true,
          blockedByLaterCausalMask: false,
        },
        {
          queryIndex: 0,
          keyIndex: 1,
          queryTokenLabel: "고양",
          keyTokenLabel: "이",
          value: 0.125,
          allowed: false,
          blockedByLaterCausalMask: true,
        },
        {
          queryIndex: 1,
          keyIndex: 0,
          queryTokenLabel: "이",
          keyTokenLabel: "고양",
          value: -3.5,
          allowed: true,
          blockedByLaterCausalMask: false,
        },
        {
          queryIndex: 1,
          keyIndex: 1,
          queryTokenLabel: "이",
          keyTokenLabel: "이",
          value: 9.25,
          allowed: true,
          blockedByLaterCausalMask: false,
        },
      ],
    });
    expect(Object.is(result.value.cells[0]?.value, -0)).toBe(true);
  });

  test.each([
    ["selection", { layer: 3 }, "selection"],
    [
      "shape rank",
      { shape: [1, 1, 4], values: Array.from({ length: 4 }, () => 0) },
      "shape",
    ],
    [
      "non-square scores",
      { shape: [1, 1, 2, 3], values: Array.from({ length: 6 }, () => 0) },
      "shape",
    ],
    ["value count", { values: [1] }, "values"],
    ["non-finite value", { values: [1, Number.NaN, 3, 4] }, "values"],
    ["mask dimensions", { maskRows: 1 }, "mask"],
    ["mask value count", { allowed: [true] }, "mask"],
  ] as const)("rejects invalid %s", (_name, overrides, expectedKind) => {
    // Given: malformed trace data at one model boundary.
    // When: the Score Matrix model is built.
    const result = build(overrides);

    // Then: the malformed input is represented as a typed issue.
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe(expectedKind);
  });

  test("rejects a trace that retains more than the selected head", () => {
    // Given: a producer trace that incorrectly retained two heads.
    const input = {
      trace: trace({
        shape: [1, 2, 2, 2],
        values: Array.from({ length: 8 }, () => 0),
      }),
      replayTokens: tokens("고양", "이"),
      layer: 2,
      head: 1,
    };

    // When: the Score Matrix model is built.
    const result = buildScoreMatrixModel(input);

    // Then: the producer-shape mismatch is rejected.
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("shape");
  });

  test("rejects a score matrix whose token count differs from replay", () => {
    // Given: a 2x2 score matrix but only one replay token.
    const input = {
      trace: trace(),
      replayTokens: tokens("고양"),
      layer: 2,
      head: 1,
    };

    // When: the Score Matrix model is built.
    const result = buildScoreMatrixModel(input);

    // Then: replay provenance cannot be paired with the wrong matrix size.
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("replay");
  });
});
