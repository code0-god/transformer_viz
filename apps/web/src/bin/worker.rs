//! Dedicated production inference Web Worker.

#[cfg(target_arch = "wasm32")]
use std::{cell::RefCell, rc::Rc};

#[cfg(target_arch = "wasm32")]
use gloo_net::http::Request;
#[cfg(target_arch = "wasm32")]
use nanogpt_schema::{WorkerErrorCode, WorkerRequest, WorkerResponse};
#[cfg(target_arch = "wasm32")]
use transformer_viz_web::runtime::{AssetBundle, WorkerRuntime, error_response};
#[cfg(target_arch = "wasm32")]
use transformer_viz_web::runtime_error::RuntimeError;
#[cfg(target_arch = "wasm32")]
use wasm_bindgen::{JsCast as _, JsValue, closure::Closure};
#[cfg(target_arch = "wasm32")]
use wasm_bindgen_futures::spawn_local;
#[cfg(target_arch = "wasm32")]
use web_sys::{DedicatedWorkerGlobalScope, MessageEvent, Url};

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
async fn fetch_bytes(url: &str) -> Result<Vec<u8>, RuntimeError> {
    let response = Request::get(url)
        .send()
        .await
        .map_err(|error| RuntimeError::AssetUnavailable(error.to_string()))?;
    if !response.ok() {
        return Err(RuntimeError::AssetUnavailable(format!(
            "HTTP {}: {url}",
            response.status()
        )));
    }
    response
        .binary()
        .await
        .map_err(|error| RuntimeError::AssetUnavailable(error.to_string()))
}

#[cfg(target_arch = "wasm32")]
async fn fetch_text(url: &str) -> Result<String, RuntimeError> {
    String::from_utf8(fetch_bytes(url).await?)
        .map_err(|error| RuntimeError::InvalidAsset(error.to_string()))
}

#[cfg(target_arch = "wasm32")]
fn resolve(relative: &str, base: &str) -> Result<String, RuntimeError> {
    Url::new_with_base(relative, base)
        .map(|url| url.href())
        .map_err(|error| RuntimeError::AssetUnavailable(format!("{error:?}")))
}

#[cfg(target_arch = "wasm32")]
async fn download_assets(
    manifest_url: &str,
    worker_url: &str,
) -> Result<AssetBundle, RuntimeError> {
    let manifest_url = resolve(manifest_url, worker_url)?;
    let manifest = fetch_text(&manifest_url).await?;
    let (config_name, tokenizer_name, weights_name) = WorkerRuntime::asset_names(&manifest)?;
    let config = fetch_text(&resolve(&config_name, &manifest_url)?).await?;
    let tokenizer = fetch_text(&resolve(&tokenizer_name, &manifest_url)?).await?;
    let weights = fetch_bytes(&resolve(&weights_name, &manifest_url)?).await?;
    Ok(AssetBundle {
        manifest,
        config,
        tokenizer,
        weights,
    })
}

#[cfg(target_arch = "wasm32")]
fn request_id(request: &WorkerRequest) -> Option<u64> {
    match request {
        WorkerRequest::Initialize { .. } => None,
        WorkerRequest::Run { request_id, .. }
        | WorkerRequest::InspectBlock { request_id, .. }
        | WorkerRequest::InspectAttentionHead { request_id, .. }
        | WorkerRequest::InspectToken { request_id, .. }
        | WorkerRequest::Cancel { request_id } => Some(*request_id),
    }
}

#[cfg(target_arch = "wasm32")]
fn main() {
    console_error_panic_hook::set_once();
    let scope = DedicatedWorkerGlobalScope::from(JsValue::from(js_sys::global()));
    let runtime = Rc::new(RefCell::new(WorkerRuntime::default()));
    let message_scope = scope.clone();
    let message_runtime = Rc::clone(&runtime);
    let on_message = Closure::<dyn FnMut(MessageEvent)>::new(move |event: MessageEvent| {
        let request = match serde_wasm_bindgen::from_value::<WorkerRequest>(event.data()) {
            Ok(request) => request,
            Err(error) => {
                post(
                    &message_scope,
                    &WorkerResponse::Error {
                        request_id: None,
                        code: WorkerErrorCode::InvalidRequest,
                        message: format!("Worker 요청이 올바르지 않습니다: {error}"),
                    },
                );
                return;
            }
        };
        if let WorkerRequest::Initialize { manifest_url } = request {
            post(
                &message_scope,
                &WorkerResponse::Initializing {
                    phase: "모델 파일 확인 중".to_owned(),
                },
            );
            let task_scope = message_scope.clone();
            let task_runtime = Rc::clone(&message_runtime);
            let worker_url = message_scope.location().href();
            spawn_local(async move {
                let response = match download_assets(&manifest_url, &worker_url).await {
                    Ok(assets) => task_runtime
                        .borrow_mut()
                        .initialize(&assets)
                        .unwrap_or_else(|error| error_response(None, &error)),
                    Err(error) => error_response(None, &error),
                };
                post(&task_scope, &response);
            });
            return;
        }
        let id = request_id(&request);
        let response = message_runtime
            .borrow_mut()
            .handle(request)
            .unwrap_or_else(|error| error_response(id, &error));
        post(&message_scope, &response);
    });
    scope.set_onmessage(Some(on_message.as_ref().unchecked_ref()));
    on_message.forget();
    post(
        &scope,
        &WorkerResponse::Initializing {
            phase: "Worker 시작됨".to_owned(),
        },
    );
}

#[cfg(not(target_arch = "wasm32"))]
const fn main() {}
