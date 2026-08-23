//! Config-driven nodes for the Root Architecture pipeline.

use leptos::prelude::*;

use crate::app::{
    architecture_overview::ArchitectureNodeId,
    architecture_overview_layout::{
        CENTER_X, COMPACT_HEIGHT, DiagramLayout, INPUT_HEIGHT, INPUT_WIDTH, INPUT_Y,
        SELECTION_HEIGHT, TOKEN_HEIGHT,
    },
};

use super::super::super::node::ArchitectureInteraction;
use super::stage::{NodeSpec, stage_node};

const INPUT_X: usize = CENTER_X - INPUT_WIDTH / 2;
const EMBEDDING_Y: usize = 120;
const EMBEDDING_WIDTH: usize = 220;
const EMBEDDING_HEIGHT: usize = 54;
const EMBEDDING_CENTER_OFFSET: usize = 170;
const TOKEN_EMBEDDING_X: usize = CENTER_X - EMBEDDING_CENTER_OFFSET - EMBEDDING_WIDTH / 2;
const POSITION_EMBEDDING_X: usize = CENTER_X + EMBEDDING_CENTER_OFFSET - EMBEDDING_WIDTH / 2;
const EMBEDDING_BRANCH_Y: usize = 96;
const EMBEDDING_ADD_Y: usize = 224;
const EMBEDDING_ADD_RADIUS: usize = 16;
pub(super) const HIDDEN_Y: usize = 264;
pub(super) const HIDDEN_HEIGHT: usize = 36;
const HIDDEN_WIDTH: usize = 260;
const HIDDEN_X: usize = CENTER_X - HIDDEN_WIDTH / 2;
const MAIN_WIDTH: usize = 390;
pub(super) const MAIN_X: usize = CENTER_X - MAIN_WIDTH / 2;
const SELECTION_WIDTH: usize = 460;
const SELECTION_X: usize = CENTER_X - SELECTION_WIDTH / 2;

pub(super) fn input_and_embeddings(interaction: ArchitectureInteraction) -> impl IntoView {
    view! {
        {stage_node(
            NodeSpec {
                id: ArchitectureNodeId::InputContext,
                class: "architecture-node-input",
                x: INPUT_X,
                y: INPUT_Y,
                width: INPUT_WIDTH,
                height: INPUT_HEIGHT,
            },
            interaction,
        )}
        {stage_node(
            NodeSpec {
                id: ArchitectureNodeId::TokenEmbedding,
                class: "architecture-node-embedding",
                x: TOKEN_EMBEDDING_X,
                y: EMBEDDING_Y,
                width: EMBEDDING_WIDTH,
                height: EMBEDDING_HEIGHT,
            },
            interaction,
        )}
        {stage_node(
            NodeSpec {
                id: ArchitectureNodeId::PositionEmbedding,
                class: "architecture-node-embedding",
                x: POSITION_EMBEDDING_X,
                y: EMBEDDING_Y,
                width: EMBEDDING_WIDTH,
                height: EMBEDDING_HEIGHT,
            },
            interaction,
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
        {embedding_merge_and_hidden(interaction)}
    }
}
fn embedding_merge_and_hidden(interaction: ArchitectureInteraction) -> impl IntoView {
    view! {
        <circle
            class="architecture-add"
            cx=CENTER_X
            cy=EMBEDDING_ADD_Y
            r=EMBEDDING_ADD_RADIUS
        ></circle>
        {stage_node(
            NodeSpec {
                id: ArchitectureNodeId::HiddenState,
                class: "architecture-node-hidden",
                x: HIDDEN_X,
                y: HIDDEN_Y,
                width: HIDDEN_WIDTH,
                height: HIDDEN_HEIGHT,
            },
            interaction,
        )}
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
pub(super) fn generation_nodes(
    layout: DiagramLayout,
    interaction: ArchitectureInteraction,
) -> impl IntoView {
    let specs = [
        NodeSpec {
            id: ArchitectureNodeId::FinalLayerNorm,
            class: "architecture-node-normalization",
            x: MAIN_X,
            y: layout.final_layer_norm_y,
            width: MAIN_WIDTH,
            height: COMPACT_HEIGHT,
        },
        NodeSpec {
            id: ArchitectureNodeId::LmHead,
            class: "architecture-node-projection",
            x: MAIN_X,
            y: layout.lm_head_y,
            width: MAIN_WIDTH,
            height: COMPACT_HEIGHT,
        },
        NodeSpec {
            id: ArchitectureNodeId::Logits,
            class: "architecture-node-logits",
            x: MAIN_X,
            y: layout.logits_y,
            width: MAIN_WIDTH,
            height: COMPACT_HEIGHT,
        },
        NodeSpec {
            id: ArchitectureNodeId::TokenSelection,
            class: "architecture-node-sampling",
            x: SELECTION_X,
            y: layout.selection_y,
            width: SELECTION_WIDTH,
            height: SELECTION_HEIGHT,
        },
        NodeSpec {
            id: ArchitectureNodeId::GeneratedToken,
            class: "architecture-node-token",
            x: MAIN_X,
            y: layout.generated_y,
            width: MAIN_WIDTH,
            height: TOKEN_HEIGHT,
        },
        NodeSpec {
            id: ArchitectureNodeId::AppendContext,
            class: "architecture-node-append",
            x: MAIN_X,
            y: layout.append_y,
            width: MAIN_WIDTH,
            height: TOKEN_HEIGHT,
        },
    ];
    view! {
        {specs
            .into_iter()
            .map(|spec| stage_node(spec, interaction))
            .collect_view()}
    }
}
