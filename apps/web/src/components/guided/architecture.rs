//! Accessible config-driven architecture hierarchy.

mod drawer;
mod labels;

use leptos::prelude::*;

use crate::app::{
    architecture::{
        ArchitectureLevel, ArchitectureMapState, ArchitectureNode, ArchitectureNodeKind, catalog,
    },
    state::AppState,
    worker_client::WorkerClient,
};

use super::{shell::send_or_error, stage_copy::operation_label};
use labels::operation_slug;

#[must_use]
pub(super) fn architecture_map(state: RwSignal<AppState>, client: WorkerClient) -> impl IntoView {
    view! {
        <section
            id="architecture-map"
            class="model-map architecture-map"
            data-testid="architecture-map"
            aria-labelledby="architecture-map-title"
            on:keydown=move |event| if event.key() == "Escape" && state.with_untracked(|current| current.ui.model_map_expanded) {
                event.prevent_default();
                drawer::close(state, true);
            }
            on:focusout=move |event| drawer::focus_leaving(state, &event)
        >
            <div class="region-heading">
                <h2 id="architecture-map-title">"Architecture Map"</h2>
                <button
                    class="model-map-toggle"
                    type="button"
                    aria-expanded=move || state.with(|current| current.ui.model_map_expanded.to_string())
                    aria-controls="architecture-map-body"
                    on:click=move |_| state.update(|current| current.ui.model_map_expanded = !current.ui.model_map_expanded)
                >{move || state.with(|current| if current.ui.model_map_expanded { "맵 닫기" } else { "맵 열기" })}</button>
            </div>
            <div id="architecture-map-body" class="model-map-body" hidden=move || state.with(|current| !current.ui.model_map_expanded)>
                {move || state.with(|current| current.model.as_ref().map_or_else(
                    || view! { <p class="empty-state">"모델 구성을 불러오는 중입니다."</p> }.into_any(),
                    |model| architecture_body(state, &client, &model.config).into_any(),
                ))}
            </div>
        </section>
    }
}

fn architecture_body(
    state: RwSignal<AppState>,
    client: &WorkerClient,
    config: &nanogpt_schema::GptConfig,
) -> impl IntoView {
    let map = state.with(|current| current.ui.architecture);
    let level = map.level;
    let nodes = catalog(config, level);
    view! {
        <nav class="architecture-breadcrumb" aria-label="아키텍처 경로">
            {map.breadcrumb().into_iter().map(|crumb| {
                let crumb_client = client.clone();
                view! {
                    <button
                        type="button"
                        data-testid=format!("architecture-breadcrumb-{}", crumb.slug())
                        aria-current=(crumb == level).then_some("page")
                        on:click=move |_| navigate(state, &crumb_client, ArchitectureNodeKind::Level(crumb))
                    >{breadcrumb_label(crumb, map)}</button>
                }
            }).collect_view()}
        </nav>
        <div class="architecture-metrics" aria-label="모델 차원">
            <span>{format!("{} blocks", config.n_layer)}</span>
            <span>{format!("{} heads", config.n_head)}</span>
            <span>{format!("d_model {}", config.n_embd)}</span>
            <span>{format!("d_head {}", ArchitectureMapState::head_width(config))}</span>
        </div>
        <section
            class="architecture-level"
            data-testid=format!("architecture-level-{}", level.slug())
            data-parent=map.parent().map(ArchitectureLevel::slug)
            aria-labelledby=format!("architecture-level-{}-title", level.slug())
        >
            <h3 id=format!("architecture-level-{}-title", level.slug())>{level_label(level, map)}</h3>
            <div class="architecture-nodes">
                {nodes.into_iter().map(|node| node_button(state, client.clone(), node)).collect_view()}
            </div>
            {(level == ArchitectureLevel::Generation).then(|| view! {
                <div class="generation-loop" aria-label="Repeat에서 전체 GPT forward로 돌아가는 반복 연결">
                    <span>"Repeat"</span>
                    <svg viewBox="0 0 72 18" aria-hidden="true" focusable="false">
                        <path d="M2 9 H66 M60 3 L67 9 L60 15" />
                    </svg>
                    <span>"GPT forward"</span>
                </div>
            })}
        </section>
    }
}

fn node_button(
    state: RwSignal<AppState>,
    client: WorkerClient,
    node: ArchitectureNode,
) -> impl IntoView {
    let kind = node.kind;
    let map = state.with(|current| current.ui.architecture);
    view! {
        <button
            type="button"
            class="architecture-node"
            data-testid=format!("architecture-node-{}", node_slug(kind))
            data-node-kind=node_kind(kind)
            aria-current=selected(kind, map).then_some("true")
            on:click=move |_| navigate(state, &client, kind)
        >
            <span>{node_label(kind)}</span>
            {node_hint(kind)}
        </button>
    }
}

fn navigate(state: RwSignal<AppState>, client: &WorkerClient, node: ArchitectureNodeKind) {
    let mut request = None;
    let closes_drawer = drawer::is_non_desktop();
    state.update(|current| {
        request = current.navigate_architecture(node);
        if closes_drawer {
            current.ui.model_map_expanded = false;
        }
    });
    if closes_drawer {
        drawer::focus_toggle();
    }
    if let Some(request) = request {
        send_or_error(state, client, &request);
    }
}

fn selected(kind: ArchitectureNodeKind, map: ArchitectureMapState) -> bool {
    match kind {
        ArchitectureNodeKind::Operation(operation) => map.operation == Some(operation),
        ArchitectureNodeKind::Layer(layer) => {
            map.level == ArchitectureLevel::Block && map.layer == layer
        }
        ArchitectureNodeKind::Head(head) => {
            map.level == ArchitectureLevel::Attention && map.head == head
        }
        ArchitectureNodeKind::Level(level) => map.level == level,
    }
}

fn node_hint(kind: ArchitectureNodeKind) -> Option<AnyView> {
    match kind {
        ArchitectureNodeKind::Layer(layer) => {
            Some(view! { <small>{format!("L{layer}")}</small> }.into_any())
        }
        ArchitectureNodeKind::Head(head) => {
            Some(view! { <small>{format!("H{head}")}</small> }.into_any())
        }
        ArchitectureNodeKind::Operation(_) | ArchitectureNodeKind::Level(_) => None,
    }
}

fn node_label(kind: ArchitectureNodeKind) -> String {
    match kind {
        ArchitectureNodeKind::Operation(operation) => operation_label(operation).to_owned(),
        ArchitectureNodeKind::Layer(layer) => format!("Block {layer}"),
        ArchitectureNodeKind::Head(head) => format!("Head {head}"),
        ArchitectureNodeKind::Level(level) => match level {
            ArchitectureLevel::Attention => "Attention".to_owned(),
            ArchitectureLevel::Generation => "Generation".to_owned(),
            ArchitectureLevel::Gpt | ArchitectureLevel::Block => {
                level_label(level, ArchitectureMapState::default())
            }
        },
    }
}

fn breadcrumb_label(level: ArchitectureLevel, map: ArchitectureMapState) -> String {
    match level {
        ArchitectureLevel::Gpt => "GPT".to_owned(),
        ArchitectureLevel::Block => format!("Block {}", map.layer),
        ArchitectureLevel::Attention => format!("Attention · Head {}", map.head),
        ArchitectureLevel::Generation => "Generation".to_owned(),
    }
}

fn level_label(level: ArchitectureLevel, map: ArchitectureMapState) -> String {
    match level {
        ArchitectureLevel::Gpt => "GPT forward".to_owned(),
        ArchitectureLevel::Block => format!("Transformer Block {}", map.layer),
        ArchitectureLevel::Attention => format!("Attention · Head {}", map.head),
        ArchitectureLevel::Generation => "Generation loop".to_owned(),
    }
}

const fn node_kind(kind: ArchitectureNodeKind) -> &'static str {
    match kind {
        ArchitectureNodeKind::Operation(_) => "operation",
        ArchitectureNodeKind::Layer(_) => "layer",
        ArchitectureNodeKind::Head(_) => "head",
        ArchitectureNodeKind::Level(_) => "level",
    }
}

fn node_slug(kind: ArchitectureNodeKind) -> String {
    match kind {
        ArchitectureNodeKind::Operation(operation) => operation_slug(operation).to_owned(),
        ArchitectureNodeKind::Layer(layer) => format!("block-{layer}"),
        ArchitectureNodeKind::Head(head) => format!("head-{head}"),
        ArchitectureNodeKind::Level(level) => level.slug().to_owned(),
    }
}
