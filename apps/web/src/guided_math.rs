//! Pure, checked numerical reconstruction for guided attention visualizations.

mod shape;

use nanogpt_schema::AttentionHeadTrace;

pub use crate::guided_math_types::{
    GuidedMathError, ProbabilityEvidence, ScoreEvidence, ValueEvidence,
};
use crate::{
    guided_math::shape::{
        captured_shape, mask_cell, matrix_cell, mismatch, require_equal, require_nonzero,
        validate_mask, validate_score_matrix,
    },
    trace_lookup::selected_head_token_slice,
};

/// Reconstructs the selected Q/K dot product and scaling from real trace tensors.
///
/// Captured selected-head tensors always have head axis length one, so this helper deliberately
/// indexes head zero regardless of the model-head metadata carried by the response.
///
/// # Errors
/// Returns a typed shape or selection error for malformed trace data.
pub fn score_evidence(
    trace: &AttentionHeadTrace,
    query: usize,
    key: usize,
) -> Result<ScoreEvidence, GuidedMathError> {
    let [_, _, query_tokens, query_features] = captured_shape(&trace.query, "query axes")?;
    let [_, _, key_tokens, key_features] = captured_shape(&trace.key, "key axes")?;
    require_equal("Q/K token count", query_tokens, key_tokens)?;
    require_equal("Q/K feature count", query_features, key_features)?;
    require_nonzero("Q/K feature count", query_features)?;
    validate_score_matrix(&trace.raw_scores, [query_tokens, key_tokens])?;
    validate_score_matrix(&trace.scaled_scores, [query_tokens, key_tokens])?;
    validate_mask(trace, query_tokens, key_tokens)?;
    let query_values = selected_head_token_slice(&trace.query, 0, 0, query)?;
    let key_values = selected_head_token_slice(&trace.key, 0, 0, key)?;
    let contributions = query_values
        .iter()
        .zip(key_values)
        .map(|(left, right)| left.get() * right.get())
        .collect::<Vec<_>>();
    let dot = contributions.iter().copied().sum::<f32>();
    let raw = matrix_cell(&trace.raw_scores, query, key)?;
    let scaled = matrix_cell(&trace.scaled_scores, query, key)?;
    let feature_count = query_values.len();
    let feature_count_f32 = u16::try_from(feature_count)
        .map(f32::from)
        .map_err(|_| mismatch("Q/K feature count fits f32", u16::MAX.into(), feature_count))?;
    let expected_scaled = dot / feature_count_f32.sqrt();
    Ok(ScoreEvidence {
        contributions,
        dot,
        raw,
        raw_error: (dot - raw).abs(),
        scaled,
        scaled_error: (expected_scaled - scaled).abs(),
        allowed: mask_cell(trace, query, key)?,
    })
}

/// Returns a complete selected softmax row with its sum and future-key values.
///
/// # Errors
/// Returns a typed shape or selection error for malformed trace data.
pub fn probability_row(
    trace: &AttentionHeadTrace,
    query: usize,
) -> Result<ProbabilityEvidence, GuidedMathError> {
    let [_, _, rows, columns] = captured_shape(&trace.probabilities, "probability axes")?;
    validate_mask(trace, rows, columns)?;
    let values = selected_head_token_slice(&trace.probabilities, 0, 0, query)?
        .iter()
        .map(|value| value.get())
        .collect::<Vec<_>>();
    let sum = values.iter().copied().sum::<f32>();
    let future = values
        .iter()
        .copied()
        .skip(query.saturating_add(1))
        .collect();
    Ok(ProbabilityEvidence {
        values,
        sum,
        future,
    })
}

/// Reconstructs every key-by-feature value contribution for one query.
///
/// # Errors
/// Returns a typed shape or selection error for malformed trace data.
pub fn value_evidence(
    trace: &AttentionHeadTrace,
    query: usize,
) -> Result<ValueEvidence, GuidedMathError> {
    let [_, _, probability_rows, probability_keys] =
        captured_shape(&trace.probabilities, "probability axes")?;
    let [_, _, keys, features] = captured_shape(&trace.value, "value axes")?;
    let [_, _, output_rows, output_features] = captured_shape(&trace.output, "output axes")?;
    require_equal("probability/V key count", keys, probability_keys)?;
    require_equal(
        "probability/output query count",
        probability_rows,
        output_rows,
    )?;
    require_equal("V/output feature count", features, output_features)?;
    validate_mask(trace, probability_rows, probability_keys)?;
    let probabilities = selected_head_token_slice(&trace.probabilities, 0, 0, query)?;
    let captured = selected_head_token_slice(&trace.output, 0, 0, query)?
        .iter()
        .map(|value| value.get())
        .collect::<Vec<_>>();
    let mut contributions = Vec::with_capacity(keys.saturating_mul(features));
    let mut feature_sums = vec![0.0_f32; features];
    for (key, probability) in probabilities.iter().enumerate() {
        let values = selected_head_token_slice(&trace.value, 0, 0, key)?;
        for (feature, value) in values.iter().enumerate() {
            let contribution = probability.get() * value.get();
            contributions.push(contribution);
            if let Some(sum) = feature_sums.get_mut(feature) {
                *sum += contribution;
            }
        }
    }
    let output_error = feature_sums
        .iter()
        .zip(&captured)
        .map(|(computed, actual)| (computed - actual).abs())
        .fold(0.0_f32, f32::max);
    Ok(ValueEvidence {
        contributions,
        feature_sums,
        captured,
        output_error,
        keys,
        features,
    })
}
