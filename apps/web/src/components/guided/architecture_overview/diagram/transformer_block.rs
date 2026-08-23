//! One repeated Transformer block with explicit Pre-LN residual routes.

use leptos::prelude::*;

use crate::app::{
    architecture_overview::ArchitectureNodeId,
    architecture_overview_layout::{BLOCK_HEIGHT, BLOCK_START_Y, CENTER_X},
};

use super::super::node::{
    ArchitectureInteraction, DrillDownIndicator, NodeBounds, architecture_node,
};

const BLOCK_WIDTH: usize = 480;
const BLOCK_X: usize = CENTER_X - BLOCK_WIDTH / 2;
const MODULE_WIDTH: usize = 320;
const MODULE_X: usize = CENTER_X - MODULE_WIDTH / 2;
const RESIDUAL_RAIL_X: usize = 700;
const RESIDUAL_ADD_RADIUS: usize = 18;
const ARROWHEAD_VISUAL_LENGTH: usize = 12;
pub(super) const BLOCK_FIRST_MODULE_Y: usize = 392;
const ATTENTION_Y: usize = 458;
const FIRST_ADD_Y: usize = 560;
const SECOND_MODULE_Y: usize = 614;
const MLP_Y: usize = 680;
const SECOND_ADD_Y: usize = 776;
const FIRST_RESIDUAL_ORIGIN_Y: usize = 368;
const SECOND_RESIDUAL_ORIGIN_Y: usize =
    (FIRST_ADD_Y + RESIDUAL_ADD_RADIUS + SECOND_MODULE_Y - ARROWHEAD_VISUAL_LENGTH) / 2;
pub(super) const BLOCK_LAST_ADD_BOTTOM_Y: usize = SECOND_ADD_Y + RESIDUAL_ADD_RADIUS;

pub(super) fn repeated_transformer_block(
    layer_count: usize,
    interaction: ArchitectureInteraction,
) -> impl IntoView {
    view! {
        {architecture_node(
            ArchitectureNodeId::TransformerBlock,
            "Transformer Block",
            NodeBounds {
                x: BLOCK_X,
                y: BLOCK_START_Y,
                width: BLOCK_WIDTH,
                height: BLOCK_HEIGHT,
                radius: 16,
            },
            interaction,
            Some(DrillDownIndicator {
                x: BLOCK_X + BLOCK_WIDTH - 20,
                y: BLOCK_START_Y + 30,
                label: "자세히 ›",
            }),
            view! { <g
                class="architecture-block-group"
                role="group"
                aria-label=format!("Transformer Block repeated {layer_count} times")
            >
                <rect
                    class="architecture-block-frame"
                    x=BLOCK_X
                    y=BLOCK_START_Y
                    width=BLOCK_WIDTH
                    height=BLOCK_HEIGHT
                    rx="16"
                ></rect>
                <text class="architecture-block-title" x=BLOCK_X + 22 y="374">
                    {format!("Transformer Block × {layer_count}")}
                </text>

                {block_module(
                    "architecture-block-normalization",
                    BLOCK_FIRST_MODULE_Y,
                    42,
                    "LayerNorm 1",
                    "",
                )}
                {block_module(
                    "architecture-block-attention",
                    ATTENTION_Y,
                    60,
                    "Causal Multi-Head",
                    "Self-Attention",
                )}
                {residual_add(FIRST_ADD_Y)}
                {block_module(
                    "architecture-block-normalization",
                    SECOND_MODULE_Y,
                    42,
                    "LayerNorm 2",
                    "",
                )}
                {block_module(
                    "architecture-block-mlp",
                    MLP_Y,
                    54,
                    "MLP",
                    "Feed Forward",
                )}
                {residual_add(SECOND_ADD_Y)}

                {block_connectors()}
            </g> },
        )}
    }
}

fn block_connectors() -> impl IntoView {
    view! {
            <line
                class="architecture-flow"
                data-connector="ln1-to-attention"
                x1=CENTER_X
                y1=BLOCK_FIRST_MODULE_Y + 42
                x2=CENTER_X
                y2=ATTENTION_Y
            ></line>
            <line
                class="architecture-flow"
                data-connector="attention-to-add1"
                x1=CENTER_X
                y1=ATTENTION_Y + 60
                x2=CENTER_X
                y2=FIRST_ADD_Y - RESIDUAL_ADD_RADIUS
            ></line>
            <path
                class="architecture-residual"
                data-connector="block-input-to-add1"
                d=format!(
                    "M {CENTER_X} {FIRST_RESIDUAL_ORIGIN_Y} H {RESIDUAL_RAIL_X} V {FIRST_ADD_Y} H {}",
                    CENTER_X + RESIDUAL_ADD_RADIUS
                )
            ></path>
            <line
                class="architecture-flow"
                data-connector="add1-to-ln2"
                x1=CENTER_X
                y1=FIRST_ADD_Y + RESIDUAL_ADD_RADIUS
                x2=CENTER_X
                y2=SECOND_MODULE_Y
            ></line>
            <line
                class="architecture-flow"
                data-connector="ln2-to-mlp"
                x1=CENTER_X
                y1=SECOND_MODULE_Y + 42
                x2=CENTER_X
                y2=MLP_Y
            ></line>
            <line
                class="architecture-flow"
                data-connector="mlp-to-add2"
                x1=CENTER_X
                y1=MLP_Y + 54
                x2=CENTER_X
                y2=SECOND_ADD_Y - RESIDUAL_ADD_RADIUS
            ></line>
            <path
                class="architecture-residual"
                data-connector="add1-output-to-add2"
                d=format!(
                    "M {CENTER_X} {} H {RESIDUAL_RAIL_X} V {SECOND_ADD_Y} H {}",
                    SECOND_RESIDUAL_ORIGIN_Y,
                    CENTER_X + RESIDUAL_ADD_RADIUS
                )
            ></path>
    }
}

pub(super) fn residual_junctions() -> impl IntoView {
    view! {
        {residual_junction(FIRST_RESIDUAL_ORIGIN_Y)}
        {residual_junction(SECOND_RESIDUAL_ORIGIN_Y)}
    }
}

fn residual_junction(y: usize) -> impl IntoView {
    view! {
        <circle
            class="architecture-residual-junction"
            cx=CENTER_X
            cy=y
            r="5"
            aria-hidden="true"
        ></circle>
    }
}

fn block_module(
    class: &'static str,
    y: usize,
    height: usize,
    title: &'static str,
    subtitle: &'static str,
) -> impl IntoView {
    let title_y = y + if subtitle.is_empty() {
        height / 2 + 6
    } else {
        height / 2 - 2
    };
    let subtitle_y = y + height / 2 + 17;
    view! {
        <g class=format!("architecture-block-module {class}")>
            <rect x=MODULE_X y=y width=MODULE_WIDTH height=height rx="8"></rect>
            <text x=CENTER_X y=title_y text-anchor="middle">{title}</text>
            <text
                class="architecture-node-subtitle"
                x=CENTER_X
                y=subtitle_y
                text-anchor="middle"
            >
                {subtitle}
            </text>
        </g>
    }
}

fn residual_add(y: usize) -> impl IntoView {
    view! {
        <circle
            class="architecture-residual-add"
            cx=CENTER_X
            cy=y
            r=RESIDUAL_ADD_RADIUS
        ></circle>
        <text class="architecture-add-label" x=CENTER_X y=y + 6 text-anchor="middle">"+"</text>
    }
}
