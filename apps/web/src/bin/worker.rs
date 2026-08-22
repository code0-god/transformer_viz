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
use transformer_viz_web::runtime_generation::{GenerationKey, GenerationStart};
#[cfg(target_arch = "wasm32")]
use wasm_bindgen::{JsCast as _, JsValue, closure::Closure};
#[cfg(target_arch = "wasm32")]
use wasm_bindgen_futures::spawn_local;
#[cfg(target_arch = "wasm32")]
use web_sys::{DedicatedWorkerGlobalScope, MessageEvent, Url};

#[cfg(target_arch = "wasm32")]
include!("worker/generation.rs");

#[cfg(target_arch = "wasm32")]
fn post(scope: &DedicatedWorkerGlobalScope, response: &WorkerResponse) -> bool {
    match serde_wasm_bindgen::to_value(response) {
        Ok(value) => match scope.post_message(&value) {
            Ok(()) => true,
            Err(error) => {
                web_sys::console::error_1(&error);
                false
            }
        },
        Err(error) => {
            web_sys::console::error_1(&JsValue::from_str(&error.to_string()));
            false
        }
    }
}

#[cfg(target_arch = "wasm32")]
fn resolve(relative: &str, base: &str) -> Result<String, RuntimeError> {
    Url::new_with_base(relative, base)
        .map(|url| url.href())
        .map_err(|error| RuntimeError::AssetUnavailable(format!("{error:?}")))
}

#[cfg(target_arch = "wasm32")]
const fn request_id(request: &WorkerRequest) -> Option<u64> {
    match request {
        WorkerRequest::Initialize { .. } => None,
        WorkerRequest::Run { request_id, .. }
        | WorkerRequest::Generate { request_id, .. }
        | WorkerRequest::StopGeneration { request_id, .. }
        | WorkerRequest::ContinueGeneration { request_id, .. }
        | WorkerRequest::InspectGenerationStep { request_id, .. }
        | WorkerRequest::InspectBlock { request_id, .. }
        | WorkerRequest::InspectAttentionHead { request_id, .. }
        | WorkerRequest::InspectToken { request_id, .. }
        | WorkerRequest::Cancel { request_id } => Some(*request_id),
    }
}

#[cfg(target_arch = "wasm32")]
fn begin_initialization(
    scope: &DedicatedWorkerGlobalScope,
    runtime: &Rc<RefCell<WorkerRuntime>>,
    manifest_path: String,
) {
    let _posted = post(
        scope,
        &WorkerResponse::Initializing {
            phase: "모델 파일 확인 중".to_owned(),
        },
    );
    let task_scope = scope.clone();
    let task_runtime = Rc::clone(runtime);
    let worker_url = scope.location().href();
    spawn_local(async move {
        let load = async {
            let manifest_url = resolve(&manifest_path, &worker_url)?;
            let fetch = |url: String| async move {
                let response = Request::get(&url)
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
            };
            let text = |bytes: Vec<u8>| {
                String::from_utf8(bytes)
                    .map_err(|error| RuntimeError::InvalidAsset(error.to_string()))
            };
            let manifest = text(fetch(manifest_url.clone()).await?)?;
            let (config_name, tokenizer_name, weights_name) =
                WorkerRuntime::asset_names(&manifest)?;
            let config = text(fetch(resolve(&config_name, &manifest_url)?).await?)?;
            let tokenizer = text(fetch(resolve(&tokenizer_name, &manifest_url)?).await?)?;
            let weights = fetch(resolve(&weights_name, &manifest_url)?).await?;
            Ok::<_, RuntimeError>(AssetBundle {
                manifest,
                config,
                tokenizer,
                weights,
            })
        };
        let response = match load.await {
            Ok(assets) => task_runtime
                .borrow_mut()
                .initialize(&assets)
                .unwrap_or_else(|error| error_response(None, &error)),
            Err(error) => error_response(None, &error),
        };
        let _posted = post(&task_scope, &response);
    });
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
                let _posted = post(
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
            begin_initialization(&message_scope, &message_runtime, manifest_url);
            return;
        }
        match request {
            WorkerRequest::Generate {
                request_id,
                text,
                config,
            } => {
                let start = {
                    let mut runtime = message_runtime.borrow_mut();
                    runtime.start_generation(request_id, &text, &config)
                };
                match start {
                    Ok(start) => {
                        start_generation(&message_scope, &mut message_runtime.borrow_mut(), &start);
                    }
                    Err(error) => {
                        let _posted =
                            post(&message_scope, &error_response(Some(request_id), &error));
                    }
                }
            }
            WorkerRequest::StopGeneration { request_id, run_id } => {
                if let Some(response) = message_runtime
                    .borrow_mut()
                    .stop_generation(request_id, run_id)
                {
                    let _posted = post(&message_scope, &response);
                }
            }
            WorkerRequest::ContinueGeneration {
                request_id,
                run_id,
                step_index,
            } => continue_generation(
                &message_scope,
                &mut message_runtime.borrow_mut(),
                request_id,
                run_id,
                step_index,
            ),
            synchronous => {
                let id = request_id(&synchronous);
                let response = message_runtime
                    .borrow_mut()
                    .handle(synchronous)
                    .unwrap_or_else(|error| error_response(id, &error));
                let _posted = post(&message_scope, &response);
            }
        }
    });
    scope.set_onmessage(Some(on_message.as_ref().unchecked_ref()));
    on_message.forget();
    let _posted = post(
        &scope,
        &WorkerResponse::Initializing {
            phase: "Worker 시작됨".to_owned(),
        },
    );
}

#[cfg(not(target_arch = "wasm32"))]
const fn main() {}
