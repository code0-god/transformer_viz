//! Final normalization, tied embedding head, and full-vocabulary Top-10 stage.

use leptos::prelude::*;

use crate::{app::state::AppState, trace_lookup::TraceLookup};

use super::{
    btc_row, facts,
    vector::{VectorStrip, shared_scale, vector_strip},
};

pub(super) fn prediction(state: &AppState) -> AnyView {
    let Some(summary) = state.summary.as_ref() else {
        return facts::waiting("prediction");
    };
    let Some(model) = state.model.as_ref() else {
        return facts::waiting("prediction");
    };
    let lookup = TraceLookup::new().with_summary(summary);
    let (Some(normalized), Some(logits)) = (lookup.final_layer_norm(), lookup.logits()) else {
        return facts::waiting("prediction");
    };
    let Some(prediction_token) = summary.tokens.len().checked_sub(1) else {
        return facts::error_state("final LayerNorm prediction row");
    };
    let Ok(values) = btc_row(normalized, prediction_token) else {
        return facts::error_state("final LayerNorm prediction row");
    };
    let strip = VectorStrip {
        label: "입력 끝(EOS)의 final LayerNorm",
        tensor_id: normalized.id.clone(),
        values,
        tone: "prediction",
        selected_feature: state.ui.selected_feature,
    };
    let scale = shared_scale(std::slice::from_ref(&strip));
    let vocabulary = model.config.vocab_size;
    view! {
        <div class="stage-visual prediction-visual" data-visual="prediction" data-trace-ready="true" data-token-index=prediction_token>
            {vector_strip(strip, scale)}
            <div class="tied-head" data-tensor-id=logits.logits.id.clone()>
                <svg role="img" viewBox="0 0 720 120"><title>"Tied embedding language-model head"</title><desc>"입력 끝 EOS의 정규화 표현을 token embedding weight의 transpose와 곱해 전체 vocabulary logit을 계산합니다."</desc><rect x="20" y="24" width="180" height="72" rx="10" /><text x="110" y="54">"final LN · C"</text><text x="110" y="77">{format!("token {prediction_token}")}</text><path d="M200 60 H270" /><rect class="prediction-weight" x="270" y="24" width="180" height="72" rx="10" /><text x="360" y="54">"Wₑᵀ · tied"</text><text x="360" y="77">"no extra weights"</text><path d="M450 60 H520" /><rect x="520" y="24" width="180" height="72" rx="10" /><text x="610" y="54">"all logits"</text><text x="610" y="77">{format!("V={vocabulary}")}</text></svg>
                <p>{format!("별도 LM head weight 없이 token embedding Wₑ를 공유합니다. 순위는 전체 {vocabulary}개 vocabulary 확률에서 계산했습니다.")}</p>
            </div>
            <div class="prediction-ledger">{facts::tensor_facts(normalized, "final LN")}<ol class="top-k-list" aria-label="실제 다음 토큰 Top-10">
                {logits.top_k.iter().enumerate().map(|(rank, candidate)| view! { <li><span>{rank + 1}</span><strong>{display_token(&candidate.display)}</strong><code>{format!("{:.4}%", candidate.probability.get() * 100.0)}</code></li> }).collect_view()}
            </ol></div>
        </div>
    }.into_any()
}

fn display_token(token: &str) -> String {
    match token {
        " " => "공백".to_owned(),
        "\n" => "줄바꿈".to_owned(),
        value => value.to_owned(),
    }
}
