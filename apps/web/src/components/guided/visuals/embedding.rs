//! Embedding addition and pre-attention normalization stages.

use leptos::prelude::*;

use crate::{app::state::AppState, trace_lookup::TraceLookup};

use super::{
    btc_row, embedding_row, facts,
    vector::{VectorStrip, shared_scale, vector_strip},
};

pub(super) fn embedding(state: &AppState) -> AnyView {
    let Some(summary) = state.summary.as_ref() else {
        return facts::waiting("embedding");
    };
    let lookup = TraceLookup::new().with_summary(summary);
    let Some(trace) = lookup.embeddings() else {
        return facts::waiting("embedding");
    };
    let token = state
        .selection
        .token
        .min(summary.tokens.len().saturating_sub(1));
    let rows = [
        embedding_row(&trace.token, token).map(|values| VectorStrip {
            label: "Token",
            tensor_id: trace.token.id.clone(),
            values,
            tone: "token",
            selected_feature: 0,
        }),
        embedding_row(&trace.position, token).map(|values| VectorStrip {
            label: "Position",
            tensor_id: trace.position.id.clone(),
            values,
            tone: "position",
            selected_feature: 0,
        }),
        embedding_row(&trace.sum, token).map(|values| VectorStrip {
            label: "Sum",
            tensor_id: trace.sum.id.clone(),
            values,
            tone: "score",
            selected_feature: 0,
        }),
    ];
    let [Ok(token_strip), Ok(position_strip), Ok(sum_strip)] = rows else {
        return facts::error_state("embedding tensor shape");
    };
    let scale = shared_scale(&[
        token_strip.clone(),
        position_strip.clone(),
        sum_strip.clone(),
    ]);
    view! {
        <div class="stage-visual vector-comparison" data-visual="embedding" data-trace-ready="true">
            <div class="equation-line"><span data-tensor-id=trace.token.id.clone()>"token"</span><b>"+"</b><span data-tensor-id=trace.position.id.clone()>"position"</span><b>"="</b><span data-tensor-id=trace.sum.id.clone()>"residual stream"</span></div>
            {vector_strip(token_strip, scale)}{vector_strip(position_strip, scale)}{vector_strip(sum_strip, scale)}
        </div>
    }.into_any()
}

pub(super) fn attention_norm(state: &AppState) -> AnyView {
    let Some(block) = state.block.as_ref() else {
        return facts::waiting("attention-layer-norm");
    };
    let lookup = TraceLookup::new().with_block(block);
    let (Ok(input), Ok(normalized)) = (
        lookup.block_tensor("block_input"),
        lookup.block_tensor("attention_layer_norm"),
    ) else {
        return facts::error_state("attention LayerNorm tensor");
    };
    let token = state.selection.token;
    let (Ok(input_values), Ok(normalized_values)) =
        (btc_row(input, token), btc_row(normalized, token))
    else {
        return facts::error_state("selected LayerNorm row");
    };
    let before = VectorStrip {
        label: "Before LN₁",
        tensor_id: input.id.clone(),
        values: input_values,
        tone: "residual",
        selected_feature: 0,
    };
    let after = VectorStrip {
        label: "After LN₁",
        tensor_id: normalized.id.clone(),
        values: normalized_values,
        tone: "query",
        selected_feature: 0,
    };
    let scale = shared_scale(&[before.clone(), after.clone()]);
    view! {
        <div class="stage-visual vector-comparison" data-visual="attention-layer-norm" data-trace-ready="true">
            <div class="comparison-ledger">{facts::tensor_facts(input, "before")}{facts::tensor_facts(normalized, "after")}</div>
            {vector_strip(before, scale)}{vector_strip(after, scale)}
        </div>
    }.into_any()
}
