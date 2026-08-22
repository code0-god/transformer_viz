//! Header, prompt disclosure, and current token context.

use leptos::prelude::*;
use nanogpt_schema::WorkerRequest;
use wasm_bindgen::JsCast as _;

use crate::app::{
    generation::GenerationPhase,
    state::{AppState, AppStatus},
    ui_state::ExplorerMode,
    worker_client::WorkerClient,
};

#[must_use]
pub(super) fn player_header(state: RwSignal<AppState>) -> impl IntoView {
    view! {
        <header class="player-header">
            <div class="brand-lockup">
                <h1>"Transformer Viz"</h1>
                <p>"실제 trace로 따라가는 Guided Learning Player"</p>
            </div>
            {mode_tabs(state)}
            <div class="lifecycle" aria-live="polite">
                <span id="status" class="status-badge" data-status=move || state.with(|current| status_kind(&current.status))>
                    {move || state.with(|current| status_label(&current.status))}
                </span>
                <span class="lifecycle-detail">{move || state.with(status_detail)}</span>
            </div>
        </header>
    }
}

fn mode_tabs(state: RwSignal<AppState>) -> impl IntoView {
    view! {
        <div class="mode-tabs" role="tablist" aria-label="탐색 모드">
            {mode_tab(state, ExplorerMode::Guided, "guided", "Guided")}
            {mode_tab(state, ExplorerMode::Explore, "explore", "Explore")}
        </div>
    }
}

fn mode_tab(
    state: RwSignal<AppState>,
    mode: ExplorerMode,
    id: &'static str,
    label: &'static str,
) -> impl IntoView {
    view! {
        <button id=format!("mode-{id}") type="button" role="tab" aria-controls="shared-workspace"
            aria-selected=move || state.with(|current| (current.ui.mode == mode).to_string())
            tabindex=move || state.with(|current| if current.ui.mode == mode { "0" } else { "-1" })
            on:click=move |_| state.update(|current| current.ui.select_mode(mode))
            on:keydown=move |event| if let Some(next) = mode.after_key(&event.key()) {
                event.prevent_default();
                state.update(|current| current.ui.select_mode(next));
                focus_mode(next);
            }
        >{label}</button>
    }
}

fn focus_mode(mode: ExplorerMode) {
    let id = if mode == ExplorerMode::Guided {
        "mode-guided"
    } else {
        "mode-explore"
    };
    if let Some(element) = web_sys::window()
        .and_then(|window| window.document())
        .and_then(|document| document.get_element_by_id(id))
        .and_then(|element| element.dyn_into::<web_sys::HtmlElement>().ok())
    {
        let _result = element.focus();
    }
}

#[must_use]
pub(super) fn context_bar(state: RwSignal<AppState>, client: WorkerClient) -> impl IntoView {
    view! {
        <section class="context-bar" aria-label="현재 생성 문맥">
            <div id="token-reel" class="token-reel" aria-label="현재 생성 문맥 토큰">
                {move || state.with(|current| {
                    let replay = current.generation.selected_step.and_then(|index| {
                        current.summary.as_ref().map(|summary| (index, summary.tokens.as_slice()))
                    });
                    let tokens = replay.map_or_else(
                        || {
                            current.generation.prompt_tokens.iter().chain(
                                current.generation.steps.iter().map(|step| &step.generated_token)
                            ).collect::<Vec<_>>()
                        },
                        |(_, tokens)| tokens.iter().collect::<Vec<_>>(),
                    );
                    if tokens.is_empty() {
                        return view! { <p class="context-empty">"Generate를 누르면 실제 생성 문맥이 여기에 쌓입니다."</p> }.into_any();
                    }
                    let next = replay.and_then(|(index, _)| current.generation.steps.get(index));
                    view! {
                        <div class="context-token-list">
                            {tokens.into_iter().enumerate().map(|(index, token)| {
                                context_token(state, replay.is_some().then_some(&client), index, token)
                            }).collect_view()}
                            {next.map(|step| view! {
                                <span class="selected-next-token" data-testid="selected-next-token">
                                    <small>"selected next"</small>
                                    <strong>{step.generated_token.display.clone()}</strong>
                                    <code>{step.generated_token.id.0}</code>
                                </span>
                            })}
                        </div>
                    }.into_any()
                })}
            </div>
            <div class="context-coordinates">
                <span class="breadcrumb">"GPT / Block / Attention"</span>
                <strong>{move || state.with(|current| format!("Layer {} · Head {}", current.selection.layer, current.selection.head))}</strong>
            </div>
        </section>
    }
}

fn context_token(
    state: RwSignal<AppState>,
    client: Option<&WorkerClient>,
    index: usize,
    token: &nanogpt_schema::TokenInfo,
) -> AnyView {
    let display = token.display.clone();
    let token_id = token.id.0;
    let Some(client) = client.cloned() else {
        return view! {
            <span class="context-token" data-trace-ready="false">
                <span class="token-text">{display}</span>
                <span class="token-id">{format!("{index}:{token_id}")}</span>
            </span>
        }
        .into_any();
    };
    view! {
        <button
            type="button"
            class="context-token"
            data-trace-ready="true"
            aria-current=move || state.with(|current| (current.selection.token == index).then_some("true"))
            aria-label=format!("재생 문맥 토큰 {index}, {display}, ID {token_id}")
            on:click=move |_| {
                let mut request = None;
                state.update(|current| request = current.select_token(index));
                if let Some(request) = request { send_or_error(state, &client, &request); }
            }
        >
            <span class="token-text">{display.clone()}</span>
            <span class="token-id">{format!("{index}:{token_id}")}</span>
            <span class="token-markers">
                <span class="query-marker" hidden=move || state.with(|current| current.selection.token != index)>"Q"</span>
                <span class="key-marker" hidden=move || state.with(|current| current.selection.key != index)>"K"</span>
            </span>
        </button>
    }.into_any()
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
            || match state.generation.phase {
                GenerationPhase::Finished(reason) => format!(
                    "생성 완료 · {reason:?} · {} tokens",
                    state.generation.steps.len()
                ),
                GenerationPhase::Idle | GenerationPhase::Running => "생성 대기".to_owned(),
            },
            |summary| format!("실제 Worker trace · {:.2} ms", summary.duration_ms.get()),
        ),
        AppStatus::Error(message) => format!("오류: {message}"),
    }
}
