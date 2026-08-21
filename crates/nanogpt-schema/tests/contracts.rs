//! Phase C serialized schema contracts.

use nanogpt_schema::{
    AttentionMask, FiniteF32, ModelConfig, SchemaError, TRACE_SCHEMA_VERSION, TraceMode,
    WorkerRequest,
};
use serde_json::json;

#[test]
fn worker_request_round_trips_when_message_is_versioned() -> Result<(), Box<dyn std::error::Error>>
{
    // Given: a versioned trace request.
    let value = json!({"schema_version":"1.0.0","type":"run","request_id":17,"prompt":"the cat",
        "trace_mode":{"type":"attention","layer":1,"head":2}});
    // When: serde decodes and re-encodes it.
    let encoded = serde_json::to_value(serde_json::from_value::<WorkerRequest>(value.clone())?)?;
    // Then: the wire contract and version are stable.
    assert_eq!(TRACE_SCHEMA_VERSION, "1.0.0");
    assert_eq!(encoded, value);
    Ok(())
}

#[test]
fn model_config_rejects_incompatible_heads_when_validated() -> Result<(), &'static str> {
    // Given: incompatible embedding and head dimensions.
    let config = ModelConfig {
        block_size: 24,
        vocab_size: 259,
        layer_count: 2,
        head_count: 3,
        embedding_size: 16,
        has_bias: true,
    };
    // When: it is validated.
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
fn tensor_values_reject_non_finite_json_when_deserialized() {
    // Given: valid JSON which overflows f32.
    let value = json!(1e100);
    // When: it crosses the finite-value boundary.
    let result = serde_json::from_value::<FiniteF32>(value);
    // Then: it never enters a trace.
    assert!(result.is_err());
}

#[test]
fn attention_mask_exposes_each_allowed_position_when_constructed() -> Result<(), SchemaError> {
    // Given: a causal two-token mask.
    let allowed = vec![true, false, true, true];
    // When: its explicit representation is constructed.
    let mask = AttentionMask::new(2, 2, allowed.clone())?;
    // Then: each cell remains inspectable.
    assert_eq!(mask.allowed, allowed);
    Ok(())
}

#[test]
fn trace_mode_serializes_selector_when_attention_is_requested() -> Result<(), serde_json::Error> {
    // Given: one selected attention head.
    let mode = TraceMode::Attention { layer: 1, head: 2 };
    // When: it is serialized.
    let value = serde_json::to_value(mode)?;
    // Then: the selector is explicitly tagged.
    assert_eq!(value, json!({"type":"attention","layer":1,"head":2}));
    Ok(())
}
