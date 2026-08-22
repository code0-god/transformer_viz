//! Dominant learning canvas linked to narrative and architecture focus.

use leptos::prelude::*;

use crate::app::{
    narrative::NarrativeStage, state::AppState, ui_state::ExplorerMode, worker_client::WorkerClient,
};

use super::{
    stage_copy::{focus_bridge, focus_formula, focus_purpose, focus_title},
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

const fn evidence_title(state: &AppState) -> &'static str {
    match state.ui.architecture.operation {
        Some(operation)
            if visuals::generation_sampling::is_generation_sampling_operation(operation) =>
        {
            "선택한 생성 step 증거"
        }
        Some(_) => "현재 trace 증거",
        None => "구조와 설정",
    }
}

fn stage_evidence(state: RwSignal<AppState>, client: &WorkerClient) -> AnyView {
    if state.with(|current| {
        current.ui.mode == ExplorerMode::Guided
            && current.ui.narrative.stage.index() <= NarrativeStage::Logits.index()
    }) {
        return visuals::stage_visual(state, client);
    }
    match state.with(|current| current.ui.architecture.operation) {
        Some(operation)
            if visuals::generation_sampling::is_generation_sampling_operation(operation) =>
        {
            state.with(|current| visuals::generation_sampling::visual(current, operation))
        }
        Some(_) => visuals::stage_visual(state, client),
        None => level_orientation(state),
    }
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

fn coordinate_label(state: &AppState) -> String {
    format!(
        "L{} · H{} · q{} · k{}",
        state.selection.layer, state.selection.head, state.selection.token, state.selection.key
    )
}
