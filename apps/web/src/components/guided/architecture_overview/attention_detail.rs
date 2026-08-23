//! Config-driven Self-Attention architecture surface.

use leptos::prelude::*;
use nanogpt_schema::ModelMetadata;

mod diagram;

use crate::app::{
    architecture_overview::{
        ArchitectureNodeId, ArchitectureOverviewState, AttentionArchitectureMetadata,
        architecture_attention_heads, architecture_block_layers,
    },
    state::AppState,
};

use super::node::ArchitectureInteraction;
use diagram::attention_detail_diagram;

pub(super) fn attention_detail(
    model: &ModelMetadata,
    state: RwSignal<AppState>,
    overview: ArchitectureOverviewState,
) -> AnyView {
    let config = &model.config;
    let Some(metadata) = AttentionArchitectureMetadata::from_config(config.n_embd, config.n_head)
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
                {attention_detail_diagram(interaction, metadata)}
                {attention_annotation(metadata, selected_layer, selected_head, overview.selected_node())}
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

fn attention_annotation(
    metadata: AttentionArchitectureMetadata,
    selected_layer: usize,
    selected_head: usize,
    selected_node: Option<ArchitectureNodeId>,
) -> impl IntoView {
    let operation = selected_node.and_then(operation_copy);
    view! {
        <aside class="architecture-annotation architecture-attention-annotation">
            <h3>"Self-Attention"</h3>
            <dl class="architecture-attention-facts">
                <div><dt>"현재 Layer"</dt><dd>{selected_layer}</dd></div>
                <div><dt>"현재 Head"</dt><dd>{selected_head}</dd></div>
                <div><dt>"Heads"</dt><dd>{metadata.head_count()}</dd></div>
                <div><dt>"Head dimension"</dt><dd>{metadata.head_dimension()}</dd></div>
                <div><dt>"Input"</dt><dd>"[T, C]"</dd></div>
                <div><dt>"Q / K / V"</dt><dd>"[H, T, D]"</dd></div>
                <div><dt>"Scores"</dt><dd>"[H, T, T]"</dd></div>
                <div><dt>"Output"</dt><dd>"[T, C]"</dd></div>
            </dl>
            <div class="architecture-attention-formula">
                <span>"핵심 계산"</span>
                <code>
                    "Attention(Q,K,V) = softmax(QKᵀ / √D + causal mask) V"
                </code>
            </div>
            {operation.map(|(title, description)| view! {
                <div class="architecture-attention-operation" data-testid="attention-operation-copy">
                    <span>"현재 연산"</span>
                    <strong>{title}</strong>
                    <p>{description}</p>
                </div>
            })}
        </aside>
    }
}

const fn operation_copy(node: ArchitectureNodeId) -> Option<(&'static str, &'static str)> {
    match node {
        ArchitectureNodeId::AttentionQkvProjection => Some((
            "QKV Projection",
            "하나의 Linear C → 3C 연산이 Q, K, V를 함께 만든 뒤 세 갈래로 나눕니다.",
        )),
        ArchitectureNodeId::AttentionQuery => {
            Some(("Query Q", "현재 token이 찾는 정보를 표현합니다."))
        }
        ArchitectureNodeId::AttentionKey => {
            Some(("Key K", "각 token이 가진 검색 기준을 표현합니다."))
        }
        ArchitectureNodeId::AttentionValue => {
            Some(("Value V", "attention probability로 모을 내용을 표현합니다."))
        }
        ArchitectureNodeId::AttentionScores => Some((
            "Q × Kᵀ",
            "Query와 Key의 유사도를 [T, T] score로 계산합니다.",
        )),
        ArchitectureNodeId::AttentionScale => Some((
            "Scale",
            "score를 1 / √D로 나눠 softmax가 과도하게 포화되지 않게 합니다.",
        )),
        ArchitectureNodeId::AttentionCausalMask => {
            Some(("Causal Mask", "현재 token 이후 위치의 score를 차단합니다."))
        }
        ArchitectureNodeId::AttentionSoftmax => Some((
            "Softmax",
            "허용된 score를 attention probability로 정규화합니다.",
        )),
        ArchitectureNodeId::AttentionValueAggregation => {
            Some(("× V", "attention probability로 Value를 가중합합니다."))
        }
        ArchitectureNodeId::AttentionMergeHeads => Some((
            "Merge Heads",
            "모든 head output을 다시 model width C로 결합합니다.",
        )),
        ArchitectureNodeId::AttentionOutputProjection => Some((
            "Output Projection",
            "c_proj Linear C → C로 최종 attention output을 만듭니다.",
        )),
        _ => None,
    }
}
