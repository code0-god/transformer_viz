//! Accessible roving Inspector tabs.

use leptos::prelude::*;
use wasm_bindgen::JsCast as _;

use crate::app::{state::AppState, ui_state::InspectorTab};

pub(super) fn tab_list(state: RwSignal<AppState>) -> impl IntoView {
    view! {
        <div class="inspector-tabs" role="tablist" aria-label="단계 검사 보기">
            {tab_button(state, InspectorTab::Explanation, "explanation", "설명")}
            {tab_button(state, InspectorTab::Tensor, "tensor", "Tensor")}
            {tab_button(state, InspectorTab::Source, "source", "Source")}
        </div>
    }
}

fn tab_button(
    state: RwSignal<AppState>,
    tab: InspectorTab,
    id: &'static str,
    label: &'static str,
) -> impl IntoView {
    view! {
        <button
            id=format!("tab-{id}")
            type="button"
            role="tab"
                    aria-selected=move || state.with(|current| (current.ui.inspector_tab == tab).to_string())
            aria-controls=format!("panel-{id}")
                    tabindex=move || state.with(|current| if current.ui.inspector_tab == tab { "0" } else { "-1" })
            on:click=move |_| state.update(|current| current.ui.inspector_tab = tab)
            on:keydown=move |event| {
                if let Some(next) = tab.after_key(&event.key()) {
                    event.prevent_default();
                    state.update(|current| current.ui.inspector_tab = next);
                    focus_tab(next);
                }
            }
        >{label}</button>
    }
}

fn focus_tab(tab: InspectorTab) {
    let id = match tab {
        InspectorTab::Explanation => "tab-explanation",
        InspectorTab::Tensor => "tab-tensor",
        InspectorTab::Source => "tab-source",
    };
    if let Some(element) = web_sys::window()
        .and_then(|window| window.document())
        .and_then(|document| document.get_element_by_id(id))
        .and_then(|element| element.dyn_into::<web_sys::HtmlElement>().ok())
    {
        let _result = element.focus();
    }
}
