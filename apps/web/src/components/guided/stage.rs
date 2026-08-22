//! Nine-stage Korean learning catalog and dominant stage canvas.

use leptos::prelude::*;

use crate::app::{narrative::NarrativeStage, state::AppState, worker_client::WorkerClient};

use super::visuals;

#[derive(Clone, Copy)]
pub(super) struct StageCopy {
    pub title: &'static str,
    pub purpose: &'static str,
    pub formula: &'static str,
    pub bridge: &'static str,
}

pub(super) const STAGE_COPY: [StageCopy; 9] = [
    StageCopy {
        title: "임베딩",
        purpose: "토큰과 위치 정보를 같은 residual stream에 놓습니다.",
        formula: "x₀ = token_embedding + position_embedding",
        bridge: "다음: 어텐션이 읽기 좋은 규모로 입력을 정규화합니다.",
    },
    StageCopy {
        title: "Attention LayerNorm",
        purpose: "특징의 규모를 맞춰 어텐션 입력을 안정화합니다.",
        formula: "x̂ = LN₁(x₀)",
        bridge: "다음: 정규화된 입력에서 Q, K, V를 만듭니다.",
    },
    StageCopy {
        title: "Q/K/V",
        purpose: "찾을 정보, 제공할 표지, 전달할 내용을 각각 투영합니다.",
        formula: "Q = x̂Wq · K = x̂Wk · V = x̂Wv",
        bridge: "다음: query와 key의 내적으로 관련성 점수를 계산합니다.",
    },
    StageCopy {
        title: "Attention Score",
        purpose: "각 query-key 쌍의 원시 관련성을 head 폭에 맞춰 조정합니다.",
        formula: "S = QKᵀ / √dₕ",
        bridge: "다음: 아직 보지 못한 미래 위치를 차단합니다.",
    },
    StageCopy {
        title: "Causal Mask",
        purpose: "현재 토큰이 미래 key를 참고하지 못하게 제한합니다.",
        formula: "S′ᵢⱼ = Sᵢⱼ if j ≤ i, else −∞",
        bridge: "다음: 허용된 점수를 합이 1인 확률로 바꿉니다.",
    },
    StageCopy {
        title: "Softmax",
        purpose: "허용된 key 사이의 주의 비율을 확률로 정규화합니다.",
        formula: "A = softmax(S′)",
        bridge: "다음: 확률을 사용해 실제 value 정보를 모읍니다.",
    },
    StageCopy {
        title: "Value + Residual",
        purpose: "value 가중합을 원래 정보 흐름에 다시 더합니다.",
        formula: "x₁ = x₀ + concat(AV)Wₒ",
        bridge: "다음: MLP가 토큰별 특징을 확장하고 다시 합칩니다.",
    },
    StageCopy {
        title: "MLP + Residual",
        purpose: "비선형 특징 변환을 거친 출력을 residual stream에 더합니다.",
        formula: "x₂ = x₁ + GELU(LN₂(x₁)W₁)W₂",
        bridge: "다음: 최종 표현을 어휘 전체의 예측 점수로 읽습니다.",
    },
    StageCopy {
        title: "Prediction",
        purpose: "최종 표현을 실제 어휘 logits와 다음 토큰 확률로 변환합니다.",
        formula: "p(token) = softmax(LN_f(x)Wₑᵀ)",
        bridge: "완료: 다른 토큰과 좌표를 선택해 같은 경로를 다시 검증해 보세요.",
    },
];

pub(super) const fn stage_copy(stage: NarrativeStage) -> StageCopy {
    STAGE_COPY[stage.index()]
}

#[must_use]
pub(super) fn main_stage(state: RwSignal<AppState>, client: WorkerClient) -> impl IntoView {
    view! {
        <main id="main-stage" class="stage-canvas" tabindex="-1">
            <div class="stage-heading" aria-live="polite">
                <span class="stage-position">{move || state.with(|current| format!("Stage {} / 9", current.ui.narrative.stage.index() + 1))}</span>
                <h2>{move || state.with(|current| stage_copy(current.ui.narrative.stage).title)}</h2>
                <p>{move || state.with(|current| stage_copy(current.ui.narrative.stage).purpose)}</p>
            </div>
            <div class="formula-band"><span>"formula"</span><code>{move || state.with(|current| stage_copy(current.ui.narrative.stage).formula)}</code></div>
            <section class="trace-evidence" aria-labelledby="trace-evidence-title">
                <div class="evidence-heading"><h3 id="trace-evidence-title">"현재 trace 증거"</h3><span>{move || state.with(coordinate_label)}</span></div>
                {move || visuals::stage_visual(state, &client)}
            </section>
            <p class="stage-bridge">{move || state.with(|current| stage_copy(current.ui.narrative.stage).bridge)}</p>
        </main>
    }
}

fn coordinate_label(state: &AppState) -> String {
    format!(
        "L{} · H{} · q{} · k{}",
        state.selection.layer, state.selection.head, state.selection.token, state.selection.key
    )
}
