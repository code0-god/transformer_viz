//! Exact Phase C public names and finite snapshot contracts.

use nanogpt_schema::{
    AttentionHeadTrace, BlockTrace, FiniteF32, GptConfig, LayerSummary, LogitsTrace, MaskSnapshot,
    MlpTrace, OperationId, RunSummary, SchemaError, SourceReference, TRACE_SCHEMA_VERSION,
    TensorSnapshot, TensorStats, TokenInfo, TokenTrace,
};
use serde::{Serialize, de::DeserializeOwned};
use serde_json::json;

const fn assert_serde_contract<T: Serialize + DeserializeOwned>() {}

#[test]
fn every_required_binding_type_is_a_concrete_serde_contract() {
    // Given: the complete public type list consumed by model, Worker, and UI crates.
    // When: each type is constrained as an independently serializable concrete type.
    assert_serde_contract::<GptConfig>();
    assert_serde_contract::<TokenInfo>();
    assert_serde_contract::<RunSummary>();
    assert_serde_contract::<LayerSummary>();
    assert_serde_contract::<AttentionHeadTrace>();
    assert_serde_contract::<MlpTrace>();
    assert_serde_contract::<LogitsTrace>();
    assert_serde_contract::<TensorStats>();
    assert_serde_contract::<TensorSnapshot>();
    assert_serde_contract::<MaskSnapshot>();
    assert_serde_contract::<OperationId>();
    assert_serde_contract::<SourceReference>();
    assert_serde_contract::<BlockTrace>();
    assert_serde_contract::<TokenTrace>();
    // Then: compilation proves every exact public name exists without aliases.
}

#[test]
fn gpt_config_rejects_incompatible_heads_when_validated() -> Result<(), &'static str> {
    // Given: incompatible nanoGPT dimensions.
    let config = GptConfig {
        block_size: 24,
        vocab_size: 259,
        n_layer: 2,
        n_head: 3,
        n_embd: 16,
        bias: true,
    };
    // When: the config is validated.
    let Err(error) = config.validate() else {
        return Err("configuration must be rejected");
    };
    // Then: the error is typed and readable.
    assert_eq!(
        error,
        SchemaError::EmbeddingNotDivisible {
            embedding_size: 16,
            head_count: 3
        }
    );
    assert_eq!(
        error.to_string(),
        "embedding size 16 is not divisible by 3 attention heads"
    );
    Ok(())
}

#[test]
fn tensor_snapshot_mask_and_source_preserve_finite_explicit_fields()
-> Result<(), Box<dyn std::error::Error>> {
    // Given: finite tensor values, explicit causal cells, and source coordinates.
    let zero = FiniteF32::new(0.0)?;
    let one = FiniteF32::new(1.0)?;
    let tensor = TensorSnapshot::new("scores".to_owned(), vec![1, 2], vec![zero, one])?;
    let mask = MaskSnapshot::new(2, 2, vec![true, false, true, true])?;
    let source = SourceReference {
        file: "model.py".to_owned(),
        line_start: 52,
        line_end: 55,
        symbol: "CausalSelfAttention.forward".to_owned(),
    };
    // When: the three contracts serialize to JSON.
    let value = json!({"tensor":tensor,"mask":mask,"source":source});
    // Then: finite values and allowed/source fields remain directly inspectable.
    assert_eq!(value["tensor"]["values"], json!([0.0, 1.0]));
    assert_eq!(value["tensor"]["stats"]["mean"], json!(0.5));
    assert_eq!(value["mask"]["allowed"], json!([true, false, true, true]));
    assert_eq!(value["source"]["line_start"], 52);
    assert_eq!(TRACE_SCHEMA_VERSION, "1.0.0");
    Ok(())
}

#[test]
fn tensor_snapshot_rejects_non_finite_and_shape_mismatch() {
    // Given: a non-finite value and a one-cell shape with no values.
    let finite_result = FiniteF32::new(f32::INFINITY);
    let shape_result = TensorSnapshot::new("bad".to_owned(), vec![1], Vec::new());
    // When: both invalid snapshots cross constructors.
    // Then: neither invalid state can be represented.
    assert_eq!(finite_result, Err(SchemaError::NonFiniteTensorValue));
    assert_eq!(
        shape_result,
        Err(SchemaError::TensorLength {
            expected: 1,
            actual: 0
        })
    );
}
