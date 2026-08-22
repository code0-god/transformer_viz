//! Leptos CSR shell for the interactive Transformer explorer.

#[cfg(target_arch = "wasm32")]
use leptos::{mount::mount_to_body, prelude::*};
#[cfg(target_arch = "wasm32")]
use transformer_viz_web::{
    app::{
        playback::Playback,
        state::{AppState, AppStatus},
        worker_client::WorkerClient,
    },
    components::{
        attention::attention_view,
        auxiliary::logits_view,
        block::block_view,
        chrome::{header, model_overview, prompt_panel, token_timeline},
        playback::playback_view,
        source::source_view,
        tensor::tensor_view,
    },
};

#[cfg(target_arch = "wasm32")]
fn app() -> impl IntoView {
    let state = RwSignal::new(AppState::default());
    let playback = RwSignal::new(Playback::default());
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
            <a class="skip-link" href="#main-workspace">"본문으로 건너뛰기"</a>
            {header()}
            <main id="main-workspace" class="app-shell">
                {prompt_panel(state, client.clone())}
                {token_timeline(state, client.clone())}
                <div class="workspace-grid">
                    <aside class="workspace-overview">{model_overview(state, client.clone())}</aside>
                    <div class="workspace-detail">{block_view(state, playback)}{attention_view(state, client)}</div>
                    <aside class="workspace-inspector">{tensor_view(state)}{logits_view(state)}{source_view(state, playback)}{playback_view(state, playback)}</aside>
                </div>
            </main>
            <footer><p>"모든 추론과 trace 생성은 브라우저의 Rust Web Worker에서 실행됩니다."</p></footer>
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
