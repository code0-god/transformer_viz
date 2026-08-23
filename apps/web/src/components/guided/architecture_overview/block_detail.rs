//! Config-driven Transformer Block detail surface.

use leptos::prelude::*;
use nanogpt_schema::ModelMetadata;

mod diagram;

use crate::app::{
    architecture_overview::{
        ArchitectureNodeId, ArchitectureOverviewState, architecture_block_layers,
    },
    notation::notation_for,
    state::AppState,
};

use super::node::ArchitectureInteraction;
use diagram::block_detail_diagram;

pub(super) fn block_detail(
    model: &ModelMetadata,
    state: RwSignal<AppState>,
    overview: ArchitectureOverviewState,
) -> impl IntoView {
    let layer_count = model.config.n_layer;
    let selected_layer = overview.selected_layer();
    let interaction = ArchitectureInteraction::new(
        state,
        layer_count,
        model.config.n_head,
        overview.selected_node(),
    );

    view! {
        <section
            class="architecture-detail"
            data-testid="architecture-detail"
            data-selected-layer=selected_layer
            aria-labelledby="architecture-title"
        >
            <div class="architecture-detail-toolbar">
                <div>
                    <p class="architecture-detail-kicker">"Pre-LN Decoder Block"</p>
                    <p>
                        {format!(
                            "동일한 Block이 현재 모델에서 {layer_count}회 순차적으로 적용됩니다."
                        )}
                    </p>
                </div>
                <fieldset class="architecture-layer-selector">
                    <legend>"Layer"</legend>
                    <div>
                        {architecture_block_layers(layer_count)
                            .map(|layer| {
                                view! {
                                    <button
                                        type="button"
                                        class:selected=layer == selected_layer
                                        aria-pressed=if layer == selected_layer { "true" } else { "false" }
                                        data-layer-index=layer
                                        on:click=move |_| {
                                            state.update(|current| {
                                                current
                                                    .ui
                                                    .architecture_overview
                                                    .select_layer(layer, layer_count);
                                            });
                                        }
                                    >
                                        {layer}
                                    </button>
                                }
                            })
                            .collect_view()}
                    </div>
                </fieldset>
            </div>
            <div class="architecture-visual-grid architecture-detail-grid">
                {block_detail_diagram(interaction)}
                {block_detail_annotation(layer_count, selected_layer)}
            </div>
        </section>
    }
}

fn block_detail_annotation(layer_count: usize, selected_layer: usize) -> impl IntoView {
    let operation_ids = [
        ArchitectureNodeId::LayerNorm1,
        ArchitectureNodeId::SelfAttention,
        ArchitectureNodeId::Residual1,
        ArchitectureNodeId::LayerNorm2,
        ArchitectureNodeId::Mlp,
        ArchitectureNodeId::Residual2,
    ];
    view! {
        <aside class="architecture-annotation architecture-detail-annotation">
            <h3>"Transformer Block"</h3>
            <p class="architecture-detail-layer">
                <span>"현재 모델"</span>
                <strong>{format!("n_layer = {layer_count}")}</strong>
                <span>{format!("선택 Layer {selected_layer}")}</span>
            </p>
            <ol>
                {operation_ids
                    .into_iter()
                    .filter_map(notation_for)
                    .map(|entry| view! { <li>{entry.title}</li> })
                    .collect_view()}
            </ol>
            <div class="architecture-detail-formulas">
                <span>"수식"</span>
                {operation_ids
                    .into_iter()
                    .filter_map(notation_for)
                    .map(|entry| view! { <code>{entry.formula}</code> })
                    .collect_view()}
            </div>
        </aside>
    }
}
