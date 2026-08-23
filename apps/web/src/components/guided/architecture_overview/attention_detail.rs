//! Config-driven Self-Attention architecture surface.

use leptos::prelude::*;
use nanogpt_schema::ModelMetadata;

mod annotation;
mod diagram;

use crate::app::{
    architecture_overview::{
        ArchitectureOverviewState, architecture_attention_heads, architecture_block_layers,
    },
    notation::{CurrentAttentionShapes, current_sequence_length},
    state::AppState,
};

use super::node::ArchitectureInteraction;
use annotation::attention_annotation;
use diagram::attention_detail_diagram;

pub(super) fn attention_detail(
    model: &ModelMetadata,
    state: RwSignal<AppState>,
    overview: ArchitectureOverviewState,
) -> AnyView {
    let config = &model.config;
    let sequence_length = state.with(current_sequence_length);
    let Some(shapes) =
        CurrentAttentionShapes::from_config(config.n_embd, config.n_head, sequence_length)
    else {
        return view! {
            <p class="architecture-error" role="alert">
                "Self-Attention shape을 구성할 수 없는 model config입니다."
            </p>
        }
        .into_any();
    };
    let selected_layer = overview.selected_layer();
    let selected_head = overview.selected_head();
    let interaction = ArchitectureInteraction::new(
        state,
        config.n_layer,
        config.n_head,
        overview.selected_node(),
    );

    view! {
        <section
            class="architecture-detail architecture-attention-detail"
            data-testid="attention-detail"
            data-selected-layer=selected_layer
            data-selected-head=selected_head
            aria-labelledby="architecture-title"
        >
            <div class="architecture-detail-toolbar architecture-attention-toolbar">
                <div>
                    <p class="architecture-detail-kicker">
                        "Causal Multi-Head Self-Attention"
                    </p>
                    <p>
                        "하나의 combined QKV projection에서 head별 score와 value output을 계산합니다."
                    </p>
                </div>
                <div class="architecture-attention-selectors">
                    {layer_selector(state, config.n_layer, selected_layer)}
                    {head_selector(state, config.n_head, selected_head)}
                </div>
            </div>
            <div class="architecture-visual-grid architecture-attention-grid">
                {attention_detail_diagram(interaction)}
                {attention_annotation(
                    shapes,
                    selected_layer,
                    selected_head,
                    overview.selected_node(),
                )}
            </div>
        </section>
    }
    .into_any()
}

fn layer_selector(
    state: RwSignal<AppState>,
    layer_count: usize,
    selected_layer: usize,
) -> impl IntoView {
    view! {
        <fieldset class="architecture-layer-selector">
            <legend>"Layer"</legend>
            <div>
                {architecture_block_layers(layer_count)
                    .map(|layer| view! {
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
                    })
                    .collect_view()}
            </div>
        </fieldset>
    }
}

fn head_selector(
    state: RwSignal<AppState>,
    head_count: usize,
    selected_head: usize,
) -> impl IntoView {
    view! {
        <fieldset class="architecture-layer-selector architecture-head-selector">
            <legend>"Head"</legend>
            <div>
                {architecture_attention_heads(head_count)
                    .map(|head| view! {
                        <button
                            type="button"
                            class:selected=head == selected_head
                            aria-pressed=if head == selected_head { "true" } else { "false" }
                            data-head-index=head
                            on:click=move |_| {
                                state.update(|current| {
                                    current
                                        .ui
                                        .architecture_overview
                                        .select_head(head, head_count);
                                });
                            }
                        >
                            {head}
                        </button>
                    })
                    .collect_view()}
            </div>
        </fieldset>
    }
}
