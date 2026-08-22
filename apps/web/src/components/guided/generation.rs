//! Generation-first prompt and applied-runtime controls.

use leptos::prelude::*;
use nanogpt_schema::SamplingMode;

use crate::app::{
    generation::{GenerationForm, GenerationPhase},
    state::{AppState, AppStatus},
    worker_client::WorkerClient,
};

use super::shell::send_or_error;

#[derive(Clone, Copy)]
struct GenerationSignals {
    prompt: ReadSignal<String>,
    max_tokens: ReadSignal<String>,
    temperature: ReadSignal<String>,
    top_k: ReadSignal<String>,
    mode: ReadSignal<SamplingMode>,
    seed: ReadSignal<String>,
    set_max_tokens: WriteSignal<String>,
    set_temperature: WriteSignal<String>,
    set_top_k: WriteSignal<String>,
    set_seed: WriteSignal<String>,
}

#[must_use]
pub(super) fn generation_controls(
    state: RwSignal<AppState>,
    client: WorkerClient,
) -> impl IntoView {
    let defaults = GenerationForm::default();
    let (prompt, set_prompt) = signal("the cat sat on the".to_owned());
    let (max_tokens, set_max_tokens) = signal(defaults.max_new_tokens);
    let (temperature, set_temperature) = signal(defaults.temperature);
    let (top_k, set_top_k) = signal(defaults.top_k);
    let (mode, set_mode) = signal(defaults.mode);
    let (seed, set_seed) = signal(defaults.seed);

    let generate = generate_handler(
        state,
        client.clone(),
        GenerationSignals {
            prompt,
            max_tokens,
            temperature,
            top_k,
            mode,
            seed,
            set_max_tokens,
            set_temperature,
            set_top_k,
            set_seed,
        },
    );

    let stop = stop_handler(state, client);

    view! {
        <section class="generation-controls" data-testid="generation-controls" aria-labelledby="generation-title">
            {generation_heading(state)}
            <div class="generation-form">
                <label class="prompt-field" for="generation-prompt">
                    <span>"Prompt"</span>
                    <textarea
                        id="generation-prompt"
                        rows="2"
                        prop:value=prompt
                        on:input=move |event| set_prompt.set(event_target_value(&event))
                    />
                </label>
                {number_field(
                    "max-new-tokens",
                    "Max new tokens",
                    max_tokens,
                    set_max_tokens,
                    "1",
                    move || state.with(|current| current.model.as_ref().map_or(1, |model| model.config.block_size)).to_string(),
                    "1",
                )}
                {number_field("temperature", "Temperature", temperature, set_temperature, "0.1", || "2".to_owned(), "0.1")}
                {number_field(
                    "top-k",
                    "Top-K",
                    top_k,
                    set_top_k,
                    "1",
                    move || state.with(|current| current.model.as_ref().map_or(1, |model| model.config.vocab_size)).to_string(),
                    "1",
                )}
                <label for="sampling-mode"><span>"Mode"</span>
                    <select id="sampling-mode" on:change=move |event| {
                        set_mode.set(if event_target_value(&event) == "greedy" { SamplingMode::Greedy } else { SamplingMode::Sample });
                    }>
                        <option value="sample" selected=move || mode.get() == SamplingMode::Sample>"Sample"</option>
                        <option value="greedy" selected=move || mode.get() == SamplingMode::Greedy>"Greedy"</option>
                    </select>
                </label>
                {number_field("seed", "Seed", seed, set_seed, "0", || u64::MAX.to_string(), "1")}
                <div class="generation-actions">
                    <button
                        type="button"
                        class="primary"
                        data-testid="generate"
                        aria-busy=move || state.with(|current| current.generation.pending.is_some().to_string())
                        disabled=move || state.with(|current| {
                            matches!(current.status, AppStatus::Loading(_)) || current.generation.pending.is_some()
                        })
                        on:click=generate
                    >{move || state.with(|current| if current.generation.pending.is_some() { "교체 요청 중" } else { "Generate" })}</button>
                    <button
                        type="button"
                        data-testid="stop-generation"
                        disabled=move || state.with(|current| current.generation.phase != GenerationPhase::Running)
                        on:click=stop
                    >"Stop"</button>
                </div>
            </div>
            <div class="generation-applied" role="group" aria-label="Worker 적용 설정">
                {move || state.with(|current| current.generation.config.as_ref().map(|config| view! {
                    <span>{format!("적용: {} tokens", config.max_new_tokens)}</span>
                    <span>{format!("T {:.1}", config.temperature.get())}</span>
                    <span>{format!("Top-K {}", config.top_k.get())}</span>
                    <span>{match config.mode { SamplingMode::Greedy => "Greedy", SamplingMode::Sample => "Sample" }}</span>
                    <span>{format!("seed {}", config.seed)}</span>
                }))}
            </div>
            {move || state.with(|current| current.generation.error.as_ref().map(|message| view! {
                <p class="generation-error" data-testid="generation-error" role="alert">{format!("생성 오류: {message} 설정이나 입력을 고친 뒤 다시 생성하세요.")}</p>
            }))}
        </section>
    }
}

fn stop_handler(
    state: RwSignal<AppState>,
    client: WorkerClient,
) -> impl Fn(leptos::ev::MouseEvent) {
    move |_| {
        if let Some(request) = state.with_untracked(AppState::stop_generation) {
            send_or_error(state, &client, &request);
        }
    }
}

fn generation_heading(state: RwSignal<AppState>) -> impl IntoView {
    view! {
        <div class="generation-heading">
            <div><h2 id="generation-title">"이어쓰기 생성"</h2><p>"작은 모델이 현재 문맥 전체를 다시 계산하며 다음 토큰을 한 개씩 선택합니다."</p></div>
            <span class="generation-model-limit">{move || state.with(|current| current.model.as_ref().map_or_else(
                || "모델 준비 중".to_owned(),
                |model| format!("한 모델 · 문맥 {} · 어휘 {}", model.config.block_size, model.config.vocab_size),
            ))}</span>
        </div>
    }
}

fn generate_handler(
    state: RwSignal<AppState>,
    client: WorkerClient,
    signals: GenerationSignals,
) -> impl Fn(leptos::ev::MouseEvent) {
    move |_| {
        let GenerationSignals {
            prompt,
            max_tokens,
            temperature,
            top_k,
            mode,
            seed,
            set_max_tokens,
            set_temperature,
            set_top_k,
            set_seed,
        } = signals;
        let limits = state.with(|current| {
            current
                .model
                .as_ref()
                .map(|model| (model.config.block_size, model.config.vocab_size))
        });
        let Some((block_size, vocab_size)) = limits else {
            return;
        };
        let form = GenerationForm {
            max_new_tokens: max_tokens.get_untracked(),
            temperature: temperature.get_untracked(),
            top_k: top_k.get_untracked(),
            mode: mode.get_untracked(),
            seed: seed.get_untracked(),
        };
        match form.parse(block_size, vocab_size) {
            Ok(config) => {
                set_max_tokens.set(config.max_new_tokens.to_string());
                set_temperature.set(config.temperature.get().to_string());
                set_top_k.set(config.top_k.get().to_string());
                set_seed.set(config.seed.to_string());
                let mut request = None;
                state.update(|current| {
                    request = Some(current.begin_generation(&prompt.get_untracked(), config));
                });
                if let Some(request) = request {
                    send_or_error(state, &client, &request);
                }
            }
            Err(error) => state.update(|current| {
                current.generation.error = Some(error.to_string());
            }),
        }
    }
}

fn number_field(
    id: &'static str,
    label: &'static str,
    value: ReadSignal<String>,
    set_value: WriteSignal<String>,
    min: &'static str,
    max: impl Fn() -> String + Send + Sync + 'static,
    step: &'static str,
) -> AnyView {
    view! {
        <label for=id><span>{label}</span>
            <input
                id=id
                type="number"
                min=min
                max=max
                step=step
                prop:value=value
                on:input=move |event| set_value.set(event_target_value(&event))
            />
        </label>
    }
    .into_any()
}
