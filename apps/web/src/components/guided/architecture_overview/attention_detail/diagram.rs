//! Explicit nanoGPT-compatible Self-Attention data-flow diagram.

use leptos::prelude::*;

use crate::app::{
    architecture_overview::ArchitectureNodeId,
    notation::{
        ATTENTION_INPUT_DETAIL, ATTENTION_INPUT_TITLE, ATTENTION_OUTPUT_DETAIL,
        ATTENTION_OUTPUT_TITLE, ATTENTION_VALUE_CAPTION, HEAD_OUTPUT_DETAIL, HEAD_OUTPUT_TITLE,
    },
};

use super::super::node::ArchitectureInteraction;

mod connectors;
mod nodes;

use connectors::attention_connectors;
use nodes::{operation_node, split_heads_node, state_node};

pub(super) const WIDTH: usize = 1000;
pub(super) const HEIGHT: usize = 1555;
pub(super) const INPUT_X: usize = 310;
pub(super) const INPUT_Y: usize = 24;
pub(super) const INPUT_WIDTH: usize = 320;
pub(super) const INPUT_HEIGHT: usize = 56;
pub(super) const QKV_X: usize = 290;
pub(super) const QKV_Y: usize = 120;
pub(super) const QKV_WIDTH: usize = 360;
pub(super) const QKV_HEIGHT: usize = 72;
pub(super) const QUERY_X: usize = 70;
pub(super) const KEY_X: usize = 360;
pub(super) const VALUE_X: usize = 650;
pub(super) const COLUMN_Y: usize = 260;
pub(super) const COLUMN_WIDTH: usize = 220;
pub(super) const COLUMN_HEIGHT: usize = 68;
pub(super) const SPLIT_Y: usize = 380;
pub(super) const SPLIT_HEIGHT: usize = 72;
pub(super) const SCORES_X: usize = 210;
pub(super) const SCORES_Y: usize = 520;
pub(super) const SPINE_WIDTH: usize = 300;
pub(super) const SCORES_HEIGHT: usize = 72;
pub(super) const SCALE_X: usize = 240;
pub(super) const SCALE_Y: usize = 640;
pub(super) const SCALE_WIDTH: usize = 240;
pub(super) const SCALE_HEIGHT: usize = 64;
pub(super) const MASK_X: usize = 210;
pub(super) const MASK_Y: usize = 750;
pub(super) const MASK_HEIGHT: usize = 72;
pub(super) const SOFTMAX_X: usize = 210;
pub(super) const SOFTMAX_Y: usize = 870;
pub(super) const SOFTMAX_HEIGHT: usize = 72;
pub(super) const OUTPUT_X: usize = 320;
pub(super) const AGGREGATION_Y: usize = 1010;
pub(super) const OUTPUT_WIDTH: usize = 300;
pub(super) const OPERATION_HEIGHT: usize = 72;
pub(super) const HEAD_OUTPUT_Y: usize = 1130;
pub(super) const STATE_HEIGHT: usize = 58;
pub(super) const MERGE_Y: usize = 1235;
pub(super) const PROJECTION_Y: usize = 1355;
pub(super) const ATTENTION_OUTPUT_Y: usize = 1470;

pub(super) fn attention_detail_diagram(interaction: ArchitectureInteraction) -> impl IntoView {
    view! {
        <figure class="architecture-figure architecture-detail-figure architecture-attention-figure">
            <div
                class="architecture-svg-scroll architecture-attention-scroll"
                tabindex="0"
                role="region"
                aria-label="Scrollable Self-Attention architecture diagram"
            >
                <svg
                    class="architecture-diagram architecture-attention-diagram"
                    viewBox=format!("0 0 {WIDTH} {HEIGHT}")
                    role="img"
                    aria-labelledby="attention-detail-svg-title attention-detail-svg-desc"
                    preserveAspectRatio="xMidYMid meet"
                >
                    <title id="attention-detail-svg-title">
                        "Causal Multi-Head Self-Attention architecture"
                    </title>
                    <desc id="attention-detail-svg-desc">
                        "LN1 output enters one combined QKV projection. Query and Key form scaled, causally masked probabilities. Value joins only at aggregation. Head outputs merge and pass through c_proj to Attention Output."
                    </desc>
                    <defs>
                        <marker
                            id="attention-detail-arrow"
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

                    {state_node(INPUT_X, INPUT_Y, INPUT_WIDTH, INPUT_HEIGHT, ATTENTION_INPUT_TITLE, ATTENTION_INPUT_DETAIL)}
                    {operation_node(ArchitectureNodeId::AttentionQkvProjection, "architecture-attention-projection", QKV_X, QKV_Y, QKV_WIDTH, QKV_HEIGHT, interaction)}
                    {operation_node(ArchitectureNodeId::AttentionQuery, "architecture-attention-query", QUERY_X, COLUMN_Y, COLUMN_WIDTH, COLUMN_HEIGHT, interaction)}
                    {operation_node(ArchitectureNodeId::AttentionKey, "architecture-attention-key", KEY_X, COLUMN_Y, COLUMN_WIDTH, COLUMN_HEIGHT, interaction)}
                    {operation_node(ArchitectureNodeId::AttentionValue, "architecture-attention-value", VALUE_X, COLUMN_Y, COLUMN_WIDTH, COLUMN_HEIGHT, interaction)}
                    {split_heads_node(QUERY_X, SPLIT_Y)}
                    {split_heads_node(KEY_X, SPLIT_Y)}
                    {split_heads_node(VALUE_X, SPLIT_Y)}
                    {operation_node(ArchitectureNodeId::AttentionScores, "architecture-attention-score", SCORES_X, SCORES_Y, SPINE_WIDTH, SCORES_HEIGHT, interaction)}
                    {operation_node(ArchitectureNodeId::AttentionScale, "architecture-attention-scale", SCALE_X, SCALE_Y, SCALE_WIDTH, SCALE_HEIGHT, interaction)}
                    {operation_node(ArchitectureNodeId::AttentionCausalMask, "architecture-attention-mask", MASK_X, MASK_Y, SPINE_WIDTH, MASK_HEIGHT, interaction)}
                    {operation_node(ArchitectureNodeId::AttentionSoftmax, "architecture-attention-softmax", SOFTMAX_X, SOFTMAX_Y, SPINE_WIDTH, SOFTMAX_HEIGHT, interaction)}
                    {operation_node(ArchitectureNodeId::AttentionValueAggregation, "architecture-attention-aggregation", OUTPUT_X, AGGREGATION_Y, OUTPUT_WIDTH, OPERATION_HEIGHT, interaction)}
                    {state_node(OUTPUT_X, HEAD_OUTPUT_Y, OUTPUT_WIDTH, STATE_HEIGHT, HEAD_OUTPUT_TITLE, HEAD_OUTPUT_DETAIL)}
                    {operation_node(ArchitectureNodeId::AttentionMergeHeads, "architecture-attention-merge", OUTPUT_X, MERGE_Y, OUTPUT_WIDTH, OPERATION_HEIGHT, interaction)}
                    {operation_node(ArchitectureNodeId::AttentionOutputProjection, "architecture-attention-projection", OUTPUT_X, PROJECTION_Y, OUTPUT_WIDTH, OPERATION_HEIGHT, interaction)}
                    {state_node(OUTPUT_X, ATTENTION_OUTPUT_Y, OUTPUT_WIDTH, STATE_HEIGHT, ATTENTION_OUTPUT_TITLE, ATTENTION_OUTPUT_DETAIL)}
                    {attention_connectors()}
                </svg>
            </div>
            <figcaption>
                {ATTENTION_VALUE_CAPTION}
            </figcaption>
        </figure>
    }
}
