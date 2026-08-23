//! Architecture-first application surface backed by real Worker traces.

mod architecture_overview;
mod generation;
mod generation_timeline;
mod header;
mod interaction;
mod scroll;

use leptos::prelude::*;

use crate::app::{state::AppState, worker_client::WorkerClient};

/// Architecture-first initial screen.
#[must_use]
pub fn architecture_first_app(state: RwSignal<AppState>, client: WorkerClient) -> impl IntoView {
    view! {
        <div class="architecture-app" data-testid="architecture-app">
            {header::architecture_header(state)}
            <main id="architecture-main" class="architecture-main">
                {generation::generation_controls(state, client.clone())}
                {generation_timeline::generation_timeline(state, client)}
                {architecture_overview::architecture_overview(state)}
            </main>
        </div>
    }
}
