//! Dedicated Web Worker entry point for Candle CPU operations.

#[cfg(target_arch = "wasm32")]
use transformer_viz_web::spike::{
    WorkerRequest, WorkerResponse, handle_worker_request, spike_model_metadata, worker_error,
};
#[cfg(target_arch = "wasm32")]
use wasm_bindgen::{JsCast as _, JsValue, closure::Closure};
#[cfg(target_arch = "wasm32")]
use web_sys::{DedicatedWorkerGlobalScope, MessageEvent};

#[cfg(target_arch = "wasm32")]
fn post(scope: &DedicatedWorkerGlobalScope, response: &WorkerResponse) {
    match serde_wasm_bindgen::to_value(response) {
        Ok(value) => {
            if let Err(error) = scope.post_message(&value) {
                web_sys::console::error_1(&error);
            }
        }
        Err(error) => web_sys::console::error_1(&JsValue::from_str(&error.to_string())),
    }
}

#[cfg(target_arch = "wasm32")]
fn main() {
    console_error_panic_hook::set_once();
    let scope = DedicatedWorkerGlobalScope::from(JsValue::from(js_sys::global()));
    let message_scope = scope.clone();
    let on_message = Closure::<dyn FnMut(MessageEvent)>::new(move |event: MessageEvent| {
        let response = match serde_wasm_bindgen::from_value::<WorkerRequest>(event.data()) {
            Ok(request) => match handle_worker_request(request) {
                Ok(response) => response,
                Err(error) => worker_error(&error),
            },
            Err(error) => WorkerResponse::Error {
                request_id: None,
                code: nanogpt_schema::WorkerErrorCode::InvalidRequest,
                message: error.to_string(),
            },
        };
        post(&message_scope, &response);
    });
    scope.set_onmessage(Some(on_message.as_ref().unchecked_ref()));
    on_message.forget();
    post(
        &scope,
        &WorkerResponse::Ready {
            model: spike_model_metadata(),
        },
    );
}

#[cfg(not(target_arch = "wasm32"))]
const fn main() {}
