//! Leptos CSR shell for the interactive Transformer explorer.

#[cfg(target_arch = "wasm32")]
use leptos::{mount::mount_to_body, prelude::*};
#[cfg(target_arch = "wasm32")]
use transformer_viz_web::{
    AppError,
    app::{
        state::{AppState, AppStatus},
        worker_client::WorkerClient,
    },
    components::guided::architecture_first_app,
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
            <a class="skip-link" href="#architecture-main">"Architecture로 건너뛰기"</a>
            {architecture_first_app(state, client)}
        }.into_any(),
        Err(error) => view! { <main class="fatal-error"><h1>"Transformer Viz"</h1><p role="alert">{error.to_string()}</p></main> }.into_any(),
    }
}

#[cfg(target_arch = "wasm32")]
fn remove_startup_shell() -> Result<(), AppError> {
    let shell = web_sys::window()
        .and_then(|window| window.document())
        .and_then(|document| document.get_element_by_id("startup-shell"))
        .ok_or_else(|| AppError::Startup("static startup shell is missing".to_owned()))?;
    shell.remove();
    Ok(())
}

#[cfg(target_arch = "wasm32")]
fn main() {
    console_error_panic_hook::set_once();
    match remove_startup_shell() {
        Ok(()) => {
            mount_to_body(app);
        }
        Err(error) => {
            mount_to_body(move || {
                view! { <main class="fatal-error"><h1>"Transformer Viz"</h1><p role="alert">{error.to_string()}</p></main> }
            });
        }
    }
}

#[cfg(not(target_arch = "wasm32"))]
const fn main() {}
