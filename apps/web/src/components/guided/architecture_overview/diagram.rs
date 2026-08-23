//! Config-driven SVG projection for the architecture overview.

use leptos::prelude::*;
use nanogpt_schema::ModelMetadata;

use crate::app::{
    architecture_overview::ArchitectureOverviewState,
    architecture_overview_layout::{DiagramLayout, VIEW_WIDTH},
    notation::block_repeat_label,
    state::AppState,
};

mod pipeline;
mod transformer_block;

use super::node::ArchitectureInteraction;
use pipeline::{forward_path, generation_path};

pub(super) fn ready_architecture(
    model: &ModelMetadata,
    state: RwSignal<AppState>,
    overview: ArchitectureOverviewState,
) -> AnyView {
    let config = &model.config;
    let interaction = ArchitectureInteraction::new(
        state,
        config.n_layer,
        config.n_head,
        overview.selected_node(),
    );
    view! {
        <p class="architecture-metadata">
            <strong>{model.name.clone()}</strong>
            {format!(
                " · {} layers · {} heads · d_model {} · context {}",
                config.n_layer, config.n_head, config.n_embd, config.block_size
            )}
        </p>
        <div class="architecture-visual-grid">
            {architecture_svg(config.n_layer, interaction)}
            {architecture_annotation(config.n_layer)}
        </div>
    }
    .into_any()
}

fn architecture_svg(layer_count: usize, interaction: ArchitectureInteraction) -> impl IntoView {
    let layout = DiagramLayout::new(layer_count);
    view! {
        <figure class="architecture-figure">
            <div
                class="architecture-svg-scroll"
                tabindex="0"
                role="region"
                aria-label="Scrollable Transformer architecture diagram"
            >
                <svg
                    class="architecture-diagram"
                    data-testid="architecture-root"
                    viewBox=format!("0 0 {VIEW_WIDTH} {}", layout.view_height)
                    style=format!("aspect-ratio: {VIEW_WIDTH} / {}", layout.view_height)
                    role="img"
                    aria-labelledby="architecture-svg-title architecture-svg-desc"
                    preserveAspectRatio="xMidYMid meet"
                >
                    <title id="architecture-svg-title">"GPT text generation architecture"</title>
                    <desc id="architecture-svg-desc">
                        {format!(
                            "Input tokens pass through token and position embeddings, {layer_count} Pre-LN Transformer blocks, final LayerNorm, language-model head, logits, sampling, and generated-token append before the full context is forwarded again."
                        )}
                    </desc>
                    <defs>
                        <marker
                            id="architecture-arrow"
                            viewBox="0 0 10 10"
                            refX="10"
                            refY="5"
                            markerWidth="7"
                            markerHeight="7"
                            orient="auto-start-reverse"
                            overflow="visible"
                        >
                            <path d="M 0 0 L 10 5 L 0 10 z"></path>
                        </marker>
                    </defs>
                    {forward_path(layer_count, interaction)}
                    {generation_path(layout, interaction)}
                </svg>
            </div>
            <figcaption>
                "다음 generation step: 생성된 토큰을 context에 추가한 뒤, 늘어난 context 전체를 다시 Transformer에 입력합니다. 이 교육용 모델은 KV cache를 사용하지 않습니다."
            </figcaption>
        </figure>
    }
}

fn architecture_annotation(layer_count: usize) -> impl IntoView {
    view! {
        <aside class="architecture-annotation" aria-labelledby="architecture-annotation-title">
            <h3 id="architecture-annotation-title">"구조 설명"</h3>
            <ul>
                <li>
                    <strong>{block_repeat_label(layer_count)}</strong>
                    <span>{format!("동일한 Block이 {layer_count}번 순차적으로 적용됩니다.")}</span>
                </li>
                <li>
                    <strong>"반복 Block 범위"</strong>
                    <span>"LN1 · Causal Self-Attention · Residual Add · LN2 · MLP · Residual Add"</span>
                </li>
                <li>
                    <strong>"Final LayerNorm"</strong>
                    <span>"반복 Block 바깥에서 마지막 hidden state를 정규화합니다."</span>
                </li>
            </ul>
        </aside>
    }
}
