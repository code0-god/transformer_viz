//! Collapsed current-stage operation disclosure.

use leptos::prelude::*;

use crate::app::{narrative::NarrativeStage, state::AppState, ui_state::InspectorTab};

pub(super) fn detail_operations(state: RwSignal<AppState>) -> impl IntoView {
    view! {
        <details class="detail-operations" data-testid="detail-operations" open=move || state.get().ui.inspector_tab != InspectorTab::Explanation>
            <summary>"세부 연산" <span>{move || detail_count(&state.get())}</span></summary>
            <div class="detail-operation-list">
                {move || operation_buttons(state, &state.get())}
            </div>
        </details>
    }
}

fn detail_count(state: &AppState) -> String {
    let count = state.block.as_ref().map_or(0, |block| {
        block
            .operations
            .iter()
            .enumerate()
            .filter(|(index, _)| {
                NarrativeStage::for_detail_operation(*index) == Some(state.ui.narrative.stage)
            })
            .count()
    });
    format!("{count}개")
}

fn operation_buttons(state: RwSignal<AppState>, current: &AppState) -> AnyView {
    let Some(block) = current.block.as_ref() else {
        return view! { <p class="empty-state">"실행 후 현재 단계의 실제 세부 연산을 펼쳐 봅니다."</p> }.into_any();
    };
    let stage = current.ui.narrative.stage;
    let selected = current.ui.detail_operation;
    let operations = block.operations.iter().enumerate().filter(|(index, _)| {
        NarrativeStage::for_detail_operation(*index) == Some(stage)
    }).map(|(index, operation)| {
        let tensor_id = operation.tensor.id.clone();
        let event_id = tensor_id.clone();
        let label = operation.tensor.label.clone();
        let shape = format!("{:?}", operation.tensor.shape);
        view! {
            <button
                id=format!("detail-operation-{tensor_id}")
                type="button"
                data-detail-tensor-id=tensor_id
                aria-pressed=(selected == Some(index)).to_string()
                on:click=move |_| state.update(|next| {
                    let matches_id = next.block.as_ref().and_then(|trace| trace.operations.get(index)).is_some_and(|candidate| candidate.tensor.id == event_id);
                    if matches_id { let _selected = next.ui.select_detail_operation(index); }
                })
            ><span>{label}</span><code>{shape}</code></button>
        }
    }).collect_view();
    view! { {operations} }.into_any()
}
