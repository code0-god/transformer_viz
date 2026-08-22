//! Real educational-asset checks for attention score, scaling, mask, and softmax math.

use nanogpt_schema::{AttentionHeadTrace, TensorSnapshot, WorkerRequest, WorkerResponse};
use transformer_viz_web::guided_math::{GuidedMathError, probability_row, score_evidence};
use transformer_viz_web::runtime::{AssetBundle, WorkerRuntime};
use transformer_viz_web::runtime_error::RuntimeError;

fn assets() -> AssetBundle {
    AssetBundle {
        manifest: include_str!("../public/models/edu/manifest.json").to_owned(),
        config: include_str!("../public/models/edu/config.json").to_owned(),
        tokenizer: include_str!("../public/models/edu/tokenizer.json").to_owned(),
        weights: include_bytes!("../public/models/edu/model.safetensors").to_vec(),
    }
}

fn real_head() -> Result<AttentionHeadTrace, RuntimeError> {
    let mut runtime = WorkerRuntime::default();
    let _ready = runtime.initialize(&assets())?;
    let run = runtime.handle(WorkerRequest::Run {
        request_id: 1,
        text: "the cat sat on the".to_owned(),
    })?;
    let WorkerResponse::RunComplete { summary, .. } = run else {
        return Err(RuntimeError::InvalidSelector);
    };
    let response = runtime.handle(WorkerRequest::InspectAttentionHead {
        request_id: 2,
        run_id: summary.run_id,
        layer: 0,
        head: 1,
    })?;
    let WorkerResponse::AttentionHeadTrace { trace, .. } = response else {
        return Err(RuntimeError::InvalidSelector);
    };
    Ok(*trace)
}

#[test]
fn selected_score_matches_real_dot_scale_mask_and_probability_row()
-> Result<(), Box<dyn std::error::Error>> {
    // Given: a selected H1 trace whose captured head axis has length one.
    let trace = real_head()?;
    let query = 6;
    let key = 4;

    // When: pure helpers reconstruct the selected score and probability row.
    let score = score_evidence(&trace, query, key)?;
    let row = probability_row(&trace, query)?;

    // Then: reconstructed arithmetic agrees with the captured educational trace.
    assert_eq!(score.contributions.len(), 16);
    assert!(score.raw_error <= 1e-4, "raw error {}", score.raw_error);
    assert!(
        score.scaled_error <= 1e-4,
        "scaled error {}",
        score.scaled_error
    );
    assert!(score.allowed);
    assert!((row.sum - 1.0).abs() <= 1e-5, "row sum {}", row.sum);
    assert!(row.future.iter().all(|value| value.abs() <= f32::EPSILON));
    Ok(())
}

fn reshape_prefix(
    tensor: &TensorSnapshot,
    shape: Vec<usize>,
) -> Result<TensorSnapshot, Box<dyn std::error::Error>> {
    let count = shape.iter().product();
    Ok(TensorSnapshot::new(
        tensor.id.clone(),
        shape,
        tensor.values.iter().copied().take(count).collect(),
    )?)
}

#[test]
fn score_rejects_mismatched_qk_features_and_non_singleton_captured_axes()
-> Result<(), Box<dyn std::error::Error>> {
    // Given: independently shape-valid tensors that violate the captured-head contract.
    let mut feature_mismatch = real_head()?;
    let [_, _, tokens, features] = feature_mismatch.key.shape.as_slice() else {
        return Err("unexpected fixture shape".into());
    };
    feature_mismatch.key =
        reshape_prefix(&feature_mismatch.key, vec![1, 1, *tokens, features / 2])?;
    let mut head_mismatch = real_head()?;
    let [_, _, tokens, features] = head_mismatch.query.shape.as_slice() else {
        return Err("unexpected fixture shape".into());
    };
    head_mismatch.query.shape = vec![1, 2, tokens / 2, *features];

    // When: score reconstruction is attempted.
    let feature_error = score_evidence(&feature_mismatch, 1, 1);
    let head_error = score_evidence(&head_mismatch, 1, 1);

    // Then: neither mismatch can silently select or truncate values.
    assert!(matches!(
        feature_error,
        Err(GuidedMathError::DimensionMismatch { .. })
    ));
    assert!(matches!(
        head_error,
        Err(GuidedMathError::DimensionMismatch { .. })
    ));
    Ok(())
}

#[test]
fn probability_rejects_mask_matrix_shape_mismatch() -> Result<(), Box<dyn std::error::Error>> {
    // Given: a probability matrix whose explicit mask has a different column count.
    let mut trace = real_head()?;
    trace.mask.cols = trace.mask.cols.saturating_sub(1);

    // When: the selected probability row is inspected.
    let result = probability_row(&trace, 1);

    // Then: the mismatch is surfaced as a typed error.
    assert!(matches!(
        result,
        Err(GuidedMathError::DimensionMismatch { .. })
    ));
    Ok(())
}
