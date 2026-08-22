//! Exact selected-generation-step replay protocol shapes.

use nanogpt_schema::{
    EmbeddingTrace, FiniteF32, GenerationStepSummary, LogitCandidate, LogitsTrace, RunSummary,
    SchemaError, SchemaVersion, SourceReference, TensorSnapshot, TokenId, TokenInfo, TokenKind,
    WorkerRequest, WorkerResponse,
};
use serde_json::json;

fn snapshot(name: &str) -> Result<TensorSnapshot, SchemaError> {
    TensorSnapshot::new(name.to_owned(), vec![1], vec![FiniteF32::new(0.0)?])
}

fn source() -> SourceReference {
    SourceReference {
        file: "model.py".to_owned(),
        symbol: "forward".to_owned(),
        start_line: 1,
        end_line: 1,
    }
}

fn token() -> TokenInfo {
    TokenInfo {
        id: TokenId(3),
        display: "\\0".to_owned(),
        piece: vec![0],
        byte_start: None,
        byte_end: None,
        kind: TokenKind::Byte,
    }
}

fn candidate() -> Result<LogitCandidate, SchemaError> {
    Ok(LogitCandidate {
        token_id: TokenId(3),
        display: "\\0".to_owned(),
        logit: FiniteF32::new(2.0)?,
        probability: FiniteF32::new(0.5)?,
    })
}

fn step() -> Result<GenerationStepSummary, SchemaError> {
    Ok(GenerationStepSummary {
        index: 0,
        context_token_ids: vec![TokenId(0), TokenId(3)],
        generated_token: token(),
        selected_logit: FiniteF32::new(2.0)?,
        selected_probability: FiniteF32::new(0.5)?,
        candidates: vec![candidate()?],
        random: None,
        selected_interval: None,
        forward_ms: FiniteF32::new(1.0)?,
        sampling_ms: FiniteF32::new(0.25)?,
        total_ms: FiniteF32::new(1.25)?,
    })
}

fn summary() -> Result<RunSummary, SchemaError> {
    let logits = LogitsTrace {
        logits: snapshot("top_1_logits")?,
        top_k: vec![candidate()?],
        source: source(),
    };
    Ok(RunSummary {
        schema_version: SchemaVersion::current(),
        run_id: 12,
        tokens: vec![token()],
        layers: Vec::new(),
        duration_ms: FiniteF32::new(1.0)?,
        embeddings: EmbeddingTrace {
            token: snapshot("token_embeddings")?,
            position: snapshot("position_embeddings")?,
            sum: snapshot("embedding_sum")?,
            source: source(),
        },
        final_layer_norm: snapshot("final_layer_norm")?,
        logits,
    })
}

#[test]
fn inspect_generation_step_request_has_exact_shape() -> Result<(), serde_json::Error> {
    // Given: the exact selected-step replay boundary value.
    let value = json!({
        "type": "inspect_generation_step",
        "request_id": 4_294_967_296_u64,
        "generation_run_id": 11,
        "step_index": 0
    });
    // When: it crosses serde in both directions.
    let encoded = serde_json::to_value(serde_json::from_value::<WorkerRequest>(value.clone())?)?;
    // Then: the tag, both IDs, and index remain exact.
    assert_eq!(encoded, value);
    Ok(())
}

#[test]
fn generation_step_trace_response_has_exact_shape() -> Result<(), Box<dyn std::error::Error>> {
    // Given: a historical compact step and a fresh inspectable trace summary.
    let response = WorkerResponse::GenerationStepTrace {
        request_id: 4_294_967_296,
        generation_run_id: 11,
        step_index: 0,
        step: step()?,
        summary: Box::new(summary()?),
    };
    // When: the response crosses serde in both directions.
    let value = serde_json::to_value(&response)?;
    let round_trip = serde_json::from_value::<WorkerResponse>(value.clone())?;
    // Then: the machine-consumed envelope is exact and all payload fields round-trip.
    assert_eq!(value["type"], json!("generation_step_trace"));
    assert_eq!(value["request_id"], json!(4_294_967_296_u64));
    assert_eq!(value["generation_run_id"], json!(11));
    assert_eq!(value["step_index"], json!(0));
    assert_eq!(round_trip, response);
    Ok(())
}
