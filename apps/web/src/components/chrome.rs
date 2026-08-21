//! header, prompt, status, token timeline, and model overview.

use leptos::prelude::*;
use nanogpt_schema::WorkerRequest;

use crate::app::{
    state::{AppState, AppStatus},
    worker_client::WorkerClient,
};

/// Product header and educational model disclaimer.
#[must_use]
pub fn header() -> impl IntoView {
    view! {
        <header class="site-header">
            <div>
                <p class="kicker">"브라우저 안에서 직접 계산하는 Transformer 탐색기"</p>
                <h1>"Transformer Viz"</h1>
            </div>
            <p class="disclaimer">"학습용 초소형 nanoGPT 호환 모델입니다. GPT-2 또는 상용 모델의 성능을 나타내지 않습니다."</p>
        </header>
    }
}

/// Prompt form and model lifecycle status.
#[must_use]
pub fn prompt_panel(state: RwSignal<AppState>, client: WorkerClient) -> impl IntoView {
    let (prompt, set_prompt) = signal("the cat sat on the".to_owned());
    let run_client = client;
    let run = move |_| {
        let mut request = None;
        state.update(|current| request = Some(current.run(&prompt.get_untracked())));
        if let Some(request) = request {
            send_or_error(state, &run_client, &request);
        }
    };
    view! {
        <section class="panel prompt-panel" aria-labelledby="prompt-title">
            <div class="panel-heading">
                <div><h2 id="prompt-title">"문장 실행"</h2><p>"UTF-8 바이트 토큰을 최대 24개까지 분석합니다."</p></div>
                {status_badge(state)}
            </div>
            <label for="prompt">"분석할 문장"</label>
            <textarea
                id="prompt"
                rows="2"
                prop:value=prompt
                on:input=move |event| set_prompt.set(event_target_value(&event))
            />
            <button
                id="run"
                class="primary"
                type="button"
                on:click=run
                disabled=move || matches!(state.get().status, AppStatus::Loading(_) | AppStatus::Running(_))
            >
                {move || if matches!(state.get().status, AppStatus::Running(_)) { "계산 중" } else { "실행" }}
            </button>
            <div class="status-detail" aria-live="polite">
                {move || match &state.get().status {
                    AppStatus::Loading(phase) => format!("로딩: {phase}"),
                    AppStatus::Ready => "준비 완료".to_owned(),
                    AppStatus::Running(phase) => phase.clone(),
                    AppStatus::Complete => state.get().summary.as_ref().map_or_else(
                        || "추적 완료".to_owned(),
                        |summary| format!("추적 완료, Worker 실행 {:.2} ms", summary.duration_ms.get()),
                    ),
                    AppStatus::Error(message) => format!("오류: {message}"),
                }}
            </div>
        </section>
    }
}

fn status_badge(state: RwSignal<AppState>) -> impl IntoView {
    view! {
        <span id="status" class="status-badge" data-status=move || match state.get().status {
            AppStatus::Loading(_) => "loading",
            AppStatus::Ready => "ready",
            AppStatus::Running(_) => "running",
            AppStatus::Complete => "complete",
            AppStatus::Error(_) => "error",
        }>
            {move || match state.get().status {
                AppStatus::Loading(_) => "모델 준비 중",
                AppStatus::Ready => "준비 완료",
                AppStatus::Running(_) => "Worker 실행 중",
                AppStatus::Complete => "실행 완료",
                AppStatus::Error(_) => "확인 필요",
            }}
        </span>
    }
}

/// Globally synchronized token selector.
#[must_use]
pub fn token_timeline(state: RwSignal<AppState>, client: WorkerClient) -> impl IntoView {
    view! {
        <section class="panel timeline-panel" aria-labelledby="timeline-title">
            <div class="panel-heading"><div><h2 id="timeline-title">"토큰 타임라인"</h2><p>"토큰을 고르면 모든 세부 보기가 같은 위치로 이동합니다."</p></div></div>
            <ol class="token-list">
                {move || state.get().summary.map_or_else(
                    || view! { <li class="empty">"실행 후 실제 토큰이 여기에 표시됩니다."</li> }.into_any(),
                    |summary| summary.tokens.into_iter().enumerate().map(|(index, token)| {
                        let token_client = client.clone();
                        let aria_label = format!("토큰 {index}, {}, ID {}", token.display, token.id.0);
                        view! {
                            <li><button
                                type="button"
                                class="token-chip"
                                aria-current=move || (state.get().selection.token == index).then_some("true")
                                aria-label=aria_label
                                on:click=move |_| {
                                    let mut request = None;
                                    state.update(|current| request = current.select_token(index));
                                    if let Some(request) = request { send_or_error(state, &token_client, &request); }
                                }
                            ><span>{token.display}</span><small>{format!("{index} / {}", token.id.0)}</small></button></li>
                        }
                    }).collect_view().into_any()
                )}
            </ol>
        </section>
    }
}

/// Model identity and GPT to block to attention drill-down tree.
#[must_use]
pub fn model_overview(state: RwSignal<AppState>, client: WorkerClient) -> impl IntoView {
    view! {
        <section class="panel model-panel" aria-labelledby="model-title">
            <h2 id="model-title">"모델 구조"</h2>
            {move || state.get().model.map_or_else(
                || view! { <p class="empty">"모델 메타데이터를 확인하고 있습니다."</p> }.into_any(),
                |model| view! {
                    <dl class="model-meta"><div><dt>"모델"</dt><dd>{model.name}</dd></div><div><dt>"파라미터"</dt><dd>{format_number(model.parameter_count)}</dd></div><div><dt>"구성"</dt><dd>"2 blocks / 4 heads / C=64"</dd></div></dl>
                    <nav class="model-tree" aria-label="Transformer 계층 탐색">
                        <strong>"GPT"</strong>
                        {(0..2).map(|layer| {
                            let layer_client = client.clone();
                            view! { <button type="button" aria-current=move || (state.get().selection.layer == layer).then_some("page") on:click=move |_| {
                                let mut request = None;
                                state.update(|current| request = current.select_layer(layer));
                                if let Some(request) = request { send_or_error(state, &layer_client, &request); }
                            }>{format!("Block {layer}")}</button> }
                        }).collect_view()}
                        <span class="tree-branch">"Attention"</span>
                        <div class="head-cluster">{(0..4).map(|head| {
                            let head_client = client.clone();
                            view! { <button type="button" aria-current=move || (state.get().selection.head == head).then_some("true") on:click=move |_| {
                                let mut request = None;
                                state.update(|current| request = current.select_head(head));
                                if let Some(request) = request { send_or_error(state, &head_client, &request); }
                            }>{format!("H{head}")}</button> }
                        }).collect_view()}</div>
                        <span class="tree-branch">"Tensor 값"</span>
                    </nav>
                }.into_any()
            )}
        </section>
    }
}

pub(crate) fn send_or_error(
    state: RwSignal<AppState>,
    client: &WorkerClient,
    request: &WorkerRequest,
) {
    if let Err(error) = client.send(request) {
        state.update(|current| current.status = AppStatus::Error(error.to_string()));
    }
}

fn format_number(value: u64) -> String {
    let text = value.to_string();
    text.as_bytes()
        .rchunks(3)
        .rev()
        .map(|chunk| String::from_utf8_lossy(chunk))
        .collect::<Vec<_>>()
        .join(",")
}
