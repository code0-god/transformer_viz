//! Explicit Pre-LN Transformer Block data-flow diagram.

use leptos::prelude::*;

use crate::app::architecture_overview::ArchitectureNodeId;

use super::super::node::{ArchitectureInteraction, NodeBounds, architecture_node};

mod connectors;

use connectors::{connectors, junction};

const WIDTH: usize = 900;
const HEIGHT: usize = 930;
const CENTER_X: usize = 390;
const RAIL_X: usize = 700;
const MODULE_WIDTH: usize = 330;
const MODULE_X: usize = CENTER_X - MODULE_WIDTH / 2;
const INPUT_Y: usize = 24;
const INPUT_HEIGHT: usize = 56;
const FIRST_JUNCTION_Y: usize = 108;
const LN1_Y: usize = 146;
const LN_HEIGHT: usize = 56;
const ATTENTION_Y: usize = 250;
const ATTENTION_HEIGHT: usize = 80;
const ADD1_Y: usize = 382;
const ADD_RADIUS: usize = 22;
const X_PRIME_Y: usize = 438;
const STATE_HEIGHT: usize = 48;
const SECOND_JUNCTION_Y: usize = 518;
const LN2_Y: usize = 560;
const MLP_Y: usize = 664;
const MLP_HEIGHT: usize = 72;
const ADD2_Y: usize = 790;
const OUTPUT_Y: usize = 850;

pub(super) fn block_detail_diagram(interaction: ArchitectureInteraction) -> impl IntoView {
    view! {
        <figure class="architecture-figure architecture-detail-figure">
            <div
                class="architecture-svg-scroll architecture-detail-scroll"
                tabindex="0"
                role="region"
                aria-label="Scrollable Transformer Block detail diagram"
            >
                <svg
                    class="architecture-diagram architecture-detail-diagram"
                    viewBox=format!("0 0 {WIDTH} {HEIGHT}")
                    role="img"
                    aria-labelledby="block-detail-svg-title block-detail-svg-desc"
                    preserveAspectRatio="xMidYMid meet"
                >
                    <title id="block-detail-svg-title">"Pre-LN Transformer Block data flow"</title>
                    <desc id="block-detail-svg-desc">
                        "Block Input x branches to LayerNorm 1 and the first residual path. The first sum produces x prime, which branches to LayerNorm 2 and the second residual path. The second sum produces Block Output y."
                    </desc>
                    <defs>
                        <marker
                            id="block-detail-arrow"
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

                    {state_node(INPUT_Y, "Block Input x", "Residual source x")}
                    {module_node(
                        ArchitectureNodeId::LayerNorm1,
                        "architecture-block-normalization",
                        LN1_Y,
                        LN_HEIGHT,
                        "LayerNorm 1",
                        "Pre-normalize x",
                        interaction,
                    )}
                    {module_node(
                        ArchitectureNodeId::SelfAttention,
                        "architecture-block-attention",
                        ATTENTION_Y,
                        ATTENTION_HEIGHT,
                        "Causal Multi-Head Self-Attention",
                        "Attention(LN1(x))",
                        interaction,
                    )}
                    {add_node(
                        ArchitectureNodeId::Residual1,
                        ADD1_Y,
                        "Residual Add 1",
                        interaction,
                    )}
                    {state_node(X_PRIME_Y, "x′", "x + Attention(LN1(x))")}
                    {module_node(
                        ArchitectureNodeId::LayerNorm2,
                        "architecture-block-normalization",
                        LN2_Y,
                        LN_HEIGHT,
                        "LayerNorm 2",
                        "Pre-normalize x′",
                        interaction,
                    )}
                    {module_node(
                        ArchitectureNodeId::Mlp,
                        "architecture-block-mlp",
                        MLP_Y,
                        MLP_HEIGHT,
                        "MLP",
                        "MLP(LN2(x′))",
                        interaction,
                    )}
                    {add_node(
                        ArchitectureNodeId::Residual2,
                        ADD2_Y,
                        "Residual Add 2",
                        interaction,
                    )}
                    {state_node(OUTPUT_Y, "Block Output y", "x′ + MLP(LN2(x′))")}
                    {connectors()}
                    {junction(FIRST_JUNCTION_Y, "block-input-junction")}
                    {junction(SECOND_JUNCTION_Y, "x-prime-junction")}
                </svg>
            </div>
            <figcaption>
                "Residual 1은 Block Input x를, Residual 2는 x′를 각각 보존해 계산 결과에 더합니다."
            </figcaption>
        </figure>
    }
}
fn module_node(
    id: ArchitectureNodeId,
    class: &'static str,
    y: usize,
    height: usize,
    title: &'static str,
    subtitle: &'static str,
    interaction: ArchitectureInteraction,
) -> impl IntoView {
    view! {
        {architecture_node(
            id,
            title,
            NodeBounds {
                x: MODULE_X,
                y,
                width: MODULE_WIDTH,
                height,
                radius: 10,
            },
            interaction,
            None,
            view! { <g class=format!("architecture-block-module {class}")>
                <rect x=MODULE_X y=y width=MODULE_WIDTH height=height rx="10"></rect>
                <text x=CENTER_X y=y + height / 2 - 3 text-anchor="middle">{title}</text>
                <text
                    class="architecture-node-subtitle"
                    x=CENTER_X
                    y=y + height / 2 + 18
                    text-anchor="middle"
                >
                    {subtitle}
                </text>
            </g> },
        )}
    }
}
fn add_node(
    id: ArchitectureNodeId,
    y: usize,
    label: &'static str,
    interaction: ArchitectureInteraction,
) -> impl IntoView {
    view! {
        {architecture_node(
            id,
            label,
            NodeBounds {
                x: CENTER_X - ADD_RADIUS,
                y: y - ADD_RADIUS,
                width: ADD_RADIUS * 2,
                height: ADD_RADIUS * 2,
                radius: ADD_RADIUS,
            },
            interaction,
            None,
            view! {
            <circle
                class="architecture-residual-add"
                cx=CENTER_X
                cy=y
                r=ADD_RADIUS
            ></circle>
            <text class="architecture-add-label" x=CENTER_X y=y + 6 text-anchor="middle">"+"</text>
            },
        )}
    }
}

fn state_node(y: usize, title: &'static str, subtitle: &'static str) -> impl IntoView {
    view! {
        <g class="architecture-detail-state">
            <rect
                x=MODULE_X
                y=y
                width=MODULE_WIDTH
                height=STATE_HEIGHT
                rx="10"
            ></rect>
            <text x=CENTER_X y=y + 20 text-anchor="middle">{title}</text>
            <text class="architecture-node-subtitle" x=CENTER_X y=y + 38 text-anchor="middle">
                {subtitle}
            </text>
        </g>
    }
}
