//! Distinct tokenization, token embedding, position embedding, and `LayerNorm` evidence.

use super::{
    btc_row, embedding_row, facts,
    vector::{VectorStrip, shared_scale, vector_strip},
};
use crate::{app::state::AppState, trace_lookup::TraceLookup};
use leptos::prelude::*;

pub(super) fn tokenization(state: &AppState) -> AnyView {
    let Some(summary) = state.summary.as_ref() else {
        return facts::waiting("tokenization");
    };
    view! {
        <div class="stage-visual tokenization-visual" data-testid="evidence-tokenization" data-visual="tokenization" data-trace-ready="true">
            <ol class="tokenization-ledger" aria-label="실제 tokenizer 출력">
                {summary.tokens.iter().enumerate().map(|(index, token)| view! {
                    <li aria-current=(index == state.selection.token).then_some("true")>
                        <span>{token.display.clone()}</span><code>{token.id.0}</code><small>{format!("{:?}", token.kind)}</small>
                    </li>
                }).collect_view()}
            </ol>
        </div>
    }.into_any()
}

pub(super) fn token_embedding(state: &AppState) -> AnyView {
    let Some((summary, trace, token)) = embedding_trace(state) else {
        return facts::waiting("token-embedding");
    };
    let Ok(values) = embedding_row(&trace.token, token) else {
        return facts::error_state("token embedding row");
    };
    let strip = VectorStrip {
        label: "Token embedding",
        tensor_id: trace.token.id.clone(),
        values,
        tone: "token",
        selected_feature: state.ui.selected_feature,
    };
    let scale = shared_scale(std::slice::from_ref(&strip));
    view! {
        <div class="stage-visual token-embedding-visual" data-testid="evidence-token-embedding" data-visual="token-embedding" data-trace-ready="true">
            <p class="equation-line"><span>{summary.tokens[token].display.clone()}</span><code>{summary.tokens[token].id.0}</code><b>"→ Wₑ[token_id]"</b></p>
            {vector_strip(strip, scale)}
        </div>
    }.into_any()
}

pub(super) fn position_embedding(state: &AppState) -> AnyView {
    let Some((_summary, trace, token)) = embedding_trace(state) else {
        return facts::waiting("position-embedding");
    };
    let (Ok(position), Ok(sum)) = (
        embedding_row(&trace.position, token),
        embedding_row(&trace.sum, token),
    ) else {
        return facts::error_state("position embedding rows");
    };
    let position = VectorStrip {
        label: "Position embedding",
        tensor_id: trace.position.id.clone(),
        values: position,
        tone: "position",
        selected_feature: state.ui.selected_feature,
    };
    let sum = VectorStrip {
        label: "Residual after position add",
        tensor_id: trace.sum.id.clone(),
        values: sum,
        tone: "score",
        selected_feature: state.ui.selected_feature,
    };
    let scale = shared_scale(&[position.clone(), sum.clone()]);
    view! {
        <div class="stage-visual position-embedding-visual" data-testid="evidence-position-embedding" data-visual="position-embedding" data-trace-ready="true">
            <div class="equation-line"><code>{format!("position {token}")}</code><b>"+ token embedding = residual"</b></div>
            {vector_strip(position, scale)}{vector_strip(sum, scale)}
        </div>
    }.into_any()
}

fn embedding_trace(
    state: &AppState,
) -> Option<(
    &nanogpt_schema::RunSummary,
    &nanogpt_schema::EmbeddingTrace,
    usize,
)> {
    let summary = state.summary.as_ref()?;
    let trace = &summary.embeddings;
    let token = state
        .selection
        .token
        .min(summary.tokens.len().saturating_sub(1));
    Some((summary, trace, token))
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
        selected_feature: state.ui.selected_feature,
    };
    let after = VectorStrip {
        label: "After LN₁",
        tensor_id: normalized.id.clone(),
        values: normalized_values,
        tone: "query",
        selected_feature: state.ui.selected_feature,
    };
    let scale = shared_scale(&[before.clone(), after.clone()]);
    view! {
        <div class="stage-visual vector-comparison" data-testid="evidence-layer-norm" data-visual="attention-layer-norm" data-trace-ready="true">
            <div class="comparison-ledger">{facts::tensor_facts(input, "before")}{facts::tensor_facts(normalized, "after")}</div>
            {vector_strip(before, scale)}{vector_strip(after, scale)}
        </div>
    }.into_any()
}
