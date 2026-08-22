//! Real-trace stage dispatch and shared checked snapshot adapters.

mod attention;
mod embedding;
mod facts;
mod flow;
mod matrix;
mod mlp;
mod prediction;
mod value;
mod vector;

use leptos::prelude::*;
use nanogpt_schema::{AttentionHeadTrace, FiniteF32, TensorSnapshot};

use crate::{
    app::{narrative::NarrativeStage, state::AppState, worker_client::WorkerClient},
    trace_lookup::{TraceLookupError, bhtd_shape, selected_head_token_slice, selected_token_row},
};

pub(super) fn stage_visual(state: RwSignal<AppState>, client: &WorkerClient) -> AnyView {
    let current = state.get();
    match current.ui.narrative.stage {
        NarrativeStage::Embedding => embedding::embedding(&current),
        NarrativeStage::AttentionLayerNorm => embedding::attention_norm(&current),
        NarrativeStage::QueryKeyValue => attention::query_key_value(&current),
        NarrativeStage::AttentionScores => attention::scores(state, client),
        NarrativeStage::CausalMask => attention::mask(state, client),
        NarrativeStage::Softmax => attention::softmax(state, client),
        NarrativeStage::ValueAggregation => value::value_residual(&current),
        NarrativeStage::MlpAndResidual => mlp::mlp_residual(&current),
        NarrativeStage::LanguageModelHead => prediction::prediction(&current),
    }
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
