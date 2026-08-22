//! Three-tab stage inspector with honest Phase 3 trace shells.

use leptos::prelude::*;
use nanogpt_schema::{SourceReference, TensorSnapshot};
use wasm_bindgen::JsCast as _;

use crate::app::{narrative::NarrativeStage, state::AppState, ui_state::InspectorTab};

use super::stage::stage_copy;

#[must_use]
pub(super) fn inspector(state: RwSignal<AppState>) -> impl IntoView {
    view! {
        <aside class="inspector" aria-labelledby="inspector-title">
            <div class="region-heading"><h2 id="inspector-title">"Inspector"</h2><span>"stage-linked"</span></div>
            <div class="inspector-tabs" role="tablist" aria-label="단계 검사 보기">
                {tab_button(state, InspectorTab::Explanation, "explanation", "설명")}
                {tab_button(state, InspectorTab::Tensor, "tensor", "Tensor")}
                {tab_button(state, InspectorTab::Source, "source", "Source")}
            </div>
            <section
                id="panel-explanation"
                class="inspector-panel"
                role="tabpanel"
                aria-labelledby="tab-explanation"
                hidden=move || state.get().ui.inspector_tab != InspectorTab::Explanation
            >
                {move || explanation_panel(&state.get())}
            </section>
            <section
                id="panel-tensor"
                class="inspector-panel"
                role="tabpanel"
                aria-labelledby="tab-tensor"
                hidden=move || state.get().ui.inspector_tab != InspectorTab::Tensor
            >
                {move || tensor_panel(&state.get())}
            </section>
            <section
                id="panel-source"
                class="inspector-panel"
                role="tabpanel"
                aria-labelledby="tab-source"
                hidden=move || state.get().ui.inspector_tab != InspectorTab::Source
            >
                {move || source_panel(&state.get())}
            </section>
        </aside>
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
            aria-selected=move || (state.get().ui.inspector_tab == tab).to_string()
            aria-controls=format!("panel-{id}")
            tabindex=move || if state.get().ui.inspector_tab == tab { "0" } else { "-1" }
            on:click=move |_| state.update(|current| current.ui.inspector_tab = tab)
            on:keydown=move |event| {
                let next = match event.key().as_str() {
                    "ArrowRight" => Some(next_tab(tab)),
                    "ArrowLeft" => Some(previous_tab(tab)),
                    "Home" => Some(InspectorTab::Explanation),
                    "End" => Some(InspectorTab::Source),
                    _ => None,
                };
                if let Some(next) = next {
                    event.prevent_default();
                    state.update(|current| current.ui.inspector_tab = next);
                    focus_tab(next);
                }
            }
        >{label}</button>
    }
}

fn explanation_panel(state: &AppState) -> AnyView {
    let copy = stage_copy(state.ui.narrative.stage);
    view! {
        <article class="inspector-copy">
            <h3>{copy.title}</h3>
            <p>{copy.purpose}</p>
            <code>{copy.formula}</code>
            <p>{copy.bridge}</p>
        </article>
    }
    .into_any()
}

fn tensor_panel(state: &AppState) -> AnyView {
    selected_tensor(state).map_or_else(
        || view! { <p class="empty-state">"현재 단계의 실제 tensor가 준비되면 stable ID와 shape를 표시합니다."</p> }.into_any(),
        |tensor| {
            let preview = tensor.values.iter().take(6).map(|value| format!("{:.5}", value.get())).collect::<Vec<_>>().join(", ");
            view! {
                <div class="inspector-tensor">
                    <dl><div><dt>"stable id"</dt><dd><code>{tensor.id.clone()}</code></dd></div><div><dt>"label"</dt><dd>{tensor.label.clone()}</dd></div><div><dt>"shape"</dt><dd><code>{format!("{:?}", tensor.shape)}</code></dd></div><div><dt>"dtype"</dt><dd><code>"f32"</code></dd></div></dl>
                    <p>"앞쪽 실제 값"</p><code class="value-preview">{format!("[{preview}]")}</code>
                </div>
            }.into_any()
        },
    )
}

fn source_panel(state: &AppState) -> AnyView {
    selected_source(state).map_or_else(
        || view! { <p class="empty-state">"현재 단계와 연결된 실제 trace가 준비되면 고정 source 위치를 표시합니다."</p> }.into_any(),
        |source| view! {
            <div class="source-shell">
                <span>"pinned nanoGPT correspondence"</span>
                <code>{source.symbol}</code>
                <dl><div><dt>"file"</dt><dd><code>{source.file}</code></dd></div><div><dt>"lines"</dt><dd><code>{format!("{}–{}", source.start_line, source.end_line)}</code></dd></div></dl>
                <p>"Phase 5에서 현재 단계의 전체 원문과 Rust 대응 범위를 동기화합니다."</p>
            </div>
        }.into_any(),
    )
}

fn selected_tensor(state: &AppState) -> Option<TensorSnapshot> {
    match state.ui.narrative.stage {
        NarrativeStage::Embedding => state
            .summary
            .as_ref()
            .map(|summary| summary.embeddings.sum.clone()),
        NarrativeStage::AttentionLayerNorm => operation_tensor(state),
        NarrativeStage::QueryKeyValue => state.attention.as_ref().map(|trace| trace.query.clone()),
        NarrativeStage::AttentionScores => state
            .attention
            .as_ref()
            .map(|trace| trace.scaled_scores.clone()),
        NarrativeStage::CausalMask | NarrativeStage::Softmax => state
            .attention
            .as_ref()
            .map(|trace| trace.probabilities.clone()),
        NarrativeStage::ValueAggregation => {
            state.attention.as_ref().map(|trace| trace.output.clone())
        }
        NarrativeStage::MlpAndResidual => state.block.as_ref().map(|trace| trace.output.clone()),
        NarrativeStage::LanguageModelHead => state
            .summary
            .as_ref()
            .map(|summary| summary.logits.logits.clone()),
    }
}

fn selected_source(state: &AppState) -> Option<SourceReference> {
    match state.ui.narrative.stage {
        NarrativeStage::Embedding => state
            .summary
            .as_ref()
            .map(|summary| summary.embeddings.source.clone()),
        NarrativeStage::AttentionLayerNorm => operation_source(state),
        NarrativeStage::QueryKeyValue
        | NarrativeStage::AttentionScores
        | NarrativeStage::CausalMask
        | NarrativeStage::Softmax
        | NarrativeStage::ValueAggregation => {
            state.attention.as_ref().map(|trace| trace.source.clone())
        }
        NarrativeStage::MlpAndResidual => {
            state.block.as_ref().map(|trace| trace.mlp.source.clone())
        }
        NarrativeStage::LanguageModelHead => state
            .summary
            .as_ref()
            .map(|summary| summary.logits.source.clone()),
    }
}

fn operation_tensor(state: &AppState) -> Option<TensorSnapshot> {
    let index = state.ui.detail_operation?;
    state
        .block
        .as_ref()?
        .operations
        .get(index)
        .map(|operation| operation.tensor.clone())
}

fn operation_source(state: &AppState) -> Option<SourceReference> {
    let index = state.ui.detail_operation?;
    state
        .block
        .as_ref()?
        .operations
        .get(index)
        .map(|operation| operation.source.clone())
}

const fn next_tab(tab: InspectorTab) -> InspectorTab {
    match tab {
        InspectorTab::Explanation => InspectorTab::Tensor,
        InspectorTab::Tensor => InspectorTab::Source,
        InspectorTab::Source => InspectorTab::Explanation,
    }
}

const fn previous_tab(tab: InspectorTab) -> InspectorTab {
    match tab {
        InspectorTab::Explanation => InspectorTab::Source,
        InspectorTab::Tensor => InspectorTab::Explanation,
        InspectorTab::Source => InspectorTab::Tensor,
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
