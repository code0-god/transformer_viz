//! Decoded continuation, raw token timeline, and terminal usage.

use leptos::prelude::*;
use nanogpt_schema::{GenerationStopReason, TokenInfo};

use crate::app::{generation::GenerationPhase, state::AppState, worker_client::WorkerClient};

use super::{scroll, shell::send_or_error};

#[must_use]
pub(super) fn generation_timeline(
    state: RwSignal<AppState>,
    client: WorkerClient,
) -> impl IntoView {
    Effect::new(move |_| {
        if let Some(index) = state.with(|current| current.generation.steps.len().checked_sub(1)) {
            scroll::reveal_item("generated-token-reel", &format!("generated-token-{index}"));
        }
    });
    view! {
        <section
            class="generation-timeline"
            class:generation-empty=move || state.with(|current| current.generation.phase == GenerationPhase::Idle && current.generation.steps.is_empty())
            aria-labelledby="continuation-title"
        >
            <div class="decoded-output">
                <div class="decoded-heading">
                    <h2 id="continuation-title">"Decoded continuation"</h2>
                    <span data-testid="generation-status" aria-live="polite">
                        {move || state.with(|current| phase_label(current.generation.phase, current.generation.steps.len()))}
                    </span>
                </div>
                <p class="decoded-text">
                    <span class="decoded-prompt">{move || state.with(|current| current.generation.prompt_text.clone())}</span>
                    <span class="decoded-continuation" data-testid="decoded-continuation">{move || state.with(|current| current.generation.decoded_continuation())}</span>
                </p>
            </div>
            <div class="raw-tokens">
                <div class="raw-group raw-prompt" data-testid="raw-prompt-tokens" aria-label="원문 prompt 토큰">
                    <strong>"Prompt tokens"</strong>
                    <div class="raw-token-reel">
                        {move || state.with(|current| current.generation.prompt_tokens.iter().enumerate().map(|(index, token)| {
                            token_chip(index, token)
                        }).collect_view())}
                    </div>
                </div>
                <div class="raw-group raw-generated" aria-label="생성된 토큰">
                    <strong>"Generated tokens"</strong>
                    <div id="generated-token-reel" class="raw-token-reel generated-reel">
                        <For
                            each=move || state.with(|current| {
                                let run_id = current.generation.active.map_or(0, |active| active.run_id);
                                current.generation.steps.iter().cloned().map(|step| (run_id, step)).collect::<Vec<_>>()
                            })
                            key=|(run_id, step)| (*run_id, step.index)
                            children=move |(run_id, step)| {
                                let index = step.index;
                                let token = step.generated_token;
                                let token_client = client.clone();
                                view! {
                                    <button
                                        id=format!("generated-token-{index}")
                                        type="button"
                                        class="generated-token"
                                        data-testid=format!("generated-token-{index}")
                                        data-generation-run-id=run_id
                                        data-step-index=index
                                        aria-pressed=move || state.with(|current| (current.generation.selected_step == Some(index)).to_string())
                                        aria-current=move || state.with(|current| (current.generation.selected_step == Some(index)).then_some("step"))
                                        aria-label=format!("생성 토큰 {index}, {}, ID {}, bytes {:?}", token.display, token.id.0, token.piece)
                                        on:click=move |_| {
                                            let mut request = None;
                                            state.update(|current| request = current.inspect_generation_step(index));
                                            if let Some(request) = request { send_or_error(state, &token_client, &request); }
                                        }
                                    >
                                        <span class="token-text">{token.display.clone()}</span>
                                        <span class="token-id">{format!("{index}:{}", token.id.0)}</span>
                                        <span class="token-bytes">{format!("{:?}", token.piece)}</span>
                                    </button>
                                }
                            }
                        />
                    </div>
                </div>
            </div>
            <div
                class="generation-usage"
                data-testid="generation-usage"
                data-context-used=move || state.with(|current| current.generation.context_used().to_string())
                data-context-limit=move || state.with(|current| current.generation.context_limit.to_string())
                data-generated-count=move || state.with(|current| current.generation.steps.len().to_string())
                data-stop-reason=move || state.with(|current| match current.generation.phase {
                    GenerationPhase::Finished(reason) => stop_reason(reason),
                    GenerationPhase::Idle | GenerationPhase::Running => "running",
                })
            >
                {move || state.with(|current| {
                    let generation = &current.generation;
                    let reason = match generation.phase {
                        GenerationPhase::Finished(reason) => stop_reason(reason),
                        GenerationPhase::Idle | GenerationPhase::Running => "진행 중",
                    };
                    format!(
                        "종료: {reason} · 문맥 {}/{} · 생성 {} · 총 {:.2} ms · KV cache 없음: 매 토큰마다 전체 문맥 forward · 한 모델/고정 block size",
                        generation.context_used(),
                        generation.context_limit,
                        generation.steps.len(),
                        generation.total_ms(),
                    )
                })}
            </div>
        </section>
    }
}

fn token_chip(index: usize, token: &TokenInfo) -> AnyView {
    view! {
        <span class="raw-token" title=format!("bytes {:?}", token.piece)>
            <span class="token-text">{token.display.clone()}</span>
            <span class="token-id">{format!("{index}:{}", token.id.0)}</span>
            <span class="token-bytes">{format!("{:?}", token.piece)}</span>
        </span>
    }
    .into_any()
}

fn phase_label(phase: GenerationPhase, count: usize) -> String {
    match phase {
        GenerationPhase::Idle => "생성 대기".to_owned(),
        GenerationPhase::Running => format!("토큰 {count}개 스트리밍"),
        GenerationPhase::Finished(reason) => format!("완료 · {}", stop_reason(reason)),
    }
}

const fn stop_reason(reason: GenerationStopReason) -> &'static str {
    match reason {
        GenerationStopReason::MaxNewTokens => "max_new_tokens",
        GenerationStopReason::EndOfSequence => "end_of_sequence",
        GenerationStopReason::ContextLimit => "context_limit",
        GenerationStopReason::UserStopped => "user_stopped",
        GenerationStopReason::Replaced => "replaced",
        GenerationStopReason::Error => "error",
    }
}
