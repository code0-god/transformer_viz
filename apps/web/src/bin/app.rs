//! Leptos CSR shell for the interactive Transformer explorer.

#[cfg(target_arch = "wasm32")]
use leptos::{mount::mount_to_body, prelude::*};
#[cfg(target_arch = "wasm32")]
use transformer_viz_web::{
    app::{
        state::{AppState, AppStatus},
        worker_client::WorkerClient,
    },
    components::guided::guided_player,
};

#[cfg(target_arch = "wasm32")]
fn app() -> impl IntoView {
    let state = RwSignal::new(AppState::default());
    let response_state = state;
    let error_state = state;
    let client = WorkerClient::start(
        move |response| {
            let mut followups = Vec::new();
            response_state.update(|current| match current.apply(response) {
                Ok(requests) => followups = requests,
                Err(error) => current.status = AppStatus::Error(error.to_string()),
            });
            followups
        },
        move |message| {
            error_state.update(|current| current.status = AppStatus::Error(message));
        },
    );

    match client {
        Ok(client) => view! {
            <a class="skip-link" href="#main-stage">"Main Stage로 건너뛰기"</a>
            {guided_player(state, client)}
        }.into_any(),
        Err(error) => view! { <main class="fatal-error"><h1>"Transformer Viz"</h1><p role="alert">{error.to_string()}</p></main> }.into_any(),
    }
}

#[cfg(target_arch = "wasm32")]
fn main() {
    console_error_panic_hook::set_once();
    mount_to_body(app);
}

#[cfg(not(target_arch = "wasm32"))]
const fn main() {}
