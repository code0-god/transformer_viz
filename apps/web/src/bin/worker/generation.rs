//! One-credit generation dispatch for the inference Worker.

use nanogpt_schema::{WorkerErrorCode, WorkerResponse};
use transformer_viz_web::runtime::{WorkerRuntime, error_response};
use transformer_viz_web::runtime_generation::{GenerationKey, GenerationStart};
use web_sys::DedicatedWorkerGlobalScope;

use super::post;

pub(super) fn start_generation(
    scope: &DedicatedWorkerGlobalScope,
    runtime: &mut WorkerRuntime,
    start: GenerationStart,
) {
    let key = start.key;
    if !post_all(scope, &start.responses) {
        let _abandoned = runtime.fail_generation(key);
        return;
    }
    match runtime.advance_generation(key) {
        Ok(events) => {
            if !post_all(scope, &events) {
                let _abandoned = runtime.fail_generation(key);
            }
        }
        Err(error) => fail_initial(scope, runtime, key, &error),
    }
}

pub(super) fn continue_generation(
    scope: &DedicatedWorkerGlobalScope,
    runtime: &mut WorkerRuntime,
    request_id: u64,
    run_id: u64,
    step_index: usize,
) {
    match runtime.continue_generation(request_id, run_id, step_index) {
        Ok(events) => {
            if !post_all(scope, &events) {
                let _abandoned = runtime.fail_generation_identity(request_id, run_id);
            }
        }
        Err(error) => {
            let _error_posted = post(scope, &error_response(Some(request_id), &error));
            if let Some(terminal) = runtime.fail_generation_identity(request_id, run_id) {
                let _terminal_posted = post(scope, &terminal);
            }
        }
    }
}

fn post_all(scope: &DedicatedWorkerGlobalScope, events: &[WorkerResponse]) -> bool {
    events.iter().all(|event| post(scope, event))
}

fn fail_initial(
    scope: &DedicatedWorkerGlobalScope,
    runtime: &mut WorkerRuntime,
    key: GenerationKey,
    error: &impl std::fmt::Display,
) {
    let _error_posted = post(
        scope,
        &WorkerResponse::Error {
            request_id: Some(key.request_id()),
            code: WorkerErrorCode::Inference,
            message: error.to_string(),
        },
    );
    if let Some(terminal) = runtime.fail_generation(key) {
        let _terminal_posted = post(scope, &terminal);
    }
}
