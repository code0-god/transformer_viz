//! Logits output and Phase I source/playback slots.

use leptos::prelude::*;

use crate::app::state::AppState;

/// Full-vocabulary softmax Top-10 from the real Worker run.
#[must_use]
pub fn logits_view(state: RwSignal<AppState>) -> impl IntoView {
    view! {
        <section class="panel logits-panel" aria-labelledby="logits-title">
            <div class="panel-heading"><div><h2 id="logits-title">"다음 토큰 Top-10"</h2><p>"전체 259개 어휘의 softmax 확률에서 상위 후보를 정렬했습니다."</p></div></div>
            {move || state.get().summary.map_or_else(
                || view! { <p class="empty">"실행 후 후보 확률이 표시됩니다."</p> }.into_any(),
                |summary| view! { <ol class="logits-list">{summary.logits.top_k.into_iter().enumerate().map(|(rank, candidate)| view! {
                    <li><span class="rank">{rank + 1}</span><strong>{display_token(&candidate.display)}</strong><span class="probability">{format!("{:.4}%", candidate.probability.get() * 100.0)}</span><small>{format!("logit {:.5} / id {}", candidate.logit.get(), candidate.token_id.0)}</small></li>
                }).collect_view()}</ol> }.into_any()
            )}
        </section>
    }
}

/// Stable semantic location for Phase I source-map integration.
#[must_use]
pub fn source_placeholder() -> impl IntoView {
    view! {
        <section class="panel placeholder-panel" aria-labelledby="source-title">
            <h2 id="source-title">"nanoGPT 소스 연결"</h2>
            <p>"현재 추적에는 연산별 소스 참조가 포함되어 있습니다. 다음 단계에서 고정된 model.py 줄과 실제 연산을 함께 강조합니다."</p>
            <span class="phase-label">"Phase I에서 활성화"</span>
        </section>
    }
}

/// Stable semantic location for Phase I 18-step playback.
#[must_use]
pub fn playback_placeholder() -> impl IntoView {
    view! {
        <section class="panel placeholder-panel" aria-labelledby="playback-title">
            <h2 id="playback-title">"18단계 재생"</h2>
            <p>"블록의 18개 실제 연산은 이미 Worker trace에 있습니다. 다음 단계에서 이전/다음 재생과 데이터 경로 강조를 연결합니다."</p>
            <button type="button" disabled aria-describedby="playback-note">"재생 준비 중"</button>
            <small id="playback-note">"Phase I에서 활성화"</small>
        </section>
    }
}

fn display_token(token: &str) -> String {
    match token {
        " " => "공백".to_owned(),
        "\n" => "줄바꿈".to_owned(),
        value => value.to_owned(),
    }
}
