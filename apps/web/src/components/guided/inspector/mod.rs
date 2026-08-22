//! Synchronized explanation, tensor, and pinned-source Inspector.

mod details;
mod explanation;
mod source;
mod tabs;
mod tensor;

use leptos::prelude::*;
use nanogpt_schema::{OperationId, OperationTrace, TensorSnapshot};

use crate::{
    app::{
        architecture::SummaryEvidence, narrative::NarrativeStage, state::AppState,
        ui_state::InspectorTab,
    },
    trace_lookup::TraceLookup,
};

pub(super) struct TensorSelection<'a> {
    pub tensor: &'a TensorSnapshot,
    pub operation: OperationId,
}

#[must_use]
pub(super) fn inspector(state: RwSignal<AppState>) -> impl IntoView {
    Effect::new(move |_| {
        let Some((feature, width)) = state.with(|current| {
            selected_tensor(current)
                .ok()
                .and_then(|selection| feature_width(selection.tensor))
                .map(|width| (current.ui.selected_feature, width))
        }) else {
            return;
        };
        if feature >= width {
            state.update(|next| {
                let _selected = next.ui.select_feature(feature, width);
            });
        }
    });
    view! {
        <aside class="inspector" aria-labelledby="inspector-title">
            <div class="region-heading"><h2 id="inspector-title">"Inspector"</h2><span>"stage-linked"</span></div>
            {tabs::tab_list(state)}
            {details::detail_operations(state)}
            <section id="panel-explanation" class="inspector-panel" role="tabpanel" aria-labelledby="tab-explanation" hidden=move || state.with(|current| current.ui.inspector_tab != InspectorTab::Explanation)>
                {move || state.with(explanation::panel)}
            </section>
            <section id="panel-tensor" class="inspector-panel" role="tabpanel" aria-labelledby="tab-tensor" hidden=move || state.with(|current| current.ui.inspector_tab != InspectorTab::Tensor)>
                {move || state.with(|current| tensor::panel(state, current))}
            </section>
            <section id="panel-source" class="inspector-panel" role="tabpanel" aria-labelledby="tab-source" hidden=move || state.with(|current| current.ui.inspector_tab != InspectorTab::Source)>
                {move || state.with(source::panel)}
            </section>
        </aside>
    }
}

pub(super) fn selected_tensor(state: &AppState) -> Result<TensorSelection<'_>, String> {
    let architecture = state.ui.architecture.operation.ok_or_else(|| {
        "아키텍처 연산을 선택하면 연결된 실제 tensor trace를 표시합니다.".to_owned()
    })?;
    if let Some(evidence) = architecture.summary_evidence() {
        let summary = state
            .summary
            .as_ref()
            .ok_or_else(|| "실행 후 실제 summary tensor를 표시합니다.".to_owned())?;
        return Ok(match evidence {
            SummaryEvidence::FinalLayerNorm => TensorSelection {
                tensor: &summary.final_layer_norm,
                operation: OperationId::FinalLayerNorm,
            },
            SummaryEvidence::Logits => TensorSelection {
                tensor: &summary.logits.logits,
                operation: OperationId::Logits,
            },
        });
    }
    if architecture.target().is_none() {
        return Err("이 생성 경계에는 연결된 실제 tensor trace ID가 없습니다.".to_owned());
    }
    if let Some(operation) = selected_operation(state) {
        let lookup = lookup(state);
        let tensor = match operation.operation {
            OperationId::QueryKeyValue | OperationId::Attention => lookup
                .head_tensor(&operation.tensor.id)
                .or_else(|_| lookup.operation_tensor(operation.operation, &operation.tensor.id)),
            OperationId::Embedding
            | OperationId::AttentionLayerNorm
            | OperationId::AttentionResidual
            | OperationId::MlpLayerNorm
            | OperationId::Mlp
            | OperationId::MlpResidual
            | OperationId::FinalLayerNorm
            | OperationId::Logits => {
                lookup.operation_tensor(operation.operation, &operation.tensor.id)
            }
        };
        return tensor
            .map(|tensor| TensorSelection {
                tensor,
                operation: operation.operation,
            })
            .map_err(|error| error.to_string());
    }
    let selection = match state.ui.narrative.stage {
        NarrativeStage::Embedding => state.summary.as_ref().map(|summary| TensorSelection {
            tensor: &summary.embeddings.sum,
            operation: OperationId::Embedding,
        }),
        NarrativeStage::Softmax => state.attention.as_ref().map(|trace| TensorSelection {
            tensor: &trace.probabilities,
            operation: OperationId::Attention,
        }),
        NarrativeStage::LanguageModelHead => None,
        NarrativeStage::AttentionLayerNorm
        | NarrativeStage::QueryKeyValue
        | NarrativeStage::AttentionScores
        | NarrativeStage::CausalMask
        | NarrativeStage::ValueAggregation
        | NarrativeStage::MlpAndResidual => None,
    };
    selection.ok_or_else(|| "현재 단계의 실제 tensor trace가 아직 준비되지 않았습니다.".to_owned())
}

pub(super) fn selected_operation(state: &AppState) -> Option<&OperationTrace> {
    let index = state.ui.detail_operation?;
    if NarrativeStage::for_detail_operation(index) != Some(state.ui.narrative.stage) {
        return None;
    }
    let operation = state.block.as_ref()?.operations.get(index)?;
    state.block.as_ref()?.operations.iter().find(|candidate| {
        candidate.operation == operation.operation && candidate.tensor.id == operation.tensor.id
    })
}

pub(super) fn feature_width(tensor: &TensorSnapshot) -> Option<usize> {
    match tensor.shape.len() {
        1 | 3 => tensor.shape.last().copied(),
        4 if !tensor.id.contains("score") && !tensor.id.contains("probabil") => {
            tensor.shape.last().copied()
        }
        0 | 2 | 4 | 5.. => None,
    }
}

fn lookup(state: &AppState) -> TraceLookup<'_> {
    let mut lookup = TraceLookup::new();
    if let Some(summary) = state.summary.as_ref() {
        lookup = lookup.with_summary(summary);
    }
    if let Some(block) = state.block.as_ref() {
        lookup = lookup.with_block(block);
    }
    if let Some(head) = state.attention.as_ref() {
        lookup = lookup.with_head(head);
    }
    if let Some(token) = state.token.as_ref() {
        lookup = lookup.with_token(token);
    }
    lookup
}
