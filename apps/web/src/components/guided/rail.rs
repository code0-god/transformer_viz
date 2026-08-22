//! Deterministic nine-stage narrative transport.

use std::time::Duration;

use leptos::prelude::*;

use crate::app::{
    narrative::{NARRATIVE_STAGE_COUNT, NarrativeSpeed, NarrativeStage},
    state::AppState,
};

use super::stage::stage_copy;

#[must_use]
pub(super) fn stage_rail(state: RwSignal<AppState>) -> impl IntoView {
    let timer_error = RwSignal::new(None::<String>);
    match set_interval_with_handle(
        move || state.update(|current| current.ui.tick_narrative()),
        Duration::from_millis(250),
    ) {
        Ok(handle) => on_cleanup(move || handle.clear()),
        Err(error) => timer_error.set(Some(format!("재생 시계를 시작하지 못했습니다: {error:?}"))),
    }
    view! {
        <nav class="stage-rail" aria-labelledby="stage-rail-title">
            <div class="rail-transport">
                <span id="stage-rail-title">"학습 경로"</span>
                <div class="transport-buttons" role="group" aria-label="단계 재생 제어">
                    <button type="button" disabled=move || state.get().ui.narrative.stage == NarrativeStage::Embedding on:click=move |_| state.update(|current| current.ui.previous_stage())>"이전"</button>
                    <button
                        class="play-toggle"
                        type="button"
                        disabled=move || state.get().summary.is_none()
                        aria-pressed=move || state.get().ui.narrative.playing.to_string()
                        on:click=move |_| state.update(|current| current.ui.toggle_narrative())
                    >{move || if state.get().ui.narrative.playing { "일시정지" } else { "재생" }}</button>
                    <button type="button" disabled=move || state.get().ui.narrative.stage == NarrativeStage::LanguageModelHead on:click=move |_| state.update(|current| current.ui.next_stage())>"다음"</button>
                </div>
                <div class="speed-buttons" role="group" aria-label="재생 속도">
                    {speed_button(state, NarrativeSpeed::Half, "0.5x")}
                    {speed_button(state, NarrativeSpeed::Normal, "1x")}
                    {speed_button(state, NarrativeSpeed::Double, "2x")}
                </div>
            </div>
            <div class="stage-reel" aria-label="아홉 단계">
                {NarrativeStage::ALL.into_iter().map(|stage| view! {
                    <button
                        type="button"
                        data-stage=stage.index()
                        data-progress=move || progress(&state.get(), stage)
                        aria-current=move || (state.get().ui.narrative.stage == stage).then_some("step")
                        on:click=move |_| state.update(|current| current.ui.select_stage(stage))
                    >
                        <span>{format!("{}", stage.index() + 1)}</span>
                        <strong>{stage_copy(stage).title}</strong>
                    </button>
                }).collect_view()}
            </div>
            {move || timer_error.get().map(|message| view! { <p class="rail-error" role="alert">{message}</p> })}
        </nav>
    }
}

fn speed_button(
    state: RwSignal<AppState>,
    speed: NarrativeSpeed,
    label: &'static str,
) -> impl IntoView {
    view! {
        <button
            type="button"
            aria-pressed=move || (state.get().ui.narrative.speed == speed).to_string()
            on:click=move |_| state.update(|current| current.ui.set_narrative_speed(speed))
        >{label}</button>
    }
}

const fn progress(state: &AppState, target_stage: NarrativeStage) -> &'static str {
    let current = state.ui.narrative.stage.index();
    let target = target_stage.index();
    match (target < current, target == current) {
        (true, _) => "complete",
        (false, true) => "current",
        (false, false) => "future",
    }
}

const _: () = assert!(NARRATIVE_STAGE_COUNT == 9);
