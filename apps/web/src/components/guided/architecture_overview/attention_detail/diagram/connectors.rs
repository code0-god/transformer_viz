//! Ordered QKV, score, value, and output connectors.

use leptos::prelude::*;

use super::{
    AGGREGATION_Y, ATTENTION_OUTPUT_Y, COLUMN_HEIGHT, COLUMN_Y, HEAD_OUTPUT_Y, INPUT_HEIGHT,
    INPUT_Y, KEY_X, MASK_HEIGHT, MASK_X, MASK_Y, MERGE_Y, OPERATION_HEIGHT, OUTPUT_WIDTH, OUTPUT_X,
    PROJECTION_Y, QKV_HEIGHT, QKV_X, QKV_Y, QUERY_X, SCALE_HEIGHT, SCALE_WIDTH, SCALE_X, SCALE_Y,
    SCORES_HEIGHT, SCORES_X, SCORES_Y, SOFTMAX_HEIGHT, SOFTMAX_X, SOFTMAX_Y, SPLIT_HEIGHT, SPLIT_Y,
    STATE_HEIGHT, VALUE_X,
};

const QUERY_CENTER: usize = QUERY_X + 110;
const KEY_CENTER: usize = KEY_X + 110;
const VALUE_CENTER: usize = VALUE_X + 110;
const QKV_CENTER: usize = QKV_X + 180;
const SCORE_CENTER: usize = SCORES_X + 150;
const OUTPUT_CENTER: usize = OUTPUT_X + OUTPUT_WIDTH / 2;

pub(super) fn attention_connectors() -> impl IntoView {
    view! {
        {flow_line("input-to-qkv", QKV_CENTER, INPUT_Y + INPUT_HEIGHT, QKV_CENTER, QKV_Y)}
        {flow_path("qkv-to-query", format!("M {QKV_CENTER} {} V 225 H {QUERY_CENTER} V {COLUMN_Y}", QKV_Y + QKV_HEIGHT))}
        {flow_path("qkv-to-key", format!("M {QKV_CENTER} {} V {COLUMN_Y}", QKV_Y + QKV_HEIGHT))}
        {flow_path("qkv-to-value", format!("M {QKV_CENTER} {} V 225 H {VALUE_CENTER} V {COLUMN_Y}", QKV_Y + QKV_HEIGHT))}
        {flow_line("query-to-heads", QUERY_CENTER, COLUMN_Y + COLUMN_HEIGHT, QUERY_CENTER, SPLIT_Y)}
        {flow_line("key-to-heads", KEY_CENTER, COLUMN_Y + COLUMN_HEIGHT, KEY_CENTER, SPLIT_Y)}
        {flow_line("value-to-heads", VALUE_CENTER, COLUMN_Y + COLUMN_HEIGHT, VALUE_CENTER, SPLIT_Y)}
        {flow_path("query-heads-to-scores", format!("M {QUERY_CENTER} {} V 482 H 300 V {SCORES_Y}", SPLIT_Y + SPLIT_HEIGHT))}
        {flow_path("key-heads-to-scores", format!("M {KEY_CENTER} {} V 482 H 420 V {SCORES_Y}", SPLIT_Y + SPLIT_HEIGHT))}
        {flow_line("scores-to-scale", SCORE_CENTER, SCORES_Y + SCORES_HEIGHT, SCALE_X + SCALE_WIDTH / 2, SCALE_Y)}
        {flow_line("scale-to-mask", SCALE_X + SCALE_WIDTH / 2, SCALE_Y + SCALE_HEIGHT, MASK_X + 150, MASK_Y)}
        {flow_line("mask-to-softmax", MASK_X + 150, MASK_Y + MASK_HEIGHT, SOFTMAX_X + 150, SOFTMAX_Y)}
        {flow_path("softmax-to-value-aggregation", format!("M {} {} V 980 H {OUTPUT_CENTER} V {AGGREGATION_Y}", SOFTMAX_X + 150, SOFTMAX_Y + SOFTMAX_HEIGHT))}
        {flow_path("value-heads-to-aggregation", format!("M {VALUE_CENTER} {} V {} H {}", SPLIT_Y + SPLIT_HEIGHT, AGGREGATION_Y + OPERATION_HEIGHT / 2, OUTPUT_X + OUTPUT_WIDTH))}
        <text
            class="architecture-attention-connector-label"
            x=VALUE_CENTER + 16
            y="742"
            aria-hidden="true"
        >
            "V [H,T,D]"
        </text>
        {flow_line("aggregation-to-head-outputs", OUTPUT_CENTER, AGGREGATION_Y + OPERATION_HEIGHT, OUTPUT_CENTER, HEAD_OUTPUT_Y)}
        {flow_line("head-outputs-to-merge", OUTPUT_CENTER, HEAD_OUTPUT_Y + STATE_HEIGHT, OUTPUT_CENTER, MERGE_Y)}
        {flow_line("merge-to-output-projection", OUTPUT_CENTER, MERGE_Y + OPERATION_HEIGHT, OUTPUT_CENTER, PROJECTION_Y)}
        {flow_line("output-projection-to-attention-output", OUTPUT_CENTER, PROJECTION_Y + OPERATION_HEIGHT, OUTPUT_CENTER, ATTENTION_OUTPUT_Y)}
    }
}

fn flow_line(name: &'static str, x1: usize, y1: usize, x2: usize, y2: usize) -> impl IntoView {
    view! {
        <line
            class="architecture-attention-flow"
            data-connector=name
            x1=x1
            y1=y1
            x2=x2
            y2=y2
        ></line>
    }
}

fn flow_path(name: &'static str, d: String) -> impl IntoView {
    view! {
        <path
            class="architecture-attention-flow"
            data-connector=name
            d=d
        ></path>
    }
}
