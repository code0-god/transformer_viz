//! Guided Learning Player components backed by real Worker traces.

mod architecture;
mod generation;
mod generation_timeline;
mod inspector;
mod rail;
mod scroll;
mod shell;
mod stage;
mod stage_copy;
mod visuals;

use leptos::prelude::*;

use crate::app::{state::AppState, worker_client::WorkerClient};

/// Complete guided-player shell in stage-first DOM order.
#[must_use]
pub fn guided_player(state: RwSignal<AppState>, client: WorkerClient) -> impl IntoView {
    view! {
        <div class="guided-player" data-testid="guided-player">
            {shell::player_header(state)}
            <div id="shared-workspace" class="shared-workspace" role="tabpanel" aria-labelledby=move || state.with(|current| if current.ui.mode == crate::app::ui_state::ExplorerMode::Guided { "mode-guided" } else { "mode-explore" })>
                {generation::generation_controls(state, client.clone())}
                {generation_timeline::generation_timeline(state, client.clone())}
                {shell::context_bar(state, client.clone())}
                {stage::main_stage(state, client.clone())}
                {architecture::architecture_map(state, client)}
                {inspector::inspector(state)}
                {rail::stage_rail(state)}
            </div>
        </div>
    }
}
