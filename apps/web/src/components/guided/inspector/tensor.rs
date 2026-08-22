//! Exact tensor identity, semantic address, slice, and math evidence.

use leptos::prelude::*;
use nanogpt_schema::TensorSnapshot;

use crate::{
    app::{narrative::NarrativeStage, state::AppState},
    guided_math::{score_evidence, value_evidence},
    tensor_address::TensorAddress,
    trace_lookup::selected_head_token_slice,
};

use super::{feature_width, selected_tensor};

pub(super) fn panel(state: RwSignal<AppState>, current: &AppState) -> AnyView {
    let selection = match selected_tensor(current) {
        Ok(selection) => selection,
        Err(error) => return empty(error),
    };
    let address = match address(current, selection.tensor) {
        Ok(address) => address,
        Err(error) => return empty(error),
    };
    let axes = address.axes().to_vec();
    let selected_value = address.value().get();
    let slice_start = address.slice_start();
    let slice = address
        .slice()
        .iter()
        .map(|value| value.get())
        .collect::<Vec<_>>();
    let feature_width = feature_width(selection.tensor);
    let tensor_id = selection.tensor.id.clone();
    let identity_id = tensor_id.clone();
    let label = selection.tensor.label.clone();
    let shape = format!("{:?}", selection.tensor.shape);
    let stats = selection.tensor.stats.clone();
    let stage = current.ui.narrative.stage;
    let selected_feature = current.ui.selected_feature;
    view! {
        <div class="inspector-tensor" data-testid="inspector-tensor" data-tensor-id=identity_id>
            <dl class="tensor-identity">
                <div><dt>"stable id"</dt><dd><code>{tensor_id}</code></dd></div>
                <div><dt>"label"</dt><dd>{label}</dd></div>
                <div><dt>"shape"</dt><dd><code>{shape}</code></dd></div>
                <div><dt>"dtype"</dt><dd><code>"f32"</code></dd></div>
                <div><dt>"operation"</dt><dd><code>{format!("{:?}", selection.operation)}</code></dd></div>
            </dl>
            <dl class="tensor-stats">
                <div><dt>"min"</dt><dd>{format!("{:+.6}", stats.min.get())}</dd></div>
                <div><dt>"max"</dt><dd>{format!("{:+.6}", stats.max.get())}</dd></div>
                <div><dt>"mean"</dt><dd>{format!("{:+.6}", stats.mean.get())}</dd></div>
                <div><dt>"std"</dt><dd>{format!("{:.6}", stats.std.get())}</dd></div>
                <div><dt>"L2"</dt><dd>{format!("{:.6}", stats.l2_norm.get())}</dd></div>
            </dl>
            <div class="tensor-address" aria-label="선택 tensor 주소">
                {axes.into_iter().map(|axis| view! { <span><b>{axis.name}</b> <code data-axis=axis.name>{axis.index}</code></span> }).collect_view()}
                <span><b>"flat"</b> <code>{address.flat_index()}</code></span>
            </div>
            {feature_controls(state, feature_width, selected_feature)}
            <p class="selected-value"><span>"선택 값"</span><strong>{format!("{selected_value:+.9}")}</strong></p>
            <div class="tensor-slice" tabindex="0" role="region" aria-label="선택 행의 bounded slice, 가로 스크롤 가능">
                {slice.into_iter().enumerate().map(|(offset, value)| view! { <span><small>{slice_start + offset}</small><code>{format!("{value:+.7}")}</code></span> }).collect_view()}
            </div>
            {math_evidence(current, stage)}
        </div>
    }.into_any()
}

fn address<'a>(state: &AppState, tensor: &'a TensorSnapshot) -> Result<TensorAddress<'a>, String> {
    let feature = state.ui.selected_feature;
    let query = state.selection.token;
    let key = state.selection.key;
    let result = match tensor.shape.len() {
        1 => TensorAddress::vector(tensor, feature, 4),
        3 => TensorAddress::token_feature(tensor, query, feature, 4),
        4 if tensor.id.contains("score") || tensor.id.contains("probabil") => {
            TensorAddress::matrix_cell(tensor, query, key, 4)
        }
        4 => {
            let token = if tensor.id == "key" || tensor.id == "value" {
                key
            } else {
                query
            };
            TensorAddress::head_token_feature(tensor, token, feature, 4)
        }
        _ => {
            return Err(format!(
                "지원하지 않는 tensor shape입니다: {:?}",
                tensor.shape
            ));
        }
    };
    result.map_err(|error| error.to_string())
}

fn feature_controls(state: RwSignal<AppState>, width: Option<usize>, selected: usize) -> AnyView {
    let Some(width) = width.filter(|width| *width > 0) else {
        return ().into_any();
    };
    view! {
        <div class="feature-selectors" role="group" aria-label="전역 feature 선택">
            {(0..width).map(|feature| view! {
                <button type="button" class="feature-selector" data-feature=feature aria-pressed=(feature == selected).to_string() on:click=move |_| state.update(|current| { let _selected = current.ui.select_feature(feature, width); })>{feature}</button>
            }).collect_view()}
        </div>
    }.into_any()
}

fn math_evidence(state: &AppState, stage: NarrativeStage) -> AnyView {
    match stage {
        NarrativeStage::AttentionScores => qk_table(state),
        NarrativeStage::ValueAggregation => value_table(state),
        NarrativeStage::Embedding
        | NarrativeStage::AttentionLayerNorm
        | NarrativeStage::QueryKeyValue
        | NarrativeStage::CausalMask
        | NarrativeStage::Softmax
        | NarrativeStage::MlpAndResidual
        | NarrativeStage::LanguageModelHead => ().into_any(),
    }
}

fn qk_table(state: &AppState) -> AnyView {
    let Some(trace) = state.attention.as_ref() else {
        return empty("Q/K trace가 아직 준비되지 않았습니다.");
    };
    let query = state.selection.token.min(trace.mask.rows.saturating_sub(1));
    let key = state.selection.key.min(trace.mask.cols.saturating_sub(1));
    let (Ok(evidence), Ok(q), Ok(k)) = (
        score_evidence(trace, query, key),
        selected_head_token_slice(&trace.query, 0, 0, query),
        selected_head_token_slice(&trace.key, 0, 0, key),
    ) else {
        return empty("Q/K 기여도를 shape-safe하게 복원할 수 없습니다.");
    };
    let rows = q
        .iter()
        .zip(k)
        .zip(&evidence.contributions)
        .enumerate()
        .map(|(feature, ((q_value, k_value), product))| {
            (feature, q_value.get(), k_value.get(), *product)
        })
        .collect::<Vec<_>>();
    view! {
        <div class="math-table-scroll" tabindex="0" role="region" aria-label="QK feature 기여도 표, 가로 세로 스크롤 가능">
            <table class="qk-contribution-table"><caption>{format!("q{query} · k{key} 전체 QᵢKᵢ")}</caption>
                <thead><tr><th scope="col">"feature"</th><th scope="col">"Qᵢ"</th><th scope="col">"Kᵢ"</th><th scope="col">"Qᵢ × Kᵢ"</th></tr></thead>
                <tbody>{rows.into_iter().map(|(feature, q_value, k_value, product)| view! { <tr><th scope="row">{feature}</th><td>{format!("{q_value:+.9}")}</td><td>{format!("{k_value:+.9}")}</td><td>{format!("{product:+.9}")}</td></tr> }).collect_view()}</tbody>
                <tfoot><tr><th scope="row">"Σ / captured raw"</th><td colspan="3">{format!("{:.9} / {:.9} · error {:.2e}", evidence.dot, evidence.raw, evidence.raw_error)}</td></tr><tr><th scope="row">"scaled / error"</th><td colspan="3">{format!("{:.9} · {:.2e}", evidence.scaled, evidence.scaled_error)}</td></tr></tfoot>
            </table>
        </div>
    }.into_any()
}

fn value_table(state: &AppState) -> AnyView {
    let Some(trace) = state.attention.as_ref() else {
        return empty("Value trace가 아직 준비되지 않았습니다.");
    };
    let query = state.selection.token.min(trace.mask.rows.saturating_sub(1));
    let Ok(evidence) = value_evidence(trace, query) else {
        return empty("P×V 기여도를 shape-safe하게 복원할 수 없습니다.");
    };
    let selected_key = state.selection.key;
    let selected_feature = state.ui.selected_feature;
    let contribution_rows = evidence
        .contributions
        .chunks(evidence.features.max(1))
        .map(<[_]>::to_vec)
        .collect::<Vec<_>>();
    view! {
        <div class="math-table-scroll value-table-scroll" tabindex="0" role="region" aria-label="전체 P 곱하기 V 기여도 표, 가로 세로 스크롤 가능">
            <table class="value-contribution-table"><caption>{format!("q{query}의 전체 key × {} feature P[q,k] × V[k,d]", evidence.features)}</caption>
                <thead><tr><th scope="col">"key"</th>{(0..evidence.features).map(|feature| view! { <th scope="col" class:selected=feature == selected_feature>{feature}</th> }).collect_view()}</tr></thead>
                <tbody>{contribution_rows.into_iter().enumerate().map(|(key, row)| view! { <tr class:selected=key == selected_key><th scope="row">{format!("k{key}")}</th>{row.into_iter().enumerate().map(|(feature, value)| view! { <td class:selected=feature == selected_feature>{format!("{value:+.7}")}</td> }).collect_view()}</tr> }).collect_view()}</tbody>
                <tfoot><tr><th scope="row">"Σₖ"</th>{evidence.feature_sums.iter().enumerate().map(|(feature, value)| view! { <td class:selected=feature == selected_feature>{format!("{value:+.7}")}</td> }).collect_view()}</tr><tr><th scope="row">"captured"</th>{evidence.captured.iter().enumerate().map(|(feature, value)| view! { <td class:selected=feature == selected_feature>{format!("{value:+.7}")}</td> }).collect_view()}</tr></tfoot>
            </table><p class="table-proof">{format!("captured output 최대 절대 오차 {:.2e}", evidence.output_error)}</p>
        </div>
    }.into_any()
}

fn empty(message: impl Into<String>) -> AnyView {
    view! { <p class="empty-state inspector-empty" role="status">{message.into()}</p> }.into_any()
}
