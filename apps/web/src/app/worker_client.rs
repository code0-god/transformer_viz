//! Typed browser Web Worker client.

use std::{cell::RefCell, rc::Rc};

use nanogpt_schema::{WorkerRequest, WorkerResponse};
use thiserror::Error;
use wasm_bindgen::{JsCast as _, JsValue, closure::Closure};
use web_sys::{ErrorEvent, MessageEvent, Worker, WorkerOptions, WorkerType};

/// Browser Worker transport failure.
#[derive(Debug, Error)]
pub enum WorkerClientError {
    /// Worker construction or message posting failed.
    #[error("Worker 통신을 시작하지 못했습니다: {0}")]
    Browser(String),
    /// Request encoding failed.
    #[error("Worker 요청을 직렬화하지 못했습니다: {0}")]
    Encode(String),
}

/// Cloneable handle to the dedicated inference Worker.
#[derive(Clone, Debug)]
pub struct WorkerClient {
    worker: Worker,
}

impl WorkerClient {
    /// Starts the module Worker and routes decoded responses through one handler.
    ///
    /// # Errors
    /// Returns [`WorkerClientError`] when the browser cannot create the Worker.
    pub fn start(
        handler: impl Fn(WorkerResponse) -> Vec<WorkerRequest> + 'static,
        on_error: impl Fn(String) + 'static,
    ) -> Result<Self, WorkerClientError> {
        let options = WorkerOptions::new();
        options.set_type(WorkerType::Module);
        let worker = Worker::new_with_options("./worker_loader.js", &options)
            .map_err(|error| WorkerClientError::Browser(js_error(&error)))?;
        let transport = Rc::new(RefCell::new(Some(worker.clone())));
        let message_transport = Rc::clone(&transport);
        let error_handler: Rc<dyn Fn(String)> = Rc::new(on_error);
        let message_error_handler = Rc::clone(&error_handler);
        let on_message = Closure::<dyn FnMut(MessageEvent)>::new(move |event: MessageEvent| {
            match serde_wasm_bindgen::from_value::<WorkerResponse>(event.data()) {
                Ok(response) => {
                    for request in handler(response) {
                        if let Some(worker) = message_transport.borrow().as_ref()
                            && let Ok(value) = serde_wasm_bindgen::to_value(&request)
                        {
                            let _result = worker.post_message(&value);
                        }
                    }
                }
                Err(error) => message_error_handler(error.to_string()),
            }
        });
        worker.set_onmessage(Some(on_message.as_ref().unchecked_ref()));
        on_message.forget();

        let on_worker_error = Closure::<dyn FnMut(ErrorEvent)>::new(move |event: ErrorEvent| {
            error_handler(event.message());
        });
        worker.set_onerror(Some(on_worker_error.as_ref().unchecked_ref()));
        on_worker_error.forget();
        Ok(Self { worker })
    }

    /// Posts one typed protocol request.
    ///
    /// # Errors
    /// Returns [`WorkerClientError`] when serialization or browser posting fails.
    pub fn send(&self, request: &WorkerRequest) -> Result<(), WorkerClientError> {
        let value = serde_wasm_bindgen::to_value(request)
            .map_err(|error| WorkerClientError::Encode(error.to_string()))?;
        self.worker
            .post_message(&value)
            .map_err(|error| WorkerClientError::Browser(js_error(&error)))
    }
}

fn js_error(value: &JsValue) -> String {
    value
        .as_string()
        .unwrap_or_else(|| format!("browser error: {value:?}"))
}
