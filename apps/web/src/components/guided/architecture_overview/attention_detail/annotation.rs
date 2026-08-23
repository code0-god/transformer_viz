//! Canonical symbol, current-value, and selected-operation explanation.

use leptos::prelude::*;

use crate::app::{
    architecture_overview::ArchitectureNodeId,
    notation::{
        ATTENTION_INPUT_DEFINITION, ATTENTION_SUMMARY, CurrentAttentionShapes,
        attention_symbol_definitions, notation_for, symbolic_shape,
    },
};

pub(super) fn attention_annotation(
    shapes: CurrentAttentionShapes,
    selected_layer: usize,
    selected_head: usize,
    selected_node: Option<ArchitectureNodeId>,
) -> impl IntoView {
    let sequence_length = shapes
        .sequence_length()
        .map_or_else(|| "—".to_owned(), |value| value.to_string());
    let full_head_shape = shapes
        .full_head_tensor()
        .unwrap_or_else(|| "실행 후 표시".to_owned());
    let head_shape = shapes
        .head_tensor()
        .unwrap_or_else(|| "실행 후 표시".to_owned());
    let scale_factor = shapes
        .scale_factor()
        .map_or_else(|| "—".to_owned(), |value| value.to_string());
    view! {
        <aside class="architecture-annotation architecture-attention-annotation">
            <h3>"Self-Attention"</h3>
            <p class="architecture-attention-input-definition">{ATTENTION_INPUT_DEFINITION}</p>
            <section class="architecture-notation-section" aria-labelledby="attention-symbols-title">
                <h4 id="attention-symbols-title">"A. 기호"</h4>
                <dl class="architecture-attention-symbols">
                    {attention_symbol_definitions()
                        .map(|definition| view! {
                            <div>
                                <dt>{definition.symbol}</dt>
                                <dd>{definition.meaning}</dd>
                            </div>
                        })
                        .collect_view()}
                </dl>
            </section>
            <section class="architecture-notation-section" aria-labelledby="attention-current-title">
                <h4 id="attention-current-title">"B. 현재 모델값"</h4>
                <dl class="architecture-attention-facts">
                    {fact("Layer", selected_layer.to_string())}
                    {fact("Head", selected_head.to_string())}
                    {fact("T", sequence_length)}
                    {fact("C", shapes.model_width().to_string())}
                    {fact("H", shapes.head_count().to_string())}
                    {fact("D", shapes.head_dimension().to_string())}
                    {fact("1 / √D", scale_factor)}
                    {fact("Q / K / V", head_shape)}
                    {fact("Full Q / K / V", full_head_shape)}
                </dl>
            </section>
            <section class="architecture-notation-section" aria-labelledby="attention-operation-title">
                <h4 id="attention-operation-title">"C. 현재 연산"</h4>
                {operation_detail(shapes, selected_node)}
            </section>
        </aside>
    }
}

fn fact(label: &'static str, value: String) -> impl IntoView {
    view! {
        <div>
            <dt>{label}</dt>
            <dd>{value}</dd>
        </div>
    }
}

fn operation_detail(
    shapes: CurrentAttentionShapes,
    selected_node: Option<ArchitectureNodeId>,
) -> AnyView {
    let operation = selected_node
        .filter(|node| is_attention_operation(*node))
        .and_then(notation_for);
    if let Some(entry) = operation {
        let current_shape = shapes
            .current_shape(entry.id)
            .unwrap_or_else(|| "실행 후 표시".to_owned());
        let mask_conditions = (entry.id == ArchitectureNodeId::AttentionCausalMask).then(|| {
            view! {
                <div class="architecture-mask-conditions">
                    <code>"j ≤ i: score 유지"</code>
                    <code>"j > i: 차단"</code>
                </div>
            }
        });
        return view! {
            <div
                class="architecture-attention-operation"
                data-testid="attention-operation-copy"
            >
                <strong>{entry.title}</strong>
                <code aria-label=entry.accessible_name>{entry.formula}</code>
                <p>{entry.description}</p>
                <span>"Symbolic shape"</span>
                <code>{symbolic_shape(entry)}</code>
                <span>"Current shape"</span>
                <code>{current_shape}</code>
                {mask_conditions}
            </div>
        }
        .into_any();
    }

    let flow_ids = [
        ArchitectureNodeId::AttentionScores,
        ArchitectureNodeId::AttentionScale,
        ArchitectureNodeId::AttentionCausalMask,
        ArchitectureNodeId::AttentionSoftmax,
        ArchitectureNodeId::AttentionValueAggregation,
    ];
    view! {
        <div class="architecture-attention-operation architecture-attention-flow-formulas">
            <strong>"Self-Attention flow"</strong>
            {flow_ids
                .into_iter()
                .filter_map(notation_for)
                .map(|entry| view! {
                    <code aria-label=entry.accessible_name>{entry.formula}</code>
                })
                .collect_view()}
            <span>"한 줄 요약"</span>
            <code>{ATTENTION_SUMMARY}</code>
        </div>
    }
    .into_any()
}

const fn is_attention_operation(node: ArchitectureNodeId) -> bool {
    matches!(
        node,
        ArchitectureNodeId::AttentionQkvProjection
            | ArchitectureNodeId::AttentionQuery
            | ArchitectureNodeId::AttentionKey
            | ArchitectureNodeId::AttentionValue
            | ArchitectureNodeId::AttentionScores
            | ArchitectureNodeId::AttentionScale
            | ArchitectureNodeId::AttentionCausalMask
            | ArchitectureNodeId::AttentionSoftmax
            | ArchitectureNodeId::AttentionValueAggregation
            | ArchitectureNodeId::AttentionMergeHeads
            | ArchitectureNodeId::AttentionOutputProjection
    )
}
