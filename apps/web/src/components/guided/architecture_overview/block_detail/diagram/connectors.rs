//! Residual and vertical connectors for Block Detail.

use leptos::prelude::*;

use super::{
    ADD_RADIUS, ADD1_Y, ADD2_Y, ATTENTION_HEIGHT, ATTENTION_Y, CENTER_X, FIRST_JUNCTION_Y,
    INPUT_HEIGHT, INPUT_Y, LN_HEIGHT, LN1_Y, LN2_Y, MLP_HEIGHT, MLP_Y, OUTPUT_Y, RAIL_X,
    SECOND_JUNCTION_Y, STATE_HEIGHT, X_PRIME_Y,
};

pub(super) fn connectors() -> impl IntoView {
    view! {
        {vertical_connector("input-to-ln1", INPUT_Y + INPUT_HEIGHT, LN1_Y)}
        {vertical_connector("ln1-to-attention", LN1_Y + LN_HEIGHT, ATTENTION_Y)}
        {vertical_connector(
            "attention-to-add1",
            ATTENTION_Y + ATTENTION_HEIGHT,
            ADD1_Y - ADD_RADIUS,
        )}
        <path
            class="architecture-detail-residual"
            data-connector="input-to-residual1"
            d=format!(
                "M {CENTER_X} {FIRST_JUNCTION_Y} H {RAIL_X} V {ADD1_Y} H {}",
                CENTER_X + ADD_RADIUS
            )
        ></path>
        {vertical_connector("add1-to-x-prime", ADD1_Y + ADD_RADIUS, X_PRIME_Y)}
        {vertical_connector("x-prime-to-ln2", X_PRIME_Y + STATE_HEIGHT, LN2_Y)}
        {vertical_connector("ln2-to-mlp", LN2_Y + LN_HEIGHT, MLP_Y)}
        {vertical_connector(
            "mlp-to-add2",
            MLP_Y + MLP_HEIGHT,
            ADD2_Y - ADD_RADIUS,
        )}
        <path
            class="architecture-detail-residual"
            data-connector="x-prime-to-residual2"
            d=format!(
                "M {CENTER_X} {SECOND_JUNCTION_Y} H {RAIL_X} V {ADD2_Y} H {}",
                CENTER_X + ADD_RADIUS
            )
        ></path>
        {vertical_connector("add2-to-output", ADD2_Y + ADD_RADIUS, OUTPUT_Y)}
    }
}

fn vertical_connector(name: &'static str, y1: usize, y2: usize) -> impl IntoView {
    view! {
        <line
            class="architecture-detail-flow"
            data-connector=name
            x1=CENTER_X
            y1=y1
            x2=CENTER_X
            y2=y2
        ></line>
    }
}

pub(super) fn junction(y: usize, name: &'static str) -> impl IntoView {
    view! {
        <circle
            class="architecture-residual-junction"
            data-junction=name
            cx=CENTER_X
            cy=y
            r="5"
            aria-hidden="true"
        ></circle>
    }
}
