//! UI trace lookup integration over a real Worker-produced summary.

use nanogpt_schema::{WorkerRequest, WorkerResponse};
use transformer_viz_web::trace_lookup::TraceLookup;
use transformer_viz_worker::{
    runtime::{AssetBundle, WorkerRuntime},
    runtime_error::RuntimeError,
};

fn assets() -> AssetBundle {
    AssetBundle {
        manifest: include_str!("../public/models/edu/manifest.json").to_owned(),
        config: include_str!("../public/models/edu/config.json").to_owned(),
        tokenizer: include_str!("../public/models/edu/tokenizer.json").to_owned(),
        weights: include_bytes!("../public/models/edu/model.safetensors").to_vec(),
    }
}

#[test]
fn lookup_projects_real_worker_summary_tensors() -> Result<(), RuntimeError> {
    let mut runtime = WorkerRuntime::default();
    let _ready = runtime.initialize(&assets())?;
    let response = runtime.handle(WorkerRequest::Run {
        request_id: 1,
        text: "cat".to_owned(),
    })?;
    let WorkerResponse::RunComplete { summary, .. } = response else {
        return Err(RuntimeError::InvalidSelector);
    };

    let lookup = TraceLookup::new().with_summary(&summary);
    assert_eq!(
        lookup.embeddings().map(|trace| trace.sum.id.as_str()),
        Some("embedding_sum")
    );
    assert_eq!(
        lookup.final_layer_norm().map(|tensor| tensor.id.as_str()),
        Some("final_layer_norm")
    );
    assert_eq!(lookup.logits().map(|trace| trace.top_k.len()), Some(10));
    Ok(())
}
