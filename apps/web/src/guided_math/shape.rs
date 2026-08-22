//! Checked captured-head shapes, matrix cells, and mask selectors.

use nanogpt_schema::{AttentionHeadTrace, TensorSnapshot};

use crate::{
    guided_math_types::GuidedMathError,
    trace_lookup::{TraceLookupError, bhtd_shape},
};

pub(super) fn captured_shape(
    tensor: &TensorSnapshot,
    context: &'static str,
) -> Result<[usize; 4], GuidedMathError> {
    let shape = bhtd_shape(tensor)?;
    require_equal(context, 1, shape[0])?;
    require_equal(context, 1, shape[1])?;
    Ok(shape)
}

pub(super) fn validate_score_matrix(
    tensor: &TensorSnapshot,
    expected: [usize; 2],
) -> Result<(), GuidedMathError> {
    let [_, _, actual_rows, actual_columns] = captured_shape(tensor, "score matrix axes")?;
    require_equal("score matrix query count", expected[0], actual_rows)?;
    require_equal("score matrix key count", expected[1], actual_columns)
}

pub(super) fn validate_mask(
    trace: &AttentionHeadTrace,
    rows: usize,
    columns: usize,
) -> Result<(), GuidedMathError> {
    require_equal("mask query count", rows, trace.mask.rows)?;
    require_equal("mask key count", columns, trace.mask.cols)
}

pub(super) const fn require_equal(
    context: &'static str,
    expected: usize,
    actual: usize,
) -> Result<(), GuidedMathError> {
    if expected == actual {
        Ok(())
    } else {
        Err(mismatch(context, expected, actual))
    }
}

pub(super) const fn require_nonzero(
    context: &'static str,
    actual: usize,
) -> Result<(), GuidedMathError> {
    if actual == 0 {
        Err(mismatch(context, 1, actual))
    } else {
        Ok(())
    }
}

pub(super) const fn mismatch(
    context: &'static str,
    expected: usize,
    actual: usize,
) -> GuidedMathError {
    GuidedMathError::DimensionMismatch {
        context,
        expected,
        actual,
    }
}

pub(super) fn matrix_cell(
    tensor: &TensorSnapshot,
    query: usize,
    key: usize,
) -> Result<f32, TraceLookupError> {
    let [_, _, rows, columns] = bhtd_shape(tensor)?;
    if query >= rows || key >= columns {
        return Err(out_of_bounds(tensor));
    }
    let index = query
        .checked_mul(columns)
        .and_then(|value| value.checked_add(key))
        .ok_or_else(|| out_of_bounds(tensor))?;
    tensor
        .values
        .get(index)
        .map(|value| value.get())
        .ok_or_else(|| out_of_bounds(tensor))
}

pub(super) fn mask_cell(
    trace: &AttentionHeadTrace,
    query: usize,
    key: usize,
) -> Result<bool, GuidedMathError> {
    let index = query
        .checked_mul(trace.mask.cols)
        .and_then(|value| value.checked_add(key))
        .ok_or(GuidedMathError::MaskSelection {
            rows: trace.mask.rows,
            cols: trace.mask.cols,
        })?;
    trace
        .mask
        .allowed
        .get(index)
        .copied()
        .ok_or(GuidedMathError::MaskSelection {
            rows: trace.mask.rows,
            cols: trace.mask.cols,
        })
}

fn out_of_bounds(tensor: &TensorSnapshot) -> TraceLookupError {
    TraceLookupError::SelectionOutOfBounds(tensor.id.clone(), tensor.shape.clone())
}
