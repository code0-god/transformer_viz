use nanogpt_schema::{WorkerRequest, WorkerResponse};

use super::{AssetBundle, RuntimeError, WorkerRuntime};

fn assets() -> AssetBundle {
    AssetBundle {
        manifest: include_str!("../public/models/edu/manifest.json").to_owned(),
        config: include_str!("../public/models/edu/config.json").to_owned(),
        tokenizer: include_str!("../public/models/edu/tokenizer.json").to_owned(),
        weights: include_bytes!("../public/models/edu/model.safetensors").to_vec(),
    }
}

#[test]
fn detail_replays_from_cached_layer_input_without_original_token_ids() -> Result<(), RuntimeError> {
    // Given: a completed run whose original token IDs are no longer available.
    let mut runtime = WorkerRuntime::default();
    runtime.initialize(&assets())?;
    let response = runtime.handle(WorkerRequest::Run {
        request_id: 1,
        text: "the cat".to_owned(),
    })?;
    let WorkerResponse::RunComplete { summary, .. } = response else {
        return Err(RuntimeError::InvalidSelector);
    };
    // The cache intentionally retains layer inputs and no original token-ID sequence.

    // When: a selected layer is inspected.
    let detail = runtime.handle(WorkerRequest::InspectBlock {
        request_id: 2,
        run_id: summary.run_id,
        layer: 1,
    });

    // Then: replay succeeds from the cached layer input tensor.
    assert!(matches!(detail, Ok(WorkerResponse::BlockTrace { .. })));
    Ok(())
}
