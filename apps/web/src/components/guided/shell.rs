//! Header, prompt disclosure, and current token context.

use leptos::prelude::*;
use nanogpt_schema::WorkerRequest;

use crate::{
    app::{
        generation::GenerationPhase,
        state::{AppState, AppStatus},
        worker_client::WorkerClient,
    },
    components::guided::scroll,
};

#[must_use]
pub(super) fn player_header(state: RwSignal<AppState>) -> impl IntoView {
    view! {
        <header class="architecture-header">
            <div class="brand-lockup">
                <h1>"Transformer Viz"</h1>
                <p>"GPT형 Transformer가 텍스트를 생성하는 과정을 탐색합니다."</p>
            </div>
            <div
                class=move || state.with(|current| if matches!(current.status, AppStatus::Error(_)) {
                    "lifecycle lifecycle-error"
                } else {
                    "lifecycle"
                })
                role=move || state.with(|current| if matches!(current.status, AppStatus::Error(_)) {
                    "alert"
                } else {
                    "status"
                })
                aria-live=move || state.with(|current| if matches!(current.status, AppStatus::Error(_)) {
                    "assertive"
                } else {
                    "polite"
                })
            >
                <span id="status" class="status-badge" data-status=move || state.with(|current| status_kind(&current.status))>
                    {move || state.with(|current| status_label(&current.status))}
                </span>
                <span class="lifecycle-detail">{move || state.with(status_detail)}</span>
            </div>
        </header>
    }
}

#[must_use]
pub(super) fn context_bar(state: RwSignal<AppState>, client: WorkerClient) -> impl IntoView {
    Effect::new(move |_| {
        let newest = state.with(|current| {
            (!current.generation.steps.is_empty()).then(|| {
                current.generation.prompt_tokens.len() + current.generation.steps.len() - 1
            })
        });
        if let Some(index) = newest {
            scroll::reveal_item("token-reel", &format!("context-token-{index}"));
        }
    });
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
            <span id=format!("context-token-{index}") class="context-token" data-trace-ready="false">
                <span class="token-text">{display}</span>
                <span class="token-id">{format!("{index}:{token_id}")}</span>
            </span>
        }
        .into_any();
    };
    view! {
        <button
            id=format!("context-token-{index}")
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
        let message = error.to_string();
        state.update(|current| current.request_send_failed(request, &message));
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
        AppStatus::Loading(_) => "Model Loading",
        AppStatus::Ready => "Model Ready",
        AppStatus::Running(_) => "Generating",
        AppStatus::Complete => "Model Ready",
        AppStatus::Error(_) => "Model Error",
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
