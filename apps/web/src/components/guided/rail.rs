//! Deterministic transport and grouped 21-step curriculum.

use super::{scroll, stage_copy::stage_copy};
use crate::app::{
    narrative::{CurriculumGroup, NARRATIVE_STAGE_COUNT, NarrativeSpeed, NarrativeStage},
    state::AppState,
};
use leptos::prelude::*;
use std::time::Duration;

#[must_use]
pub(super) fn rail_transport(app_state: RwSignal<AppState>) -> impl IntoView {
    view! {
        <div class="rail-transport" role="group" aria-label="학습 경로 재생 제어">
            <span>"학습 경로 · 21 steps"</span>
            <div class="transport-buttons" role="group" aria-label="단계 재생 제어">
                <button type="button" disabled=move || at(app_state, NarrativeStage::Tokenization) on:click=move |_| app_state.update(|current| current.ui.previous_stage())>"이전"</button>
                <button class="play-toggle" type="button"
                    aria-pressed=move || app_state.with(|current| current.ui.narrative.playing.to_string())
                    on:click=move |_| app_state.update(|current| current.ui.toggle_narrative())
                >{move || app_state.with(|current| if current.ui.narrative.playing { "일시정지" } else { "재생" })}</button>
                <button type="button" disabled=move || at(app_state, NarrativeStage::Repeat) on:click=move |_| app_state.update(|current| current.ui.next_stage())>"다음"</button>
            </div>
            <div class="speed-buttons" role="group" aria-label="재생 속도">
                {speed_button(app_state, NarrativeSpeed::Half, "0.5x")}
                {speed_button(app_state, NarrativeSpeed::Normal, "1x")}
                {speed_button(app_state, NarrativeSpeed::Double, "2x")}
            </div>
        </div>
    }
}

#[must_use]
pub(super) fn curriculum_rail(app_state: RwSignal<AppState>) -> impl IntoView {
    let timer_error = RwSignal::new(None::<String>);
    Effect::new(move |_| {
        let concept = app_state.with(|current| current.ui.narrative.stage);
        scroll::reveal_item(
            &format!("curriculum-{}-steps", concept.group().slug()),
            &format!("curriculum-stage-{}", concept.index()),
        );
    });
    match set_interval_with_handle(
        move || {
            if app_state.with_untracked(|current| current.ui.narrative.playing) {
                app_state.update(|current| current.ui.tick_narrative());
            }
        },
        Duration::from_millis(250),
    ) {
        Ok(handle) => on_cleanup(move || handle.clear()),
        Err(error) => timer_error.set(Some(format!("재생 시계를 시작하지 못했습니다: {error:?}"))),
    }
    view! {
        <nav class="curriculum-rail" aria-label="학습 경로 · 21 steps">
            <div class="curriculum-groups" aria-label="21단계 그룹 학습 경로">
                {CurriculumGroup::ALL.into_iter().map(|group| group_part(app_state, group)).collect_view()}
            </div>
            {move || timer_error.get().map(|message| view! { <p class="rail-error" role="alert">{message}</p> })}
        </nav>
    }
}

fn group_part(state: RwSignal<AppState>, group: CurriculumGroup) -> impl IntoView {
    view! {
        <section class="curriculum-group" data-current=move || state.with(|current| (current.ui.narrative.stage.group() == group).to_string())>
            <h3><button
                type="button"
                class="curriculum-group-toggle"
                data-testid=format!("curriculum-group-{}", group.slug())
                aria-expanded=move || state.with(|current| (current.ui.narrative.stage.group() == group).to_string())
                aria-controls=format!("curriculum-{}-steps", group.slug())
                on:click=move |_| state.update(|current| current.ui.select_stage(group.first_stage()))
            >{group.label()}</button></h3>
            <div id=format!("curriculum-{}-steps", group.slug()) class="stage-reel" hidden=move || state.with(|current| current.ui.narrative.stage.group() != group)>
                {NarrativeStage::ALL.into_iter().filter(move |stage| stage.group() == group).map(|stage| view! {
                    <button id=format!("curriculum-stage-{}", stage.index()) type="button" data-stage=stage.index()
                        data-progress=move || state.with(|current| progress(current, stage))
                        aria-current=move || state.with(|current| (current.ui.narrative.stage == stage).then_some("step"))
                        on:click=move |_| state.update(|current| current.ui.select_stage(stage))
                    ><span>{stage.index() + 1}</span><strong>{stage_copy(stage).title}</strong></button>
                }).collect_view()}
            </div>
        </section>
    }
}

fn speed_button(
    state: RwSignal<AppState>,
    speed: NarrativeSpeed,
    label: &'static str,
) -> impl IntoView {
    view! { <button type="button" aria-pressed=move || state.with(|current| (current.ui.narrative.speed == speed).to_string()) on:click=move |_| state.update(|current| current.ui.set_narrative_speed(speed))>{label}</button> }
}
fn at(app_state: RwSignal<AppState>, concept: NarrativeStage) -> bool {
    app_state.with(|current| current.ui.narrative.stage == concept)
}
fn progress(state: &AppState, target: NarrativeStage) -> &'static str {
    if target.index() < state.ui.narrative.stage.index() {
        "complete"
    } else if target == state.ui.narrative.stage {
        "current"
    } else {
        "future"
    }
}
const _: () = assert!(NARRATIVE_STAGE_COUNT == 21);
