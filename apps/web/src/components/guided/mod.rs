//! Guided Learning Player components backed by real Worker traces.

mod inspector;
mod rail;
mod shell;
mod stage;
mod visuals;

use leptos::prelude::*;

use crate::app::{state::AppState, worker_client::WorkerClient};

/// Complete guided-player shell in stage-first DOM order.
#[must_use]
pub fn guided_player(state: RwSignal<AppState>, client: WorkerClient) -> impl IntoView {
    view! {
        <div class="guided-player" data-testid="guided-player">
            {shell::player_header(state)}
            {shell::prompt_drawer(state, client.clone())}
            {shell::context_bar(state, client.clone())}
            {stage::main_stage(state, client.clone())}
            {rail::stage_rail(state)}
            {shell::model_map(state, client)}
            {inspector::inspector(state)}
        </div>
    }
}
