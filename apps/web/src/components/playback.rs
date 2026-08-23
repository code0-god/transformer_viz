//! Accessible transport for the 18 real Worker tensor boundaries.

use std::time::Duration;

use leptos::prelude::*;

use crate::app::{
    playback::{PLAYBACK_STEP_COUNT, Playback, PlaybackSpeed},
    state::AppState,
};

#[derive(Clone, Copy)]
struct StepCopy {
    label: &'static str,
    formula: &'static str,
    explanation: &'static str,
}

const STEPS: [StepCopy; PLAYBACK_STEP_COUNT] = [
    StepCopy {
        label: "블록 입력",
        formula: "x₀",
        explanation: "선택 레이어로 들어온 residual stream입니다.",
    },
    StepCopy {
        label: "LN 1",
        formula: "x̂ = LN₁(x₀)",
        explanation: "특징별 규모를 맞춰 어텐션 입력을 안정화합니다.",
    },
    StepCopy {
        label: "Query",
        formula: "Q = x̂Wq",
        explanation: "각 토큰이 찾으려는 정보를 표현합니다.",
    },
    StepCopy {
        label: "Key",
        formula: "K = x̂Wk",
        explanation: "각 토큰이 제공하는 검색 표지를 표현합니다.",
    },
    StepCopy {
        label: "Value",
        formula: "V = x̂Wv",
        explanation: "선택된 뒤 전달될 토큰 정보를 표현합니다.",
    },
    StepCopy {
        label: "Score MatMul",
        formula: "S_h = Q_h @ K_hᵀ",
        explanation: "모든 query-key 쌍의 원시 유사도를 계산합니다.",
    },
    StepCopy {
        label: "Scale",
        formula: "Ŝ = S / √dₕ",
        explanation: "head 차원에 따라 점수 크기를 보정합니다.",
    },
    StepCopy {
        label: "Mask + softmax",
        formula: "A = softmax(mask(Ŝ))",
        explanation: "미래 위치를 차단하고 허용된 key 확률을 정규화합니다.",
    },
    StepCopy {
        label: "Value MatMul",
        formula: "Y_h = A_h @ V_h",
        explanation: "확률로 value를 가중합해 토큰별 문맥을 만듭니다.",
    },
    StepCopy {
        label: "Head merge",
        formula: "Yₘ = concat(heads)",
        explanation: "네 head 출력을 원래 특징 폭으로 다시 합칩니다.",
    },
    StepCopy {
        label: "Attention projection",
        formula: "Yₚ = YₘWo",
        explanation: "합친 head를 residual 특징 공간으로 투영합니다.",
    },
    StepCopy {
        label: "Residual 1",
        formula: "x₁ = x₀ + Yₚ",
        explanation: "어텐션 결과를 원래 정보 흐름에 더합니다.",
    },
    StepCopy {
        label: "LN 2",
        formula: "z = LN₂(x₁)",
        explanation: "MLP 전에 두 번째 정규화를 적용합니다.",
    },
    StepCopy {
        label: "MLP input",
        formula: "h₀ = z",
        explanation: "정규화된 residual stream이 MLP로 들어갑니다.",
    },
    StepCopy {
        label: "4C expansion",
        formula: "h₁ = h₀W₁ + b₁",
        explanation: "특징 폭을 C에서 4C로 확장합니다.",
    },
    StepCopy {
        label: "GELU",
        formula: "h₂ = GELU(h₁)",
        explanation: "정확한 GELU로 비선형 특징을 선택합니다.",
    },
    StepCopy {
        label: "MLP projection",
        formula: "h₃ = h₂W₂ + b₂",
        explanation: "활성 특징을 다시 C 폭으로 투영합니다.",
    },
    StepCopy {
        label: "Residual 2",
        formula: "x₂ = x₁ + h₃",
        explanation: "MLP 결과를 더해 선택 블록의 최종 출력을 만듭니다.",
    },
];

/// Real trace playback controls and synchronized operation explanation.
#[must_use]
pub fn playback_view(state: RwSignal<AppState>, playback: RwSignal<Playback>) -> impl IntoView {
    let timer_error = RwSignal::new(None::<String>);
    match set_interval_with_handle(
        move || playback.update(Playback::tick),
        Duration::from_millis(250),
    ) {
        Ok(handle) => on_cleanup(move || handle.clear()),
        Err(error) => timer_error.set(Some(format!("재생 시계를 시작하지 못했습니다: {error:?}"))),
    }
    view! {
        <section class="panel playback-panel" aria-labelledby="playback-title">
            <div class="panel-heading"><div><h2 id="playback-title">"18단계 데이터 경로"</h2><p>"선택한 실제 Worker 텐서를 따라 Transformer 블록을 재생합니다."</p></div><span class="coordinate">{move || format!("{:02} / 18", playback.get().step + 1)}</span></div>
            <div class="playback-track" role="list" aria-label="18단계 데이터 경로">
                {(0..PLAYBACK_STEP_COUNT).map(|index| view! {
                    <button id=format!("playback-step-{:02}", index + 1) type="button" role="listitem" aria-current=move || (playback.get().step == index).then_some("step") on:click=move |_| playback.update(|value| value.select(index))>
                        <span>{format!("{:02}", index + 1)}</span><strong>{STEPS[index].label}</strong>
                    </button>
                }).collect_view()}
            </div>
            {move || state.get().block.and_then(|trace| trace.operations.get(playback.get().step).cloned()).map_or_else(
                || view! { <p class="empty">"실행 후 18개 실제 연산을 재생할 수 있습니다."</p> }.into_any(),
                |selected| {
                    let step = STEPS[playback.get().step];
                    view! { <article class="playback-detail" aria-live="polite"><p class="formula">{step.formula}</p><p>{step.explanation}</p><dl><div><dt>"tensor"</dt><dd>{selected.tensor.label}</dd></div><div><dt>"shape"</dt><dd>{format!("{:?}", selected.tensor.shape)}</dd></div><div><dt>"mean / std"</dt><dd>{format!("{:.5} / {:.5}", selected.output.mean.get(), selected.output.std.get())}</dd></div></dl></article> }.into_any()
                }
            )}
            <div class="transport" role="group" aria-label="데이터 경로 재생 제어">
                <button id="playback-first" type="button" disabled=move || playback.get().step == 0 on:click=move |_| playback.update(Playback::first)>"처음"</button>
                <button id="playback-previous" type="button" disabled=move || playback.get().step == 0 on:click=move |_| playback.update(Playback::previous)>"이전"</button>
                <button id="playback-toggle" class="playback-toggle" type="button" disabled=move || state.get().block.is_none() aria-pressed=move || playback.get().playing.to_string() on:click=move |_| playback.update(Playback::toggle)>{move || if playback.get().playing { "정지" } else { "재생" }}</button>
                <button id="playback-next" type="button" disabled=move || playback.get().step == PLAYBACK_STEP_COUNT - 1 on:click=move |_| playback.update(Playback::next)>"다음"</button>
                <button id="playback-last" type="button" disabled=move || playback.get().step == PLAYBACK_STEP_COUNT - 1 on:click=move |_| playback.update(Playback::last)>"마지막"</button>
            </div>
            <div class="speed-control" role="group" aria-label="재생 속도">{[(PlaybackSpeed::Half, "0.5x"), (PlaybackSpeed::Normal, "1x"), (PlaybackSpeed::Double, "2x")].into_iter().map(|(speed, label)| view! { <button type="button" aria-pressed=move || (playback.get().speed == speed).to_string() on:click=move |_| playback.update(|value| value.set_speed(speed))>{label}</button> }).collect_view()}</div>
            {move || timer_error.get().map(|message| view! { <p class="inline-error" role="alert">{message}</p> })}
        </section>
    }
}
