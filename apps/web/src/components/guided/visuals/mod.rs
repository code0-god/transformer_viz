//! Real-trace stage dispatch and shared checked snapshot adapters.

mod attention;
mod embedding;
mod facts;
mod flow;
pub(super) mod generation_sampling;
mod matrix;
mod mlp;
mod prediction;
mod value;
mod vector;

use leptos::prelude::*;
use nanogpt_schema::{AttentionHeadTrace, FiniteF32, TensorSnapshot};

use crate::{
    app::{narrative::EvidenceView, state::AppState, worker_client::WorkerClient},
    trace_lookup::{TraceLookupError, bhtd_shape, selected_head_token_slice, selected_token_row},
};

pub(super) fn stage_visual(state: RwSignal<AppState>, client: &WorkerClient) -> AnyView {
    state.with(|current| match current.ui.narrative.stage.evidence_view() {
        EvidenceView::Tokenization => embedding::tokenization(current),
        EvidenceView::TokenEmbedding => embedding::token_embedding(current),
        EvidenceView::PositionEmbedding => embedding::position_embedding(current),
        EvidenceView::LayerNorm => embedding::attention_norm(current),
        EvidenceView::QueryKeyValue => attention::query_key_value(current),
        EvidenceView::AttentionScore => attention::scores(state, client),
        EvidenceView::CausalMask => attention::mask(state, client),
        EvidenceView::Softmax => attention::softmax(state, client),
        EvidenceView::ValueAggregation => value::value_aggregation(current),
        EvidenceView::AttentionResidual => value::attention_residual(current),
        EvidenceView::MlpTransform => mlp::mlp_transform(current),
        EvidenceView::BlockOutput => mlp::block_output(current),
        EvidenceView::FinalLayerNorm => prediction::final_layer_norm(current),
        EvidenceView::LanguageModelHead => prediction::language_model_head(current),
        EvidenceView::Logits => prediction::logits(current),
        EvidenceView::Sampling
        | EvidenceView::GeneratedToken
        | EvidenceView::GenerationBoundary => ().into_any(),
    })
}

fn bhtd_row(tensor: &TensorSnapshot, token: usize) -> Result<Vec<f32>, TraceLookupError> {
    selected_head_token_slice(tensor, 0, 0, token).map(values)
}

fn btc_row(tensor: &TensorSnapshot, token: usize) -> Result<Vec<f32>, TraceLookupError> {
    selected_token_row(tensor, 0, token).map(values)
}

fn embedding_row(tensor: &TensorSnapshot, token: usize) -> Result<Vec<f32>, TraceLookupError> {
    match tensor.shape.as_slice() {
        [_, _, _] => btc_row(tensor, token),
        [tokens, features] if token < *tokens => {
            let start = token.checked_mul(*features).ok_or_else(|| bounds(tensor))?;
            tensor
                .values
                .get(start..start.saturating_add(*features))
                .map(values)
                .ok_or_else(|| bounds(tensor))
        }
        _ => Err(TraceLookupError::InvalidShape(
            tensor.id.clone(),
            2,
            tensor.shape.clone(),
        )),
    }
}

fn matrix_values(tensor: &TensorSnapshot) -> Result<(usize, usize, Vec<f32>), TraceLookupError> {
    let [_, _, rows, cols] = bhtd_shape(tensor)?;
    Ok((rows, cols, values(&tensor.values)))
}

fn values(source: &[FiniteF32]) -> Vec<f32> {
    source.iter().map(|value| value.get()).collect()
}

fn bounds(tensor: &TensorSnapshot) -> TraceLookupError {
    TraceLookupError::SelectionOutOfBounds(tensor.id.clone(), tensor.shape.clone())
}

fn selected(state: &AppState, trace: &AttentionHeadTrace) -> (usize, usize) {
    let last = trace.mask.rows.saturating_sub(1);
    (
        state.selection.token.min(last),
        state.selection.key.min(last),
    )
}
