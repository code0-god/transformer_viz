//! Full-vocabulary logits output.

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

fn display_token(token: &str) -> String {
    match token {
        " " => "공백".to_owned(),
        "\n" => "줄바꿈".to_owned(),
        value => value.to_owned(),
    }
}
