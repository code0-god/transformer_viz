import type { AttentionHeadTrace, TokenInfo } from "../../generated/schema";

export type ScoreMatrixCell = {
  readonly queryIndex: number;
  readonly keyIndex: number;
  readonly queryTokenLabel: string;
  readonly keyTokenLabel: string;
  readonly value: number;
  readonly allowed: boolean;
  readonly blockedByLaterCausalMask: boolean;
};

export type ScoreMatrixModel = {
  readonly layer: number;
  readonly head: number;
  readonly size: number;
  readonly queryTokenLabels: readonly string[];
  readonly keyTokenLabels: readonly string[];
  readonly cells: readonly ScoreMatrixCell[];
};

export type ScoreMatrixInput = {
  readonly trace: Readonly<AttentionHeadTrace>;
  readonly replayTokens: readonly Readonly<TokenInfo>[];
  readonly layer: number;
  readonly head: number;
};

export type ScoreMatrixIssue = {
  readonly kind: "selection" | "shape" | "values" | "replay" | "mask";
  readonly message: string;
};

export type ScoreMatrixBuildResult =
  | { readonly ok: true; readonly value: ScoreMatrixModel }
  | { readonly ok: false; readonly error: ScoreMatrixIssue };

function failure(
  kind: ScoreMatrixIssue["kind"],
  message: string,
): ScoreMatrixBuildResult {
  return { ok: false, error: { kind, message } };
}

function isIndex(value: number): boolean {
  return Number.isSafeInteger(value) && value >= 0;
}

export function buildScoreMatrixModel(
  input: ScoreMatrixInput,
): ScoreMatrixBuildResult {
  if (
    !isIndex(input.layer) ||
    !isIndex(input.head) ||
    input.trace.layer !== input.layer ||
    input.trace.head !== input.head
  ) {
    return failure(
      "selection",
      "Trace layer and head must match the selected inspection.",
    );
  }

  const shape = input.trace.raw_scores.shape;
  const batchCount = shape[0];
  const headCount = shape[1];
  const queryCount = shape[2];
  const keyCount = shape[3];
  if (
    shape.length !== 4 ||
    batchCount !== 1 ||
    headCount === undefined ||
    queryCount === undefined ||
    keyCount === undefined ||
    !Number.isSafeInteger(queryCount) ||
    !Number.isSafeInteger(keyCount) ||
    headCount !== 1 ||
    queryCount <= 0 ||
    queryCount !== keyCount
  ) {
    return failure(
      "shape",
      "Raw scores must contain the selected head as shape [1, 1, T, T].",
    );
  }

  const values = input.trace.raw_scores.values;
  const matrixSize = queryCount * keyCount;
  if (
    !Number.isSafeInteger(matrixSize) ||
    values.length !== matrixSize ||
    !values.every(Number.isFinite)
  ) {
    return failure(
      "values",
      "Raw score values must be finite and match the tensor shape.",
    );
  }
  if (input.replayTokens.length !== queryCount) {
    return failure(
      "replay",
      "Replay token count must match the score matrix dimensions.",
    );
  }

  const mask = input.trace.mask;
  if (
    mask.rows !== queryCount ||
    mask.cols !== keyCount ||
    mask.allowed.length !== matrixSize
  ) {
    return failure(
      "mask",
      "Mask rows, columns, and allowed cells must match the score matrix.",
    );
  }

  const tokenLabels = input.replayTokens.map((token) => token.display);
  const cells: ScoreMatrixCell[] = [];
  for (let queryIndex = 0; queryIndex < queryCount; queryIndex += 1) {
    for (let keyIndex = 0; keyIndex < keyCount; keyIndex += 1) {
      const matrixIndex = queryIndex * keyCount + keyIndex;
      const value = values[matrixIndex];
      const allowed = mask.allowed[matrixIndex];
      const queryTokenLabel = tokenLabels[queryIndex];
      const keyTokenLabel = tokenLabels[keyIndex];
      if (
        value === undefined ||
        allowed === undefined ||
        queryTokenLabel === undefined ||
        keyTokenLabel === undefined
      ) {
        return failure("values", "Score matrix indexing was inconsistent.");
      }
      cells.push({
        queryIndex,
        keyIndex,
        queryTokenLabel,
        keyTokenLabel,
        value,
        allowed,
        blockedByLaterCausalMask: !allowed && keyIndex > queryIndex,
      });
    }
  }

  return {
    ok: true,
    value: {
      layer: input.layer,
      head: input.head,
      size: queryCount,
      queryTokenLabels: tokenLabels,
      keyTokenLabels: tokenLabels,
      cells,
    },
  };
}
