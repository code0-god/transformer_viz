//! SVG nodes and connectors for the vertical architecture overview.

use leptos::prelude::*;

use crate::app::architecture_overview_layout::{
    BLOCK_HEIGHT, BLOCK_START_Y, CENTER_X, COMPACT_HEIGHT, DiagramLayout, INPUT_HEIGHT,
    INPUT_WIDTH, INPUT_Y, SELECTION_HEIGHT, TOKEN_HEIGHT,
};

use super::transformer_block::{
    BLOCK_FIRST_MODULE_Y, BLOCK_LAST_ADD_BOTTOM_Y, repeated_transformer_block, residual_junctions,
};

const INPUT_X: usize = CENTER_X - INPUT_WIDTH / 2;
const EMBEDDING_Y: usize = 120;
const EMBEDDING_WIDTH: usize = 220;
const EMBEDDING_HEIGHT: usize = 54;
const EMBEDDING_CENTER_OFFSET: usize = 170;
const TOKEN_EMBEDDING_X: usize = CENTER_X - EMBEDDING_CENTER_OFFSET - EMBEDDING_WIDTH / 2;
const POSITION_EMBEDDING_X: usize = CENTER_X + EMBEDDING_CENTER_OFFSET - EMBEDDING_WIDTH / 2;
const MAIN_WIDTH: usize = 390;
const MAIN_X: usize = CENTER_X - MAIN_WIDTH / 2;
const SELECTION_WIDTH: usize = 460;
const SELECTION_X: usize = CENTER_X - SELECTION_WIDTH / 2;
const EMBEDDING_BRANCH_Y: usize = 96;
const EMBEDDING_ADD_Y: usize = 224;
const EMBEDDING_ADD_RADIUS: usize = 16;
const HIDDEN_Y: usize = 264;
const HIDDEN_HEIGHT: usize = 36;
const HIDDEN_WIDTH: usize = 260;
const HIDDEN_X: usize = CENTER_X - HIDDEN_WIDTH / 2;
const FORWARD_GUIDE_X: usize = 790;

pub(super) fn forward_path(layer_count: usize) -> impl IntoView {
    view! {
        {input_and_embeddings()}
        {embedding_merge_and_hidden()}
        {block_path(layer_count)}
    }
}

fn input_and_embeddings() -> impl IntoView {
    view! {
        <g class="architecture-node architecture-node-input">
            <rect x=INPUT_X y=INPUT_Y width=INPUT_WIDTH height=INPUT_HEIGHT rx="12"></rect>
            <text x=CENTER_X y=INPUT_Y + 25 text-anchor="middle">"Input Context"</text>
            <text
                class="architecture-node-subtitle"
                x=CENTER_X
                y=INPUT_Y + 46
                text-anchor="middle"
            >
                "Current token sequence"
            </text>
        </g>

        {stage_node(
            "architecture-node-embedding",
            TOKEN_EMBEDDING_X,
            EMBEDDING_Y,
            EMBEDDING_WIDTH,
            EMBEDDING_HEIGHT,
            "Token Embedding",
            "vocab_size → d_model",
        )}
        {stage_node(
            "architecture-node-embedding",
            POSITION_EMBEDDING_X,
            EMBEDDING_Y,
            EMBEDDING_WIDTH,
            EMBEDDING_HEIGHT,
            "Position Embedding",
            "context_size → d_model",
        )}
        <path
            class="architecture-flow"
            data-connector="input-to-token"
            d=format!(
                "M {CENTER_X} {} V {EMBEDDING_BRANCH_Y} H {} V {EMBEDDING_Y}",
                INPUT_Y + INPUT_HEIGHT,
                TOKEN_EMBEDDING_X + EMBEDDING_WIDTH / 2
            )
        ></path>
        <path
            class="architecture-flow"
            data-connector="input-to-position"
            d=format!(
                "M {CENTER_X} {} V {EMBEDDING_BRANCH_Y} H {} V {EMBEDDING_Y}",
                INPUT_Y + INPUT_HEIGHT,
                POSITION_EMBEDDING_X + EMBEDDING_WIDTH / 2
            )
        ></path>
    }
}

fn embedding_merge_and_hidden() -> impl IntoView {
    view! {
        <circle
            class="architecture-add"
            cx=CENTER_X
            cy=EMBEDDING_ADD_Y
            r=EMBEDDING_ADD_RADIUS
        ></circle>
        <g class="architecture-node architecture-node-hidden">
            <rect
                x=HIDDEN_X
                y=HIDDEN_Y
                width=HIDDEN_WIDTH
                height=HIDDEN_HEIGHT
                rx="8"
            ></rect>
            <text x=CENTER_X y=HIDDEN_Y + 24 text-anchor="middle">"Hidden State x₀"</text>
        </g>
        <path
            class="architecture-merge"
            data-connector="token-to-embedding-add"
            d=format!(
                "M {} {} V {EMBEDDING_ADD_Y} H {}",
                TOKEN_EMBEDDING_X + EMBEDDING_WIDTH / 2,
                EMBEDDING_Y + EMBEDDING_HEIGHT,
                CENTER_X - EMBEDDING_ADD_RADIUS
            )
        ></path>
        <path
            class="architecture-merge"
            data-connector="position-to-embedding-add"
            d=format!(
                "M {} {} V {EMBEDDING_ADD_Y} H {}",
                POSITION_EMBEDDING_X + EMBEDDING_WIDTH / 2,
                EMBEDDING_Y + EMBEDDING_HEIGHT,
                CENTER_X + EMBEDDING_ADD_RADIUS
            )
        ></path>
        <line
            class="architecture-flow"
            data-connector="embedding-add-to-hidden"
            x1=CENTER_X
            y1=EMBEDDING_ADD_Y + EMBEDDING_ADD_RADIUS
            x2=CENTER_X
            y2=HIDDEN_Y
        ></line>
        <text
            class="architecture-add-label"
            x=CENTER_X
            y=EMBEDDING_ADD_Y + 6
            text-anchor="middle"
        >
            "+"
        </text>
    }
}

fn block_path(layer_count: usize) -> impl IntoView {
    view! {
        {repeated_transformer_block(layer_count)}

        <line
            class="architecture-flow"
            data-connector="hidden-to-ln1"
            x1=CENTER_X
            y1=HIDDEN_Y + HIDDEN_HEIGHT
            x2=CENTER_X
            y2=BLOCK_FIRST_MODULE_Y
        ></line>
        {residual_junctions()}
        <line
            class="architecture-forward-guide"
            x1=FORWARD_GUIDE_X
            y1=BLOCK_START_Y
            x2=FORWARD_GUIDE_X
            y2=BLOCK_START_Y + BLOCK_HEIGHT
        ></line>
        <text class="architecture-forward-label" x="812" y="570">"FULL FORWARD"</text>
        <text class="architecture-forward-subtitle" x="812" y="588">"top-to-bottom pass"</text>
    }
}

pub(super) fn generation_path(layout: DiagramLayout) -> impl IntoView {
    let append_mid = layout.append_y + 24;
    let (return_x, return_y) = layout.return_target();
    view! {
        {generation_nodes(layout)}
        {generation_connectors(layout)}
        <path
            class="architecture-repeat"
            d=format!("M {MAIN_X} {append_mid} H 80 V {return_y} H {return_x}")
        ></path>
        <text class="architecture-repeat-label" x="98" y=layout.selection_y + 22>
            "CONTEXT UPDATE"
        </text>
        <text class="architecture-repeat-subtitle" x="98" y=layout.selection_y + 41>
            "Updated context"
        </text>
    }
}

fn generation_nodes(layout: DiagramLayout) -> impl IntoView {
    view! {
        {stage_node(
            "architecture-node-normalization",
            MAIN_X,
            layout.final_layer_norm_y,
            MAIN_WIDTH,
            COMPACT_HEIGHT,
            "Final LayerNorm",
            "Normalize final hidden states",
        )}
        {stage_node(
            "architecture-node-projection",
            MAIN_X,
            layout.lm_head_y,
            MAIN_WIDTH,
            COMPACT_HEIGHT,
            "LM Head",
            "d_model → vocab_size",
        )}
        {stage_node(
            "architecture-node-logits",
            MAIN_X,
            layout.logits_y,
            MAIN_WIDTH,
            COMPACT_HEIGHT,
            "Logits",
            "One score per token",
        )}
        {stage_node(
            "architecture-node-sampling",
            SELECTION_X,
            layout.selection_y,
            SELECTION_WIDTH,
            SELECTION_HEIGHT,
            "Token Selection",
            "Temperature · Top-K · Softmax · Sampling",
        )}
        {stage_node(
            "architecture-node-token",
            MAIN_X,
            layout.generated_y,
            MAIN_WIDTH,
            TOKEN_HEIGHT,
            "Generated Token",
            "One sampled token",
        )}
        {stage_node(
            "architecture-node-append",
            MAIN_X,
            layout.append_y,
            MAIN_WIDTH,
            TOKEN_HEIGHT,
            "Append to Context",
            "Context grows by one token",
        )}
    }
}

fn generation_connectors(layout: DiagramLayout) -> impl IntoView {
    view! {
        {vertical_connector(
            "add2-to-final",
            BLOCK_LAST_ADD_BOTTOM_Y,
            layout.final_layer_norm_y,
        )}
        {vertical_connector(
            "final-to-lm-head",
            layout.final_layer_norm_y + COMPACT_HEIGHT,
            layout.lm_head_y,
        )}
        {vertical_connector(
            "lm-head-to-logits",
            layout.lm_head_y + COMPACT_HEIGHT,
            layout.logits_y,
        )}
        {vertical_connector(
            "logits-to-selection",
            layout.logits_y + COMPACT_HEIGHT,
            layout.selection_y,
        )}
        {vertical_connector(
            "selection-to-generated",
            layout.selection_y + SELECTION_HEIGHT,
            layout.generated_y,
        )}
        {vertical_connector(
            "generated-to-append",
            layout.generated_y + TOKEN_HEIGHT,
            layout.append_y,
        )}
    }
}

fn stage_node(
    class: &'static str,
    x: usize,
    y: usize,
    width: usize,
    height: usize,
    title: &'static str,
    subtitle: &'static str,
) -> impl IntoView {
    let center_x = x + width / 2;
    let title_y = y + if height > 42 { 22 } else { 17 };
    let subtitle_y = y + if height > 42 { 41 } else { 32 };
    view! {
        <g class=format!("architecture-node {class}")>
            <rect x=x y=y width=width height=height rx="9"></rect>
            <text x=center_x y=title_y text-anchor="middle">{title}</text>
            <text class="architecture-node-subtitle" x=center_x y=subtitle_y text-anchor="middle">
                {subtitle}
            </text>
        </g>
    }
}

fn vertical_connector(name: &'static str, y1: usize, y2: usize) -> impl IntoView {
    view! {
        <line
            class="architecture-flow"
            data-connector=name
            x1=CENTER_X
            y1=y1
            x2=CENTER_X
            y2=y2
        ></line>
    }
}
