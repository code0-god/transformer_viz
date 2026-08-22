//! Full probability-times-value reconstruction, projection, and residual stage.

use leptos::prelude::*;

use crate::{app::state::AppState, guided_math::value_evidence, trace_lookup::TraceLookup};

use super::{
    btc_row, facts,
    flow::{FlowNode, flow_diagram},
    selected,
    vector::{VectorStrip, shared_scale, vector_strip},
};

pub(super) fn value_aggregation(state: &AppState) -> AnyView {
    value_stage(state, false)
}

pub(super) fn attention_residual(state: &AppState) -> AnyView {
    value_stage(state, true)
}

fn value_stage(state: &AppState, residual_focus: bool) -> AnyView {
    let (Some(trace), Some(block)) = (state.attention.as_ref(), state.block.as_ref()) else {
        return facts::waiting("value-residual");
    };
    let (query, _) = selected(state, trace);
    let Ok(evidence) = value_evidence(trace, query) else {
        return facts::error_state("P × V reconstruction");
    };
    let lookup = TraceLookup::new().with_block(block);
    let (Ok(input), Ok(projected), Ok(residual)) = (
        lookup.block_tensor("block_input"),
        lookup.block_tensor("attention_projected"),
        lookup.block_tensor("attention_residual"),
    ) else {
        return facts::error_state("attention residual addends");
    };
    let (Ok(input_row), Ok(projected_row), Ok(residual_row)) = (
        btc_row(input, query),
        btc_row(projected, query),
        btc_row(residual, query),
    ) else {
        return facts::error_state("selected attention residual row");
    };
    let selected_feature = selected_feature(state, evidence.features);
    let key_contributions = selected_contributions(
        &evidence.contributions,
        evidence.keys,
        evidence.features,
        selected_feature,
    );
    let contributions = VectorStrip {
        label: "선택 feature의 key별 P×V",
        tensor_id: trace.value.id.clone(),
        values: key_contributions,
        tone: "value",
        selected_feature: state.selection.key,
    };
    let attended = VectorStrip {
        label: "Σₖ P×V · attended head",
        tensor_id: trace.output.id.clone(),
        values: evidence.feature_sums.clone(),
        tone: "value",
        selected_feature,
    };
    let input_strip = VectorStrip {
        label: "block input addend",
        tensor_id: input.id.clone(),
        values: input_row,
        tone: "residual",
        selected_feature,
    };
    let projected_strip = VectorStrip {
        label: "attention projected addend",
        tensor_id: projected.id.clone(),
        values: projected_row,
        tone: "score",
        selected_feature,
    };
    let residual_strip = VectorStrip {
        label: "attention residual result",
        tensor_id: residual.id.clone(),
        values: residual_row,
        tone: "residual",
        selected_feature,
    };
    let value_scale = shared_scale(&[contributions.clone(), attended.clone()]);
    let residual_scale = shared_scale(&[
        input_strip.clone(),
        projected_strip.clone(),
        residual_strip.clone(),
    ]);
    let matrix_values = evidence.contributions.clone();
    let limit = absolute_limit(&matrix_values);
    view! {
        <div class="stage-visual value-visual" data-testid=if residual_focus { "evidence-attention-residual" } else { "evidence-value-aggregation" } data-visual=if residual_focus { "attention-residual" } else { "value-aggregation" } data-trace-ready="true">
            <figure hidden=residual_focus class="contribution-matrix" data-tensor-id=trace.value.id.clone()>
                <figcaption><strong>"전체 key × feature 기여도"</strong><span>{format!("{} × {}", evidence.keys, evidence.features)}</span></figcaption>
                <svg role="img" viewBox=format!("0 0 {} {}", evidence.features, evidence.keys)>
                    <title>"선택 query의 전체 P[q,k] × V[k,d] 기여도 matrix"</title><desc>"각 행은 key, 각 열은 value feature이며 모든 셀은 실제 확률과 value의 곱입니다."</desc>
                    {(0..evidence.keys).flat_map(|key| (0..evidence.features).map(move |feature| (key, feature))).map(|(key, feature)| {
                        let index = key.saturating_mul(evidence.features).saturating_add(feature);
                        let value = matrix_values.get(index).copied().unwrap_or_default();
                        let opacity = (value.abs() / limit).clamp(0.05, 1.0);
                        view! { <rect x=feature y=key width="1" height="1" class:selected=feature == selected_feature style=format!("fill: color-mix(in srgb, var(--value) {}%, var(--surface-strong))", opacity * 100.0)><title>{format!("k{key}, d{feature}: {value:+.8}")}</title></rect> }
                    }).collect_view()}
                </svg>
            </figure>
            <div hidden=residual_focus class="value-strips">{vector_strip(contributions, value_scale)}{vector_strip(attended, value_scale)}</div>
            <div hidden=!residual_focus class="residual-equation"><span>"block input"</span><b>"+"</b><span>"attention projected"</span><b>"="</b><span>"attention residual"</span></div>
            <div hidden=!residual_focus class="residual-strips">{vector_strip(input_strip, residual_scale)}{vector_strip(projected_strip, residual_scale)}{vector_strip(residual_strip, residual_scale)}</div>
            {residual_focus.then(|| flow_diagram("Value aggregation to residual", "실제 P×V 출력이 projection을 거친 뒤 실제 block input addend와 더해져 attention residual이 됩니다.", vec![
                FlowNode { label: "P × V", tensor_id: trace.output.id.clone(), shape: trace.output.shape.clone(), tone: "value" },
                FlowNode { label: "projection", tensor_id: projected.id.clone(), shape: projected.shape.clone(), tone: "score" },
                FlowNode { label: "+ block input", tensor_id: input.id.clone(), shape: input.shape.clone(), tone: "residual" },
                FlowNode { label: "attention residual", tensor_id: residual.id.clone(), shape: residual.shape.clone(), tone: "residual" },
            ]))}
            <p hidden=residual_focus class="output-proof" data-output-error=evidence.output_error>{format!("모든 feature Σₖ(P×V)와 captured attention output의 최대 절대 오차: {:.2e}", evidence.output_error)}</p>
        </div>
    }.into_any()
}

fn selected_feature(state: &AppState, width: usize) -> usize {
    state.ui.selected_feature.min(width.saturating_sub(1))
}

fn selected_contributions(
    values: &[f32],
    keys: usize,
    features: usize,
    selected: usize,
) -> Vec<f32> {
    (0..keys)
        .filter_map(|key| {
            values
                .get(key.saturating_mul(features).saturating_add(selected))
                .copied()
        })
        .collect()
}

fn absolute_limit(values: &[f32]) -> f32 {
    values
        .iter()
        .map(|value| value.abs())
        .fold(f32::EPSILON, f32::max)
}
