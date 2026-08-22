//! Header, prompt disclosure, and current token context.

use leptos::prelude::*;
use nanogpt_schema::WorkerRequest;

use crate::app::{
    state::{AppState, AppStatus},
    worker_client::WorkerClient,
};

use super::scroll;

#[must_use]
pub(super) fn player_header(state: RwSignal<AppState>) -> impl IntoView {
    view! {
        <header class="player-header">
            <div class="brand-lockup">
                <h1>"Transformer Viz"</h1>
                <p>"실제 trace로 따라가는 Guided Learning Player"</p>
            </div>
            <div class="lifecycle" aria-live="polite">
                <span id="status" class="status-badge" data-status=move || state.with(|current| status_kind(&current.status))>
                    {move || state.with(|current| status_label(&current.status))}
                </span>
                <span class="lifecycle-detail">{move || state.with(status_detail)}</span>
            </div>
        </header>
    }
}

#[must_use]
pub(super) fn prompt_drawer(state: RwSignal<AppState>, client: WorkerClient) -> impl IntoView {
    let (prompt, set_prompt) = signal("the cat sat on the".to_owned());
    let run = move |_| {
        let mut request = None;
        state.update(|current| request = Some(current.run(&prompt.get_untracked())));
        if let Some(request) = request {
            send_or_error(state, &client, &request);
        }
    };
    view! {
        <section
            class="prompt-drawer"
            data-expanded=move || state.with(|current| current.ui.prompt_expanded.to_string())
            aria-labelledby="prompt-drawer-title"
        >
            <button
                id="prompt-drawer-title"
                class="prompt-disclosure"
                type="button"
                aria-expanded=move || state.with(|current| current.ui.prompt_expanded.to_string())
                aria-controls="prompt-drawer-body"
                on:click=move |_| state.update(|current| current.ui.prompt_expanded = !current.ui.prompt_expanded)
            >
                <span>"문장 실행"</span>
                <span>{move || state.with(|current| if current.ui.prompt_expanded { "입력 닫기" } else { "입력 열기" })}</span>
            </button>
            <div id="prompt-drawer-body" class="prompt-body" hidden=move || state.with(|current| !current.ui.prompt_expanded)>
                <label for="prompt">"분석할 문장"</label>
                <textarea
                    id="prompt"
                    rows="1"
                    prop:value=prompt
                    on:input=move |event| set_prompt.set(event_target_value(&event))
                />
                <button
                    id="run"
                    class="primary"
                    type="button"
                    aria-busy=move || state.with(|current| matches!(current.status, AppStatus::Running(_)).to_string())
                    on:click=run
                    disabled=move || state.with(|current| matches!(current.status, AppStatus::Loading(_) | AppStatus::Running(_)))
                >"실행"</button>
            </div>
            {move || state.with(|current| match &current.status {
                AppStatus::Error(message) => Some(view! {
                    <p class="prompt-error" role="alert">{format!("오류: {message} 입력을 확인하고 다시 실행하세요.")}</p>
                }),
                AppStatus::Loading(_) | AppStatus::Ready | AppStatus::Running(_) | AppStatus::Complete => None,
            })}
        </section>
    }
}

#[must_use]
pub(super) fn context_bar(state: RwSignal<AppState>, client: WorkerClient) -> impl IntoView {
    Effect::new(move |_| {
        if let Some(index) =
            state.with(|current| current.summary.as_ref().map(|_| current.selection.token))
        {
            scroll::reveal_item("token-reel", &format!("context-token-{index}"));
        }
    });
    view! {
        <section class="context-bar" aria-label="현재 학습 맥락">
            <div id="token-reel" class="token-reel" aria-label="실제 입력 토큰">
                {move || state.with(|current| current.summary.as_ref().map_or_else(
                    || view! { <p class="context-empty">"실행하면 실제 토큰 경로가 열립니다."</p> }.into_any(),
                    |summary| summary.tokens.iter().enumerate().map(|(index, token)| {
                        let token_client = client.clone();
                        let display = token.display.clone();
                        let token_text = token.display.clone();
                        let token_id = token.id.0;
                        view! {
                            <button
                                id=format!("context-token-{index}")
                                type="button"
                                class="context-token"
                                aria-current=move || state.with(|current| (current.selection.token == index).then_some("true"))
                                aria-label=move || state.with(|current| token_aria_label(current, index, &display, token_id))
                                on:click=move |_| {
                                    let mut request = None;
                                    state.update(|current| request = current.select_token(index));
                                    if let Some(request) = request { send_or_error(state, &token_client, &request); }
                                }
                            >
                                <span class="token-text">{token_text}</span>
                                <span class="token-id">{format!("{index}:{token_id}")}</span>
                                <span class="token-markers">
                                    <span class="query-marker" hidden=move || state.with(|current| current.selection.token != index)>"Q"</span>
                                    <span class="key-marker" hidden=move || state.with(|current| current.selection.key != index)>"K"</span>
                                </span>
                            </button>
                        }
                    }).collect_view().into_any()
                ))}
            </div>
            <div class="context-coordinates">
                <span class="breadcrumb">"GPT / Block / Attention"</span>
                <strong>{move || state.with(|current| format!("Layer {} · Head {}", current.selection.layer, current.selection.head))}</strong>
            </div>
        </section>
    }
}

pub(super) fn send_or_error(
    state: RwSignal<AppState>,
    client: &WorkerClient,
    request: &WorkerRequest,
) {
    if let Err(error) = client.send(request) {
        state.update(|current| current.status = AppStatus::Error(error.to_string()));
    }
}

fn token_aria_label(state: &AppState, index: usize, display: &str, token_id: u32) -> String {
    let query = if state.selection.token == index {
        " query Q"
    } else {
        ""
    };
    let key = if state.selection.key == index {
        " key K"
    } else {
        ""
    };
    format!("토큰 {index}, {display}, ID {token_id},{query}{key}")
}

const fn status_kind(status: &AppStatus) -> &'static str {
    match status {
        AppStatus::Loading(_) => "loading",
        AppStatus::Ready => "ready",
        AppStatus::Running(_) => "running",
        AppStatus::Complete => "complete",
        AppStatus::Error(_) => "error",
    }
}

const fn status_label(status: &AppStatus) -> &'static str {
    match status {
        AppStatus::Loading(_) => "모델 준비 중",
        AppStatus::Ready => "준비 완료",
        AppStatus::Running(_) => "Worker 실행 중",
        AppStatus::Complete => "실행 완료",
        AppStatus::Error(_) => "확인 필요",
    }
}

fn status_detail(state: &AppState) -> String {
    match &state.status {
        AppStatus::Loading(phase) | AppStatus::Running(phase) => phase.clone(),
        AppStatus::Ready => "문장을 실행할 수 있습니다.".to_owned(),
        AppStatus::Complete => state.summary.as_ref().map_or_else(
            || "추적 완료".to_owned(),
            |summary| format!("실제 Worker trace · {:.2} ms", summary.duration_ms.get()),
        ),
        AppStatus::Error(message) => format!("오류: {message}"),
    }
}
