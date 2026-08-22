//! MLP expansion, exact GELU, projection, and residual stage.

use leptos::prelude::*;

use crate::{app::state::AppState, trace_lookup::TraceLookup};

use super::{
    btc_row, facts,
    flow::{FlowNode, flow_diagram},
    vector::{VectorStrip, shared_scale, vector_strip},
};

pub(super) fn mlp_residual(state: &AppState) -> AnyView {
    let Some(block) = state.block.as_ref() else {
        return facts::waiting("mlp-residual");
    };
    let lookup = TraceLookup::new().with_block(block);
    let tensors = (
        lookup.block_tensor("attention_residual"),
        lookup.block_tensor("mlp_layer_norm"),
        lookup.block_tensor("mlp_input"),
        lookup.block_tensor("mlp_hidden"),
        lookup.block_tensor("mlp_activated"),
        lookup.block_tensor("mlp_output"),
        lookup.block_tensor("block_output"),
    );
    let (
        Ok(residual),
        Ok(normalized),
        Ok(input),
        Ok(hidden),
        Ok(activated),
        Ok(projected),
        Ok(output),
    ) = tensors
    else {
        return facts::error_state("complete MLP trace");
    };
    let token = state.selection.token;
    let rows = (
        btc_row(hidden, token),
        btc_row(activated, token),
        btc_row(projected, token),
        btc_row(residual, token),
        btc_row(output, token),
    );
    let (Ok(hidden_row), Ok(activated_row), Ok(projected_row), Ok(residual_row), Ok(output_row)) =
        rows
    else {
        return facts::error_state("selected MLP row");
    };
    let hidden_strip = VectorStrip {
        label: "hidden 4C",
        tensor_id: hidden.id.clone(),
        values: hidden_row,
        tone: "mlp",
        selected_feature: 0,
    };
    let activated_strip = VectorStrip {
        label: "exact GELU(4C)",
        tensor_id: activated.id.clone(),
        values: activated_row,
        tone: "mlp",
        selected_feature: 0,
    };
    let projected_strip = VectorStrip {
        label: "projected C · MLP addend",
        tensor_id: projected.id.clone(),
        values: projected_row,
        tone: "mlp",
        selected_feature: 0,
    };
    let residual_strip = VectorStrip {
        label: "attention residual addend",
        tensor_id: residual.id.clone(),
        values: residual_row,
        tone: "residual",
        selected_feature: 0,
    };
    let output_strip = VectorStrip {
        label: "block output result",
        tensor_id: output.id.clone(),
        values: output_row,
        tone: "residual",
        selected_feature: 0,
    };
    let mlp_scale = shared_scale(&[hidden_strip.clone(), activated_strip.clone()]);
    let residual_scale = shared_scale(&[
        residual_strip.clone(),
        projected_strip.clone(),
        output_strip.clone(),
    ]);
    view! {
        <div class="stage-visual mlp-visual" data-visual="mlp-residual" data-trace-ready="true">
            {flow_diagram("MLP expansion and residual flow", "Attention residual is normalized, expanded to four times C, transformed by exact GELU, projected to C, and added back.", vec![
                FlowNode { label: "attention residual", tensor_id: residual.id.clone(), shape: residual.shape.clone(), tone: "residual" },
                FlowNode { label: "LN₂ / input", tensor_id: normalized.id.clone(), shape: input.shape.clone(), tone: "mlp" },
                FlowNode { label: "hidden 4C", tensor_id: hidden.id.clone(), shape: hidden.shape.clone(), tone: "mlp" },
                FlowNode { label: "exact GELU", tensor_id: activated.id.clone(), shape: activated.shape.clone(), tone: "mlp" },
                FlowNode { label: "projected C", tensor_id: projected.id.clone(), shape: projected.shape.clone(), tone: "mlp" },
                FlowNode { label: "+ block output", tensor_id: output.id.clone(), shape: output.shape.clone(), tone: "residual" },
            ])}
            <div class="mlp-strips">{vector_strip(hidden_strip, mlp_scale)}{vector_strip(activated_strip, mlp_scale)}</div>
            <div class="residual-equation"><span>"attention residual"</span><b>"+"</b><span>"MLP output"</span><b>"="</b><span>"block output"</span></div>
            <div class="residual-strips">{vector_strip(residual_strip, residual_scale)}{vector_strip(projected_strip, residual_scale)}{vector_strip(output_strip, residual_scale)}</div>
            <div class="comparison-ledger">{facts::tensor_facts(normalized, "LN₂")}{facts::tensor_facts(input, "MLP input")}{facts::tensor_facts(output, "residual output")}</div>
        </div>
    }.into_any()
}
