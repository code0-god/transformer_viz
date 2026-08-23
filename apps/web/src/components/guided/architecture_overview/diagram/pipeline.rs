//! Connectors for the vertical Root Architecture pipeline.

use leptos::prelude::*;

use crate::app::{
    architecture_overview_layout::{
        BLOCK_HEIGHT, BLOCK_START_Y, CENTER_X, COMPACT_HEIGHT, DiagramLayout, SELECTION_HEIGHT,
        TOKEN_HEIGHT,
    },
    notation::{ROOT_HIDDEN_OUTPUT, ROOT_HIDDEN_SHAPE},
};

use super::super::node::ArchitectureInteraction;
use super::transformer_block::{
    BLOCK_FIRST_MODULE_Y, BLOCK_LAST_ADD_BOTTOM_Y, repeated_transformer_block, residual_junctions,
};

mod nodes;
mod stage;

use nodes::{HIDDEN_HEIGHT, HIDDEN_Y, MAIN_X, generation_nodes, input_and_embeddings};

const FORWARD_GUIDE_X: usize = 790;

pub(super) fn forward_path(
    layer_count: usize,
    interaction: ArchitectureInteraction,
) -> impl IntoView {
    view! {
        {input_and_embeddings(interaction)}
        {block_path(layer_count, interaction)}
    }
}

fn block_path(layer_count: usize, interaction: ArchitectureInteraction) -> impl IntoView {
    view! {
        {repeated_transformer_block(layer_count, interaction)}
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

pub(super) fn generation_path(
    layout: DiagramLayout,
    interaction: ArchitectureInteraction,
) -> impl IntoView {
    let append_mid = layout.append_y + 24;
    let (return_x, return_y) = layout.return_target();
    view! {
        {generation_nodes(layout, interaction)}
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

fn generation_connectors(layout: DiagramLayout) -> impl IntoView {
    view! {
        <text
            class="architecture-edge-state"
            x=CENTER_X + 18
            y=BLOCK_LAST_ADD_BOTTOM_Y + 18
        >
            {format!("{ROOT_HIDDEN_OUTPUT} {ROOT_HIDDEN_SHAPE}")}
        </text>
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
