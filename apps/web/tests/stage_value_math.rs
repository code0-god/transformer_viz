//! Real educational-asset check for the complete probability-times-value reconstruction.

use nanogpt_schema::{AttentionHeadTrace, TensorSnapshot, WorkerRequest, WorkerResponse};
use transformer_viz_web::guided_math::{GuidedMathError, value_evidence};
use transformer_viz_worker::runtime::{AssetBundle, WorkerRuntime};
use transformer_viz_worker::runtime_error::RuntimeError;

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
fn selected_value_output_matches_full_real_probability_value_product()
-> Result<(), Box<dyn std::error::Error>> {
    // Given: the complete selected-head probability, value, and output tensors.
    let trace = real_head()?;

    // When: every key-by-feature contribution is reconstructed for query 6.
    let evidence = value_evidence(&trace, 6)?;

    // Then: all T x D contributions sum to the captured attention output.
    assert_eq!(
        evidence.contributions.len(),
        evidence.keys * evidence.features
    );
    assert_eq!(evidence.feature_sums.len(), evidence.features);
    assert!(
        evidence.output_error <= 1e-4,
        "output error {}",
        evidence.output_error
    );
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
fn value_rejects_probability_key_and_output_feature_mismatches()
-> Result<(), Box<dyn std::error::Error>> {
    // Given: shape-valid tensors that disagree with V along one required axis.
    let mut key_mismatch = real_head()?;
    let tokens = key_mismatch.probabilities.shape[2];
    key_mismatch.probabilities =
        reshape_prefix(&key_mismatch.probabilities, vec![1, 1, tokens, tokens - 1])?;
    let mut feature_mismatch = real_head()?;
    let tokens = feature_mismatch.output.shape[2];
    let features = feature_mismatch.output.shape[3];
    feature_mismatch.output =
        reshape_prefix(&feature_mismatch.output, vec![1, 1, tokens, features - 1])?;

    // When: full P x V reconstruction is attempted.
    let key_error = value_evidence(&key_mismatch, 1);
    let feature_error = value_evidence(&feature_mismatch, 1);

    // Then: neither key nor feature comparison can truncate through iteration.
    assert!(matches!(
        key_error,
        Err(GuidedMathError::DimensionMismatch { .. })
    ));
    assert!(matches!(
        feature_error,
        Err(GuidedMathError::DimensionMismatch { .. })
    ));
    Ok(())
}
