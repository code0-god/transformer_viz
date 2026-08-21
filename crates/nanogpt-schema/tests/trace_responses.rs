//! Exact trace-bearing Worker response variants.

use nanogpt_schema::{
    AttentionHeadTrace, BlockTrace, FiniteF32, LogitsTrace, MaskSnapshot, MlpTrace, OperationId,
    OperationTrace, RunSummary, SchemaError, SchemaVersion, SourceReference, TensorSnapshot,
    TensorStats, TokenId, TokenInfo, TokenKind, TokenTrace, WorkerResponse,
};
use serde_json::json;

fn stats() -> Result<TensorStats, SchemaError> {
    let zero = FiniteF32::new(0.0)?;
    Ok(TensorStats {
        min: zero,
        max: zero,
        mean: zero,
        std: zero,
        l2_norm: zero,
    })
}

fn snapshot(name: &str) -> Result<TensorSnapshot, SchemaError> {
    TensorSnapshot::new(name.to_owned(), vec![1], vec![FiniteF32::new(0.0)?])
}

fn source() -> SourceReference {
    SourceReference {
        file: "model.py".to_owned(),
        start_line: 1,
        end_line: 1,
        symbol: "forward".to_owned(),
    }
}

fn token_info() -> TokenInfo {
    TokenInfo {
        id: TokenId(3),
        display: "\\0".to_owned(),
        piece: vec![0],
        byte_start: Some(0),
        byte_end: Some(1),
        kind: TokenKind::Byte,
    }
}

fn logits() -> Result<LogitsTrace, SchemaError> {
    Ok(LogitsTrace {
        logits: snapshot("logits")?,
        top_k: Vec::new(),
        source: source(),
    })
}

#[test]
fn trace_worker_response_contains_every_exact_variant() -> Result<(), Box<dyn std::error::Error>> {
    // Given: concrete finite fixtures for every trace-bearing response.
    let mlp = MlpTrace {
        layer: 0,
        input: snapshot("mlp_input")?,
        hidden: snapshot("hidden")?,
        activated: snapshot("activated")?,
        output: snapshot("mlp_output")?,
        source: source(),
    };
    let block = BlockTrace {
        schema_version: SchemaVersion::current(),
        run_id: 8,
        layer: 0,
        operations: vec![OperationTrace {
            operation: OperationId::Embedding,
            source: source(),
            output: stats()?,
        }],
        attention_residual: snapshot("attention_residual")?,
        mlp,
        output: snapshot("block_output")?,
    };
    let head = AttentionHeadTrace {
        layer: 0,
        head: 0,
        query: snapshot("q")?,
        key: snapshot("k")?,
        value: snapshot("v")?,
        raw_scores: snapshot("raw")?,
        scaled_scores: snapshot("scaled")?,
        mask: MaskSnapshot::new(1, 1, vec![true])?,
        probabilities: snapshot("probabilities")?,
        output: snapshot("attention_output")?,
        source: source(),
    };
    let token = TokenTrace {
        schema_version: SchemaVersion::current(),
        run_id: 8,
        layer: 0,
        head: 0,
        token: 0,
        token_info: token_info(),
        input: snapshot("token_input")?,
        attention: snapshot("token_attention")?,
        mlp: snapshot("token_mlp")?,
        logits: logits()?,
    };
    let summary = RunSummary {
        schema_version: SchemaVersion::current(),
        run_id: 8,
        tokens: vec![token_info()],
        layers: Vec::new(),
        duration_ms: FiniteF32::new(0.0)?,
        logits: logits()?,
    };
    let responses = [
        WorkerResponse::RunComplete {
            request_id: 1,
            summary: Box::new(summary),
        },
        WorkerResponse::BlockTrace {
            request_id: 2,
            run_id: 8,
            trace: Box::new(block),
        },
        WorkerResponse::AttentionHeadTrace {
            request_id: 3,
            run_id: 8,
            trace: Box::new(head),
        },
        WorkerResponse::TokenTrace {
            request_id: 4,
            run_id: 8,
            trace: Box::new(token),
        },
    ];
    // When: every response is serialized through the public boundary.
    let tags = responses
        .into_iter()
        .map(serde_json::to_value)
        .collect::<Result<Vec<_>, _>>()?
        .into_iter()
        .map(|value| value["type"].clone())
        .collect::<Vec<_>>();
    // Then: all exact machine-consumed variant tags are present.
    assert_eq!(
        tags,
        [
            json!("run_complete"),
            json!("block_trace"),
            json!("attention_head_trace"),
            json!("token_trace")
        ]
    );
    Ok(())
}
