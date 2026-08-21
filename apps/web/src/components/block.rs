//! Transformer block, residual, and MLP views.

use leptos::prelude::*;

use crate::app::state::AppState;

/// Selected block operation flow and residual comparison.
#[must_use]
pub fn block_view(state: RwSignal<AppState>) -> impl IntoView {
    view! {
        <section class="panel block-panel" aria-labelledby="block-title">
            <div class="panel-heading"><div><h2 id="block-title">"Transformer 블록"</h2><p>"정규화, 어텐션, MLP와 두 잔차 연결을 순서대로 봅니다."</p></div><span class="coordinate">{move || format!("L{}", state.get().selection.layer)}</span></div>
            {move || state.get().block.map_or_else(
                || view! { <p class="empty">"블록을 선택하면 Worker가 캐시된 입력에서 실제 연산을 재생합니다."</p> }.into_any(),
                |trace| view! {
                    <div class="operation-flow" role="list" aria-label="블록 연산 순서">
                        {trace.operations.into_iter().map(|operation| view! {
                            <div class="operation" role="listitem"><strong>{operation_name(operation.operation)}</strong><span>{format!("μ {:.4} / σ {:.4}", operation.output.mean.get(), operation.output.std.get())}</span></div>
                        }).collect_view()}
                    </div>
                    <div class="residual-grid">
                        <article><h3>"Attention + residual"</h3><p>"동일한 C=64 특징 공간에서 입력과 어텐션 출력을 더합니다."</p>{stats_view(&trace.attention_residual.stats)}</article>
                        <article><h3>"MLP + residual"</h3><p>"C=64 출력이 원래 특징 스트림에 다시 합쳐집니다."</p>{stats_view(&trace.output.stats)}</article>
                    </div>
                    {mlp_view(&trace.mlp)}
                }.into_any()
            )}
        </section>
    }
}

fn mlp_view(trace: &nanogpt_schema::MlpTrace) -> impl IntoView + use<> {
    view! {
        <div class="mlp-view" aria-label="MLP 차원 흐름">
            <h3>"MLP 확장과 축소"</h3>
            <svg viewBox="0 0 640 128" role="img" aria-labelledby="mlp-svg-title mlp-svg-desc">
                <title id="mlp-svg-title">"MLP C에서 4C를 거쳐 C로 변환"</title>
                <desc id="mlp-svg-desc">"64개 특징이 256개로 확장되고 GELU 활성화 뒤 다시 64개로 투영됩니다."</desc>
                <path class="flow-line" d="M110 64 H245 M395 64 H530" />
                <rect class="flow-node" x="20" y="28" width="90" height="72" rx="10" /><text x="65" y="60">"C"</text><text x="65" y="82">"64"</text>
                <rect class="flow-node active" x="245" y="16" width="150" height="96" rx="10" /><text x="320" y="56">"4C + GELU"</text><text x="320" y="80">"256"</text>
                <rect class="flow-node" x="530" y="28" width="90" height="72" rx="10" /><text x="575" y="60">"C"</text><text x="575" y="82">"64"</text>
            </svg>
            <div class="stats-row">{stats_view(&trace.input.stats)}{stats_view(&trace.hidden.stats)}{stats_view(&trace.output.stats)}</div>
        </div>
    }
}

#[must_use]
pub(crate) fn stats_view(stats: &nanogpt_schema::TensorStats) -> impl IntoView + use<> {
    let min = stats.min;
    let max = stats.max;
    let mean = stats.mean;
    let l2_norm = stats.l2_norm;
    view! { <dl class="mini-stats"><div><dt>"min"</dt><dd>{format!("{:.5}", min.get())}</dd></div><div><dt>"max"</dt><dd>{format!("{:.5}", max.get())}</dd></div><div><dt>"mean"</dt><dd>{format!("{:.5}", mean.get())}</dd></div><div><dt>"L2"</dt><dd>{format!("{:.5}", l2_norm.get())}</dd></div></dl> }
}

const fn operation_name(operation: nanogpt_schema::OperationId) -> &'static str {
    use nanogpt_schema::OperationId;
    match operation {
        OperationId::Embedding => "Embedding",
        OperationId::AttentionLayerNorm => "LN 1",
        OperationId::QueryKeyValue => "Q / K / V",
        OperationId::Attention => "Causal attention",
        OperationId::AttentionResidual => "Attention residual",
        OperationId::MlpLayerNorm => "LN 2",
        OperationId::Mlp => "MLP",
        OperationId::MlpResidual => "MLP residual",
        OperationId::FinalLayerNorm => "Final LN",
        OperationId::Logits => "Tied logits",
    }
}
