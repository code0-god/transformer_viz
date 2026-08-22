//! Reusable Worker detail fixtures for application-state tests.

use nanogpt_schema::{
    AttentionHeadTrace, BlockTrace, LogitsTrace, MaskSnapshot, MlpTrace, OperationId,
    OperationTrace, SchemaVersion, TokenId, TokenInfo, TokenKind, TokenTrace, WorkerResponse,
};

use crate::{source_map, spike};

fn tensor() -> nanogpt_schema::TensorSnapshot {
    let mut tensor = spike::run_candle_spike()
        .expect("spike tensor should be available")
        .gelu;
    tensor.shape = vec![1, 4, 1, 1];
    tensor
}

pub(super) fn block_response() -> WorkerResponse {
    let tensor = tensor();
    WorkerResponse::BlockTrace {
        request_id: 8,
        run_id: 7,
        trace: Box::new(BlockTrace {
            schema_version: SchemaVersion::current(),
            run_id: 7,
            layer: 0,
            operations: vec![OperationTrace {
                operation: OperationId::QueryKeyValue,
                source: source_map::source_reference(OperationId::QueryKeyValue)
                    .expect("the QKV source mapping should exist"),
                output: tensor.stats.clone(),
                tensor: tensor.clone(),
            }],
            attention_residual: tensor.clone(),
            mlp: MlpTrace {
                layer: 0,
                input: tensor.clone(),
                hidden: tensor.clone(),
                activated: tensor.clone(),
                output: tensor.clone(),
                source: source_map::source_reference(OperationId::Mlp)
                    .expect("the MLP source mapping should exist"),
            },
            output: tensor,
        }),
    }
}

pub(super) fn attention_response() -> WorkerResponse {
    let tensor = tensor();
    WorkerResponse::AttentionHeadTrace {
        request_id: 9,
        run_id: 7,
        trace: Box::new(AttentionHeadTrace {
            layer: 0,
            head: 0,
            query: tensor.clone(),
            key: tensor.clone(),
            value: tensor.clone(),
            raw_scores: tensor.clone(),
            scaled_scores: tensor.clone(),
            mask: MaskSnapshot {
                rows: 1,
                cols: 1,
                allowed: vec![true],
            },
            probabilities: tensor.clone(),
            output: tensor,
            source: source_map::source_reference(OperationId::Attention)
                .expect("the attention source mapping should exist"),
        }),
    }
}

pub(super) fn token_response() -> WorkerResponse {
    let tensor = tensor();
    let logits_source = source_map::source_reference(OperationId::Logits)
        .expect("the logits source mapping should exist");
    WorkerResponse::TokenTrace {
        request_id: 10,
        run_id: 7,
        trace: Box::new(TokenTrace {
            schema_version: SchemaVersion::current(),
            run_id: 7,
            layer: 0,
            head: 0,
            token: 0,
            token_info: TokenInfo {
                id: TokenId(0),
                display: "<BOS>".to_owned(),
                piece: Vec::new(),
                byte_start: None,
                byte_end: None,
                kind: TokenKind::Bos,
            },
            input: tensor.clone(),
            attention: tensor.clone(),
            mlp: tensor.clone(),
            logits: LogitsTrace {
                logits: tensor,
                top_k: Vec::new(),
                source: logits_source,
            },
        }),
    }
}
