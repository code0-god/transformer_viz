//! Streaming generation task scheduling for the inference Worker.

use std::{cell::RefCell, rc::Rc};

use nanogpt_schema::{WorkerErrorCode, WorkerResponse};
use transformer_viz_web::runtime::{WorkerRuntime, error_response};
use transformer_viz_web::runtime_generation::GenerationStart;
use wasm_bindgen::{JsCast as _, JsValue, closure::Closure};
use wasm_bindgen_futures::{JsFuture, spawn_local};
use web_sys::{DedicatedWorkerGlobalScope, MessageChannel, MessageEvent};

use super::post;

async fn yield_worker_task() -> Result<(), JsValue> {
    let channel = MessageChannel::new()?;
    let receiver = channel.port1();
    let sender = channel.port2();
    let mut resolve = None;
    let promise = js_sys::Promise::new(&mut |resolver, _reject| resolve = Some(resolver));
    let Some(resolve) = resolve else {
        receiver.close();
        sender.close();
        return Err(JsValue::from_str(
            "MessageChannel resolver was not installed",
        ));
    };
    let callback = Closure::<dyn FnMut(MessageEvent)>::new(move |_event| {
        let _ignored = resolve.call0(&JsValue::UNDEFINED);
    });
    receiver.set_onmessage(Some(callback.as_ref().unchecked_ref()));
    if let Err(error) = sender.post_message(&JsValue::NULL) {
        receiver.set_onmessage(None);
        receiver.close();
        sender.close();
        return Err(error);
    }
    let result = JsFuture::from(promise).await;
    receiver.set_onmessage(None);
    receiver.close();
    sender.close();
    result.map(|_value| ())
}

pub(super) fn spawn_generation(
    scope: DedicatedWorkerGlobalScope,
    runtime: Rc<RefCell<WorkerRuntime>>,
    start: GenerationStart,
) {
    let key = start.key;
    for response in &start.responses {
        if !post(&scope, response) {
            let _abandoned = runtime.borrow_mut().fail_generation(key);
            return;
        }
    }
    spawn_local(async move {
        loop {
            let advance = {
                let mut runtime = runtime.borrow_mut();
                runtime.advance_generation(key)
            };
            let events = match advance {
                Ok(events) => events,
                Err(error) => {
                    let terminal = runtime.borrow_mut().fail_generation(key);
                    let _error_posted =
                        post(&scope, &error_response(Some(key.request_id()), &error));
                    if let Some(terminal) = terminal {
                        let _terminal_posted = post(&scope, &terminal);
                    }
                    return;
                }
            };
            if events.is_empty() {
                return;
            }
            let terminal = events
                .iter()
                .any(|event| matches!(event, WorkerResponse::GenerationFinished { .. }));
            for event in &events {
                if !post(&scope, event) {
                    let _abandoned = runtime.borrow_mut().fail_generation(key);
                    return;
                }
            }
            if terminal {
                return;
            }
            if let Err(error) = yield_worker_task().await {
                web_sys::console::error_1(&error);
                let terminal = runtime.borrow_mut().fail_generation(key);
                let _error_posted = post(
                    &scope,
                    &WorkerResponse::Error {
                        request_id: Some(key.request_id()),
                        code: WorkerErrorCode::Inference,
                        message: "생성 작업을 예약하지 못했습니다".to_owned(),
                    },
                );
                if let Some(terminal) = terminal {
                    let _terminal_posted = post(&scope, &terminal);
                }
                return;
            }
        }
    });
}
