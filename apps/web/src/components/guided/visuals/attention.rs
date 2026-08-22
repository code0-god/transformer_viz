//! Q/K/V, score, causal-mask, and softmax learning views.

use leptos::prelude::*;

use crate::{
    app::{state::AppState, worker_client::WorkerClient},
    guided_math::{probability_row, score_evidence},
};

use super::{
    bhtd_row, facts,
    matrix::{MatrixMode, MatrixSpec, matrix_heatmap},
    matrix_values, selected,
    vector::{VectorStrip, shared_scale, vector_strip},
};

pub(super) fn query_key_value(state: &AppState) -> AnyView {
    let Some(trace) = state.attention.as_ref() else {
        return facts::waiting("query-key-value");
    };
    let (query, key) = selected(state, trace);
    let rows = [
        bhtd_row(&trace.query, query).map(|values| VectorStrip {
            label: "Q · 찾을 정보",
            tensor_id: trace.query.id.clone(),
            values,
            tone: "query",
            selected_feature: 0,
        }),
        bhtd_row(&trace.key, key).map(|values| VectorStrip {
            label: "K · 제공할 표지",
            tensor_id: trace.key.id.clone(),
            values,
            tone: "key",
            selected_feature: 0,
        }),
        bhtd_row(&trace.value, key).map(|values| VectorStrip {
            label: "V · 전달할 내용",
            tensor_id: trace.value.id.clone(),
            values,
            tone: "value",
            selected_feature: 0,
        }),
    ];
    let [Ok(query_strip), Ok(key_strip), Ok(value_strip)] = rows else {
        return facts::error_state("Q/K/V row");
    };
    let scale = shared_scale(&[query_strip.clone(), key_strip.clone(), value_strip.clone()]);
    view! {
        <div class="stage-visual qkv-visual" data-visual="query-key-value" data-trace-ready="true">
            <div class="qkv-markers"><span class="q-marker">"Q"</span><span class="k-marker">"K"</span><span class="v-marker">"V"</span><small>{format!("H{} metadata · captured axis H=0", state.selection.head)}</small></div>
            {vector_strip(query_strip, scale)}{vector_strip(key_strip, scale)}{vector_strip(value_strip, scale)}
        </div>
    }.into_any()
}

pub(super) fn scores(state: RwSignal<AppState>, client: &WorkerClient) -> AnyView {
    let current = state.get();
    let Some(trace) = current.attention.as_ref() else {
        return facts::waiting("attention-score");
    };
    let (query, key) = selected(&current, trace);
    let Ok(score) = score_evidence(trace, query, key) else {
        return facts::error_state("attention score reconstruction");
    };
    let (Ok((rows, cols, raw)), Ok((_, _, scaled))) = (
        matrix_values(&trace.raw_scores),
        matrix_values(&trace.scaled_scores),
    ) else {
        return facts::error_state("score matrix");
    };
    let allowed = vec![true; rows.saturating_mul(cols)];
    let contribution = VectorStrip {
        label: "feature별 Qᵢ × Kᵢ",
        tensor_id: trace.raw_scores.id.clone(),
        values: score.contributions.clone(),
        tone: "score",
        selected_feature: 0,
    };
    let scale = shared_scale(std::slice::from_ref(&contribution));
    view! {
        <div class="stage-visual score-visual" data-visual="attention-score" data-trace-ready="true">
            <div class="matrix-pair">
                {matrix_heatmap(MatrixSpec { tensor_id: trace.raw_scores.id.clone(), rows, cols, values: raw, allowed: allowed.clone(), mode: MatrixMode::Raw, query, key, interactive: true, head: current.selection.head }, state, client)}
                {matrix_heatmap(MatrixSpec { tensor_id: trace.scaled_scores.id.clone(), rows, cols, values: scaled, allowed, mode: MatrixMode::Scaled, query, key, interactive: true, head: current.selection.head }, state, client)}
            </div>
            {vector_strip(contribution, scale)}
            <dl class="math-proof"><div><dt>"Σ QᵢKᵢ"</dt><dd>{format!("{:.7}", score.dot)}</dd></div><div data-raw-error=score.raw_error><dt>"raw 오차"</dt><dd>{format!("{:.2e}", score.raw_error)}</dd></div><div><dt>"raw / √D"</dt><dd>{format!("{:.7}", score.scaled)}</dd></div><div data-scaled-error=score.scaled_error><dt>"scaled 오차"</dt><dd>{format!("{:.2e}", score.scaled_error)}</dd></div></dl>
        </div>
    }.into_any()
}

pub(super) fn mask(state: RwSignal<AppState>, client: &WorkerClient) -> AnyView {
    let current = state.get();
    let Some(trace) = current.attention.as_ref() else {
        return facts::waiting("causal-mask");
    };
    let (query, key) = selected(&current, trace);
    let Ok((rows, cols, values)) = matrix_values(&trace.scaled_scores) else {
        return facts::error_state("causal mask matrix");
    };
    let allowed = trace.mask.allowed.clone();
    let selected_allowed = allowed
        .get(query.saturating_mul(cols).saturating_add(key))
        .copied()
        .unwrap_or(false);
    view! {
        <div class="stage-visual mask-visual" data-visual="causal-mask" data-trace-ready="true">
            {matrix_heatmap(MatrixSpec { tensor_id: trace.scaled_scores.id.clone(), rows, cols, values, allowed, mode: MatrixMode::Mask, query, key, interactive: true, head: current.selection.head }, state, client)}
            <p class="mask-verdict" data-tensor-id=trace.scaled_scores.id.clone()>{format!("선택 q{query} × k{key}: {} · 대각선 오른쪽은 hatch와 mask 텍스트로 차단", if selected_allowed { "실제 mask 허용" } else { "실제 mask 미래 차단" })}</p>
        </div>
    }.into_any()
}

pub(super) fn softmax(state: RwSignal<AppState>, client: &WorkerClient) -> AnyView {
    let current = state.get();
    let Some(trace) = current.attention.as_ref() else {
        return facts::waiting("softmax");
    };
    let (query, key) = selected(&current, trace);
    let Ok(row) = probability_row(trace, query) else {
        return facts::error_state("softmax row");
    };
    let Ok((rows, cols, values)) = matrix_values(&trace.probabilities) else {
        return facts::error_state("probability matrix");
    };
    let score_row = match bhtd_row(&trace.scaled_scores, query) {
        Ok(values) => values,
        Err(error) => return facts::error_state(error.to_string()),
    };
    let score_strip = VectorStrip {
        label: "masked score row",
        tensor_id: trace.scaled_scores.id.clone(),
        values: score_row,
        tone: "score",
        selected_feature: key,
    };
    let probability_strip = VectorStrip {
        label: "softmax probability row",
        tensor_id: trace.probabilities.id.clone(),
        values: row.values.clone(),
        tone: "probability",
        selected_feature: key,
    };
    let scale = shared_scale(&[score_strip.clone(), probability_strip.clone()]);
    let future_max = row
        .future
        .iter()
        .copied()
        .map(f32::abs)
        .fold(0.0_f32, f32::max);
    view! {
        <div class="stage-visual softmax-visual" data-visual="softmax" data-trace-ready="true">
            <div class="softmax-transform">{vector_strip(score_strip, scale)}<span>"softmax →"</span>{vector_strip(probability_strip, scale)}</div>
            {matrix_heatmap(MatrixSpec { tensor_id: trace.probabilities.id.clone(), rows, cols, values, allowed: trace.mask.allowed.clone(), mode: MatrixMode::Probability, query, key, interactive: true, head: current.selection.head }, state, client)}
            <dl class="math-proof"><div data-row-sum=row.sum><dt>"선택 행 ΣP"</dt><dd>{format!("{:.8}", row.sum)}</dd></div><div><dt>"미래 확률 max"</dt><dd>{format!("{future_max:.8}")}</dd></div><div><dt>"증명"</dt><dd>"허용 key 합 ≈ 1 · 미래 key = 0"</dd></div></dl>
        </div>
    }.into_any()
}
