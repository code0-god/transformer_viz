//! Shared typed Worker request dispatch for retained controls.

use leptos::prelude::*;
use nanogpt_schema::WorkerRequest;

use crate::app::{state::AppState, worker_client::WorkerClient};

pub(super) fn send_or_error(
    state: RwSignal<AppState>,
    client: &WorkerClient,
    request: &WorkerRequest,
) {
    if let Err(error) = client.send(request) {
        let message = error.to_string();
        state.update(|current| current.request_send_failed(request, &message));
    }
}
