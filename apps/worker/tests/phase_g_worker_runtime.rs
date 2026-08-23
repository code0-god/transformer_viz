//! Production Worker runtime and one-run trace cache contracts.

use nanogpt_schema::{WorkerErrorCode, WorkerRequest, WorkerResponse};
use transformer_viz_worker::runtime::{AssetBundle, WorkerRuntime, error_response};
use transformer_viz_worker::runtime_error::RuntimeError;

fn assets() -> AssetBundle {
    AssetBundle {
        manifest: include_str!("../../web/public/models/edu/manifest.json").to_owned(),
        config: include_str!("../../web/public/models/edu/config.json").to_owned(),
        tokenizer: include_str!("../../web/public/models/edu/tokenizer.json").to_owned(),
        weights: include_bytes!("../../web/public/models/edu/model.safetensors").to_vec(),
    }
}

#[test]
fn ready_metadata_and_summary_expose_loaded_config_and_stable_tensors() -> Result<(), RuntimeError>
{
    let mut runtime = WorkerRuntime::default();
    let ready = runtime.initialize(&assets())?;
    let WorkerResponse::Ready { model } = ready else {
        return Err(RuntimeError::InvalidSelector);
    };
    assert_eq!(model.config.n_layer, 2);
    assert_eq!(model.config.n_head, 4);
    assert_eq!(model.config.n_embd, 64);

    let response = runtime.handle(WorkerRequest::Run {
        request_id: 1,
        text: "cat".to_owned(),
    })?;
    let WorkerResponse::RunComplete { summary, .. } = response else {
        return Err(RuntimeError::InvalidSelector);
    };
    assert_eq!(summary.embeddings.token.id, "token_embeddings");
    assert_eq!(summary.embeddings.position.id, "position_embeddings");
    assert_eq!(summary.embeddings.sum.id, "embedding_sum");
    assert_eq!(summary.final_layer_norm.id, "final_layer_norm");
    assert_eq!(summary.logits.top_k.len(), 10);
    Ok(())
}

fn initialized() -> Result<WorkerRuntime, RuntimeError> {
    let mut runtime = WorkerRuntime::default();
    let response = runtime.initialize(&assets())?;
    assert!(matches!(response, WorkerResponse::Ready { .. }));
    Ok(runtime)
}

fn run(runtime: &mut WorkerRuntime, request_id: u64, text: &str) -> Result<u64, RuntimeError> {
    let response = runtime.handle(WorkerRequest::Run {
        request_id,
        text: text.to_owned(),
    })?;
    let WorkerResponse::RunComplete { summary, .. } = response else {
        return Err(RuntimeError::InvalidSelector);
    };
    assert_eq!(summary.logits.top_k.len(), 10);
    assert_eq!(summary.layers.len(), 2);
    Ok(summary.run_id)
}

#[test]
fn returns_real_summary_and_all_detail_responses_after_run() -> Result<(), RuntimeError> {
    // Given: initialized trained assets and one completed run.
    let mut runtime = initialized()?;
    let run_id = run(&mut runtime, 7, "the cat")?;

    // When: each supported detail selector is replayed.
    let block = runtime.handle(WorkerRequest::InspectBlock {
        request_id: 8,
        run_id,
        layer: 0,
    })?;
    let head = runtime.handle(WorkerRequest::InspectAttentionHead {
        request_id: 9,
        run_id,
        layer: 0,
        head: 1,
    });
    let token = runtime.handle(WorkerRequest::InspectToken {
        request_id: 10,
        run_id,
        layer: 0,
        head: 1,
        token: 2,
    });

    // Then: the block has all 18 stages and bounded head/token payloads are returned.
    let WorkerResponse::BlockTrace { trace, .. } = block else {
        return Err(RuntimeError::InvalidSelector);
    };
    assert_eq!(trace.operations.len(), 18);
    assert!(matches!(
        head,
        Ok(WorkerResponse::AttentionHeadTrace { .. })
    ));
    assert!(matches!(token, Ok(WorkerResponse::TokenTrace { .. })));
    Ok(())
}

#[test]
fn new_run_invalidates_previous_detail_cache() -> Result<(), RuntimeError> {
    // Given: two sequential runs.
    let mut runtime = initialized()?;
    let old_run = run(&mut runtime, 1, "the cat")?;
    let new_run = run(&mut runtime, 2, "the dog")?;

    // When: detail from the first run is requested.
    let stale = runtime.handle(WorkerRequest::InspectBlock {
        request_id: 3,
        run_id: old_run,
        layer: 0,
    });

    // Then: only the latest run remains inspectable.
    assert!(matches!(stale, Err(RuntimeError::StaleRun)));
    assert_ne!(old_run, new_run);
    Ok(())
}

#[test]
fn rejects_checksum_mismatch_empty_long_and_invalid_selectors() -> Result<(), RuntimeError> {
    // Given: corrupted weights.
    let mut bad_assets = assets();
    bad_assets.weights[0] ^= 0xff;
    let mut runtime = WorkerRuntime::default();

    // When: corrupted assets are initialized.
    let checksum = runtime.initialize(&bad_assets);

    // Then: integrity failure has its stable category.
    let Err(error) = checksum else {
        return Err(RuntimeError::InvalidSelector);
    };
    assert_eq!(error.code(), WorkerErrorCode::ChecksumMismatch);

    // Given: a valid initialized runtime.
    let mut runtime = initialized()?;

    // When/Then: boundary and selector errors remain typed.
    assert!(matches!(
        runtime.handle(WorkerRequest::Run {
            request_id: 4,
            text: String::new()
        }),
        Err(RuntimeError::EmptyInput)
    ));
    assert!(matches!(
        runtime.handle(WorkerRequest::Run {
            request_id: 5,
            text: "x".repeat(23)
        }),
        Err(RuntimeError::InputTooLong { limit: 24, .. })
    ));
    let run_id = run(&mut runtime, 6, "cat")?;
    let invalid = runtime.handle(WorkerRequest::InspectAttentionHead {
        request_id: 7,
        run_id,
        layer: 0,
        head: 4,
    });
    assert!(matches!(invalid, Err(RuntimeError::InvalidSelector)));
    Ok(())
}

#[test]
fn cancel_returns_korean_typed_error() -> Result<(), RuntimeError> {
    // Given: an initialized Worker.
    let mut runtime = initialized()?;

    // When: a request is cancelled.
    let result = runtime.handle(WorkerRequest::Cancel { request_id: 42 });

    // Then: the protocol exposes a stable category and user-facing Korean message.
    let Err(error) = result else {
        return Err(RuntimeError::InvalidSelector);
    };
    let response = error_response(Some(42), &error);
    assert!(
        matches!(response, WorkerResponse::Error { request_id: Some(42), code: WorkerErrorCode::Cancelled, ref message } if message == "요청이 취소되었습니다")
    );
    Ok(())
}
