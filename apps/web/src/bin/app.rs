//! Leptos CSR shell for the Candle Worker spike.

#[cfg(target_arch = "wasm32")]
use leptos::{mount::mount_to_body, prelude::*};
#[cfg(target_arch = "wasm32")]
use nanogpt_schema::{OperationResult, SchemaVersion};
#[cfg(target_arch = "wasm32")]
use transformer_viz_web::spike::{WorkerRequest, WorkerResponse};
#[cfg(target_arch = "wasm32")]
use wasm_bindgen::{JsCast as _, JsValue, closure::Closure};
#[cfg(target_arch = "wasm32")]
use web_sys::{ErrorEvent, MessageEvent, Worker, WorkerOptions, WorkerType};

#[cfg(target_arch = "wasm32")]
#[derive(Clone, Debug)]
enum UiState {
    Initializing,
    Ready,
    Running,
    Result(OperationResult),
    Error(String),
}

#[cfg(target_arch = "wasm32")]
fn js_error(value: &JsValue) -> String {
    value
        .as_string()
        .unwrap_or_else(|| format!("browser error: {value:?}"))
}

#[cfg(target_arch = "wasm32")]
#[component]
fn App() -> impl IntoView {
    let (state, set_state) = signal(UiState::Initializing);
    let options = WorkerOptions::new();
    options.set_type(WorkerType::Module);
    let worker = match Worker::new_with_options("./worker_loader.js", &options) {
        Ok(worker) => {
            let on_message = Closure::<dyn FnMut(MessageEvent)>::new(move |event: MessageEvent| {
                match serde_wasm_bindgen::from_value::<WorkerResponse>(event.data()) {
                    Ok(WorkerResponse::Ready { .. }) => set_state.set(UiState::Ready),
                    Ok(WorkerResponse::OperationResult { result, .. }) => {
                        set_state.set(UiState::Result(*result));
                    }
                    Ok(WorkerResponse::Error { error, .. }) => {
                        set_state.set(UiState::Error(error.message));
                    }
                    Ok(
                        WorkerResponse::Initialized { .. }
                        | WorkerResponse::Tokens { .. }
                        | WorkerResponse::Trace { .. },
                    ) => {
                        set_state.set(UiState::Error("예상하지 못한 Worker 응답".to_owned()));
                    }
                    Err(error) => set_state.set(UiState::Error(error.to_string())),
                }
            });
            worker.set_onmessage(Some(on_message.as_ref().unchecked_ref()));
            on_message.forget();

            let on_error = Closure::<dyn FnMut(ErrorEvent)>::new(move |event: ErrorEvent| {
                set_state.set(UiState::Error(event.message()));
            });
            worker.set_onerror(Some(on_error.as_ref().unchecked_ref()));
            on_error.forget();
            Some(worker)
        }
        Err(error) => {
            set_state.set(UiState::Error(js_error(&error)));
            None
        }
    };

    let run = move |_| {
        let Some(worker) = worker.as_ref() else {
            return;
        };
        set_state.set(UiState::Running);
        match serde_wasm_bindgen::to_value(&WorkerRequest::RunOperations {
            schema_version: SchemaVersion::current(),
            request_id: 1,
        }) {
            Ok(request) => {
                if let Err(error) = worker.post_message(&request) {
                    set_state.set(UiState::Error(js_error(&error)));
                }
            }
            Err(error) => set_state.set(UiState::Error(error.to_string())),
        }
    };

    view! {
        <main>
            <h1>"Transformer Viz · Candle Worker"</h1>
            <p>"Leptos UI는 메인 스레드에서 즉시 렌더링되고 텐서 연산은 Worker가 수행합니다."</p>
            <section aria-live="polite">
                {move || match state.get() {
                    UiState::Initializing => view! { <p id="status">"초기화 중"</p> }.into_any(),
                    UiState::Ready => view! { <p id="status">"준비 완료"</p> }.into_any(),
                    UiState::Running => view! { <p id="status">"Candle CPU 실행 중"</p> }.into_any(),
                    UiState::Error(message) => view! { <p id="status" role="alert">{format!("오류: {message}")}</p> }.into_any(),
                    UiState::Result(result) => view! {
                        <div id="result">
                            <p id="status">"결과 완료"</p>
                            <p>{format!("Backend: {}", result.backend)}</p>
                            <p>{format!("Matmul: {:?}", result.matmul.values)}</p>
                            <p>{format!("Reshape: {:?}", result.reshape.values)}</p>
                            <p>{format!("Transpose: {:?}", result.transpose.values)}</p>
                            <p>{format!("Softmax: {:?}", result.softmax.values)}</p>
                            <p>{format!("LayerNorm ε=1e-5: {:?}", result.layer_norm.values)}</p>
                            <p>{format!("Exact GELU: {:?}", result.gelu.values)}</p>
                        </div>
                    }.into_any(),
                }}
            </section>
            <button
                id="run"
                type="button"
                on:click=run
                disabled=move || !matches!(state.get(), UiState::Ready | UiState::Result(_))
            >
                "Candle 연산 실행"
            </button>
        </main>
    }
}

#[cfg(target_arch = "wasm32")]
fn main() {
    console_error_panic_hook::set_once();
    mount_to_body(App);
}

#[cfg(not(target_arch = "wasm32"))]
const fn main() {}
