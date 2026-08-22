//! Exact non-desktop drawer close and focus restoration.

use leptos::prelude::*;
use wasm_bindgen::JsCast as _;

use crate::app::state::AppState;

pub(super) fn focus_leaving(state: RwSignal<AppState>, event: &web_sys::FocusEvent) {
    let next = event
        .related_target()
        .and_then(|target| target.dyn_into::<web_sys::HtmlElement>().ok());
    let remains_inside = next
        .as_ref()
        .and_then(|element| element.closest("#architecture-map").ok().flatten())
        .is_some();
    if remains_inside {
        return;
    }
    close(state, false);
}

pub(super) fn close(state: RwSignal<AppState>, restore_focus: bool) {
    state.update(|current| current.ui.model_map_expanded = false);
    if restore_focus {
        focus_toggle();
    }
}

pub(super) fn focus_toggle() {
    let toggle = web_sys::window()
        .and_then(|window| window.document())
        .and_then(|document| document.query_selector(".model-map-toggle").ok().flatten())
        .and_then(|element| element.dyn_into::<web_sys::HtmlElement>().ok());
    if let Some(toggle) = toggle {
        let _result = toggle.focus();
    }
}

pub(super) fn is_non_desktop() -> bool {
    web_sys::window()
        .and_then(|window| window.inner_width().ok())
        .and_then(|width| width.as_f64())
        .is_some_and(|width| width < 1280.0)
}
