//! Nine-stage Korean learning catalog and dominant stage canvas.

use leptos::prelude::*;
use nanogpt_schema::{TensorSnapshot, TensorStats};

use crate::app::{narrative::NarrativeStage, state::AppState};

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
pub(super) fn main_stage(state: RwSignal<AppState>) -> impl IntoView {
    view! {
        <main id="main-stage" class="stage-canvas" tabindex="-1">
            <div class="stage-heading" aria-live="polite">
                <span class="stage-position">{move || format!("Stage {} / 9", state.get().ui.narrative.stage.index() + 1)}</span>
                <h2>{move || stage_copy(state.get().ui.narrative.stage).title}</h2>
                <p>{move || stage_copy(state.get().ui.narrative.stage).purpose}</p>
            </div>
            <div class="formula-band"><span>"formula"</span><code>{move || stage_copy(state.get().ui.narrative.stage).formula}</code></div>
            <section class="trace-evidence" aria-labelledby="trace-evidence-title">
                <div class="evidence-heading"><h3 id="trace-evidence-title">"현재 trace 증거"</h3><span>{move || coordinate_label(&state.get())}</span></div>
                {move || evidence_view(&state.get())}
            </section>
            <p class="stage-bridge">{move || stage_copy(state.get().ui.narrative.stage).bridge}</p>
        </main>
    }
}

fn evidence_view(state: &AppState) -> AnyView {
    match state.ui.narrative.stage {
        NarrativeStage::Embedding => state.summary.as_ref().map_or_else(
            empty_trace,
            |summary| tensor_evidence(&summary.embeddings.sum, "token + position"),
        ),
        NarrativeStage::AttentionLayerNorm => operation_tensor(state).map_or_else(
            empty_trace,
            |tensor| tensor_evidence(tensor, "선택 블록 연산"),
        ),
        NarrativeStage::QueryKeyValue => state.attention.as_ref().map_or_else(
            empty_trace,
            |trace| three_tensor_evidence(&trace.query, &trace.key, &trace.value),
        ),
        NarrativeStage::AttentionScores => state.attention.as_ref().map_or_else(
            empty_trace,
            |trace| tensor_evidence(&trace.scaled_scores, "scaled QKᵀ"),
        ),
        NarrativeStage::CausalMask => state.attention.as_ref().map_or_else(
            empty_trace,
            |trace| view! {
                <dl class="evidence-grid"><div><dt>"mask shape"</dt><dd>{format!("{} × {}", trace.mask.rows, trace.mask.cols)}</dd></div><div><dt>"selected cell"</dt><dd>{format!("q{} × k{}", state.selection.token, state.selection.key)}</dd></div><div><dt>"state"</dt><dd>{if state.selection.key <= state.selection.token { "허용" } else { "미래 차단" }}</dd></div></dl>
            }.into_any(),
        ),
        NarrativeStage::Softmax => state.attention.as_ref().map_or_else(
            empty_trace,
            |trace| tensor_evidence(&trace.probabilities, "attention probabilities"),
        ),
        NarrativeStage::ValueAggregation => state.attention.as_ref().map_or_else(
            empty_trace,
            |trace| tensor_evidence(&trace.output, "attention × value"),
        ),
        NarrativeStage::MlpAndResidual => state.block.as_ref().map_or_else(
            empty_trace,
            |trace| tensor_evidence(&trace.output, "block residual output"),
        ),
        NarrativeStage::LanguageModelHead => state.summary.as_ref().map_or_else(
            empty_trace,
            |summary| view! {
                <div class="prediction-evidence">
                    {tensor_facts(&summary.logits.logits)}
                    <ol class="top-k-list" aria-label="실제 다음 토큰 Top-10">
                        {summary.logits.top_k.iter().enumerate().map(|(rank, candidate)| view! {
                            <li><span>{rank + 1}</span><strong>{display_token(&candidate.display)}</strong><code>{format!("{:.4}%", candidate.probability.get() * 100.0)}</code></li>
                        }).collect_view()}
                    </ol>
                </div>
            }.into_any(),
        ),
    }
}

fn operation_tensor(state: &AppState) -> Option<&TensorSnapshot> {
    let index = state.ui.detail_operation?;
    state
        .block
        .as_ref()?
        .operations
        .get(index)
        .map(|operation| &operation.tensor)
}

fn tensor_evidence(tensor: &TensorSnapshot, role: &'static str) -> AnyView {
    view! { <div class="tensor-evidence"><span class="evidence-role">{role}</span>{tensor_facts(tensor)}</div> }.into_any()
}

fn three_tensor_evidence(
    query: &TensorSnapshot,
    key: &TensorSnapshot,
    value: &TensorSnapshot,
) -> AnyView {
    view! {
        <div class="qkv-evidence">
            {marked_tensor("Q", "query", query)}
            {marked_tensor("K", "key", key)}
            {marked_tensor("V", "value", value)}
        </div>
    }
    .into_any()
}

fn marked_tensor(
    marker: &'static str,
    label: &'static str,
    tensor: &TensorSnapshot,
) -> impl IntoView + use<> {
    let id = tensor.id.clone();
    let shape = tensor.shape.clone();
    view! { <article class=format!("marked-tensor marker-{}", marker.to_lowercase())><span>{marker}</span><div><strong>{label}</strong><code>{id}</code><small>{format!("{shape:?}")}</small></div></article> }
}

fn tensor_facts(tensor: &TensorSnapshot) -> impl IntoView + use<> {
    let id = tensor.id.clone();
    let label = tensor.label.clone();
    let shape = tensor.shape.clone();
    let stats = tensor.stats.clone();
    view! {
        <dl class="evidence-grid">
            <div><dt>"stable id"</dt><dd><code>{id}</code></dd></div>
            <div><dt>"tensor"</dt><dd>{label}</dd></div>
            <div><dt>"shape"</dt><dd><code>{format!("{shape:?}")}</code></dd></div>
            {stat_fact("mean", &stats)}
        </dl>
    }
}

fn stat_fact(label: &'static str, stats: &TensorStats) -> impl IntoView + use<> {
    let mean = stats.mean;
    view! { <div><dt>{label}</dt><dd><code>{format!("{:.6}", mean.get())}</code></dd></div> }
}

fn empty_trace() -> AnyView {
    view! { <p class="empty-state">"문장을 실행하면 이 단계의 실제 tensor 증거가 표시됩니다."</p> }
        .into_any()
}

fn coordinate_label(state: &AppState) -> String {
    format!(
        "L{} · H{} · q{} · k{}",
        state.selection.layer, state.selection.head, state.selection.token, state.selection.key
    )
}

fn display_token(token: &str) -> String {
    match token {
        " " => "공백".to_owned(),
        "\n" => "줄바꿈".to_owned(),
        value => value.to_owned(),
    }
}
