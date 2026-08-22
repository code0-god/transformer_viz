//! Dominant learning canvas linked to narrative and architecture focus.

use leptos::prelude::*;

use crate::app::{
    architecture::ArchitectureOperation, state::AppState, worker_client::WorkerClient,
};

use super::{
    architecture::operation_slug,
    stage_copy::{focus_bridge, focus_formula, focus_purpose, focus_title, operation_label},
    visuals,
};

#[must_use]
pub(super) fn main_stage(state: RwSignal<AppState>, client: WorkerClient) -> impl IntoView {
    view! {
        <main id="main-stage" class="stage-canvas" data-testid="main-stage" tabindex="-1">
            <div class="stage-heading" aria-live="polite">
                <span class="stage-position">{move || state.with(stage_position)}</span>
                <h2>{move || state.with(focus_title)}</h2>
                <p>{move || state.with(focus_purpose)}</p>
            </div>
            <div class="formula-band"><span>"formula"</span><code>{move || state.with(focus_formula)}</code></div>
            <section class="trace-evidence" aria-labelledby="trace-evidence-title">
                <div class="evidence-heading"><h3 id="trace-evidence-title">{move || state.with(evidence_title)}</h3><span>{move || state.with(coordinate_label)}</span></div>
                {move || stage_evidence(state, &client)}
            </section>
            <p class="stage-bridge">{move || state.with(focus_bridge)}</p>
        </main>
    }
}

fn stage_position(state: &AppState) -> String {
    format!(
        "{} · L{} · H{}",
        state.ui.architecture.level.slug(),
        state.selection.layer,
        state.selection.head
    )
}

fn evidence_title(state: &AppState) -> &'static str {
    match state.ui.architecture.operation {
        Some(operation) if operation.target().is_some() => "현재 trace 증거",
        Some(_) | None => "구조와 설정",
    }
}

fn stage_evidence(state: RwSignal<AppState>, client: &WorkerClient) -> AnyView {
    match state.with(|current| current.ui.architecture.operation) {
        Some(operation) if operation.target().is_none() => generation_orientation(state, operation),
        Some(_) => visuals::stage_visual(state, client),
        None => level_orientation(state),
    }
}

fn generation_orientation(state: RwSignal<AppState>, selected: ArchitectureOperation) -> AnyView {
    let config = state.with(|current| current.model.as_ref().map(|model| model.config.clone()));
    view! {
        <div class="architecture-orientation" data-operation=operation_slug(selected)>
            <ol aria-label="Generation 연산 순서">
                {generation_operations().into_iter().map(|operation| view! {
                    <li aria-current=(operation == selected).then_some("step")>{operation_label(operation)}</li>
                }).collect_view()}
            </ol>
            {config.map(|config| view! {
                <dl class="orientation-ledger">
                    <div><dt>"context limit"</dt><dd>{config.block_size}</dd></div>
                    <div><dt>"vocabulary"</dt><dd>{config.vocab_size}</dd></div>
                    <div><dt>"forward depth"</dt><dd>{config.n_layer}</dd></div>
                </dl>
            })}
        </div>
    }.into_any()
}

fn level_orientation(state: RwSignal<AppState>) -> AnyView {
    let facts = state.with(|current| {
        current.model.as_ref().map(|model| {
            let config = &model.config;
            (
                current.ui.architecture.level.slug(),
                config.n_layer,
                config.n_head,
                config.n_embd,
                config.n_embd / config.n_head,
            )
        })
    });
    view! {
        <div class="architecture-orientation" data-operation="level-overview">
            {facts.map(|(level, layers, heads, width, head_width)| view! {
                <dl class="orientation-ledger">
                    <div><dt>"level"</dt><dd>{level}</dd></div>
                    <div><dt>"blocks"</dt><dd>{layers}</dd></div>
                    <div><dt>"heads"</dt><dd>{heads}</dd></div>
                    <div><dt>"d_model"</dt><dd>{width}</dd></div>
                    <div><dt>"d_head"</dt><dd>{head_width}</dd></div>
                </dl>
            })}
        </div>
    }
    .into_any()
}

const fn generation_operations() -> [ArchitectureOperation; 7] {
    [
        ArchitectureOperation::Logits,
        ArchitectureOperation::Temperature,
        ArchitectureOperation::TopK,
        ArchitectureOperation::GenerationSoftmax,
        ArchitectureOperation::Sample,
        ArchitectureOperation::Append,
        ArchitectureOperation::Repeat,
    ]
}

fn coordinate_label(state: &AppState) -> String {
    format!(
        "L{} · H{} · q{} · k{}",
        state.selection.layer, state.selection.head, state.selection.token, state.selection.key
    )
}
