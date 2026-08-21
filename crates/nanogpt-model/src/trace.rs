use nanogpt_schema::OperationId;

use crate::layers::BlockOutput;
use crate::{CausalMask, ModelError, TraceSink, TraceTensor};

#[derive(Clone, Copy)]
pub(crate) struct AttentionSelection {
    pub(super) layer: usize,
    pub(super) head: usize,
}

#[derive(Clone, Copy)]
pub(crate) struct TokenSelection {
    pub(super) layer: usize,
    pub(super) head: usize,
    pub(super) token: usize,
}

pub(crate) fn capture_summary(trace: &mut impl TraceSink, layer: usize, block: &BlockOutput) {
    for (operation, name, tensor) in [
        (OperationId::AttentionLayerNorm, "block_input", &block.input),
        (
            OperationId::AttentionResidual,
            "attention_projected",
            &block.attention.projected,
        ),
        (OperationId::Mlp, "mlp_output", &block.mlp.output),
        (OperationId::MlpResidual, "block_output", &block.output),
    ] {
        trace.tensor(TraceTensor {
            operation,
            layer: Some(layer),
            name,
            tensor,
        });
    }
}

pub(crate) fn capture_block(
    trace: &mut impl TraceSink,
    layer: usize,
    block: &BlockOutput,
) -> Result<(), ModelError> {
    for (operation, name, tensor) in [
        (OperationId::AttentionLayerNorm, "block_input", &block.input),
        (
            OperationId::AttentionLayerNorm,
            "attention_layer_norm",
            &block.attention_layer_norm,
        ),
        (OperationId::QueryKeyValue, "query", &block.attention.query),
        (OperationId::QueryKeyValue, "key", &block.attention.key),
        (OperationId::QueryKeyValue, "value", &block.attention.value),
        (
            OperationId::Attention,
            "attention_raw_scores",
            &block.attention.raw_scores,
        ),
        (
            OperationId::Attention,
            "attention_scaled_scores",
            &block.attention.scaled_scores,
        ),
        (
            OperationId::Attention,
            "attention_probabilities",
            &block.attention.probabilities,
        ),
        (
            OperationId::Attention,
            "attention_output",
            &block.attention.attended,
        ),
        (
            OperationId::Attention,
            "attention_merged",
            &block.attention.merged,
        ),
        (
            OperationId::AttentionResidual,
            "attention_projected",
            &block.attention.projected,
        ),
        (
            OperationId::AttentionResidual,
            "attention_residual",
            &block.attention_residual,
        ),
        (
            OperationId::MlpLayerNorm,
            "mlp_layer_norm",
            &block.mlp_layer_norm,
        ),
        (OperationId::Mlp, "mlp_input", &block.mlp.input),
        (OperationId::Mlp, "mlp_hidden", &block.mlp.hidden),
        (OperationId::Mlp, "mlp_activated", &block.mlp.activated),
        (OperationId::Mlp, "mlp_output", &block.mlp.output),
        (OperationId::MlpResidual, "block_output", &block.output),
    ] {
        trace.tensor(TraceTensor {
            operation,
            layer: Some(layer),
            name,
            tensor,
        });
    }
    let sequence_length = block.attention_residual.dim(1)?;
    trace.causal_mask(CausalMask {
        layer,
        rows: sequence_length,
        columns: sequence_length,
        allowed: &block.attention.mask,
    });
    Ok(())
}

pub(crate) fn capture_attention_head(
    trace: &mut impl TraceSink,
    selection: AttentionSelection,
    block: &BlockOutput,
) -> Result<(), ModelError> {
    let query = block.attention.query.narrow(1, selection.head, 1)?;
    let key = block.attention.key.narrow(1, selection.head, 1)?;
    let value = block.attention.value.narrow(1, selection.head, 1)?;
    let raw_scores = block.attention.raw_scores.narrow(1, selection.head, 1)?;
    let scaled_scores = block.attention.scaled_scores.narrow(1, selection.head, 1)?;
    let probabilities = block.attention.probabilities.narrow(1, selection.head, 1)?;
    let output = block.attention.attended.narrow(1, selection.head, 1)?;
    for (operation, name, tensor) in [
        (OperationId::QueryKeyValue, "query", &query),
        (OperationId::QueryKeyValue, "key", &key),
        (OperationId::QueryKeyValue, "value", &value),
        (OperationId::Attention, "attention_raw_scores", &raw_scores),
        (
            OperationId::Attention,
            "attention_scaled_scores",
            &scaled_scores,
        ),
        (
            OperationId::Attention,
            "attention_probabilities",
            &probabilities,
        ),
        (OperationId::Attention, "attention_output", &output),
    ] {
        trace.tensor(TraceTensor {
            operation,
            layer: Some(selection.layer),
            name,
            tensor,
        });
    }
    let sequence_length = block.attention_residual.dim(1)?;
    trace.causal_mask(CausalMask {
        layer: selection.layer,
        rows: sequence_length,
        columns: sequence_length,
        allowed: &block.attention.mask,
    });
    Ok(())
}

pub(crate) fn capture_token(
    trace: &mut impl TraceSink,
    selection: TokenSelection,
    block: &BlockOutput,
) -> Result<(), ModelError> {
    let input = block.input.narrow(1, selection.token, 1)?;
    let query =
        block
            .attention
            .query
            .narrow(1, selection.head, 1)?
            .narrow(2, selection.token, 1)?;
    let key = block
        .attention
        .key
        .narrow(1, selection.head, 1)?
        .narrow(2, selection.token, 1)?;
    let value =
        block
            .attention
            .value
            .narrow(1, selection.head, 1)?
            .narrow(2, selection.token, 1)?;
    let probabilities = block
        .attention
        .probabilities
        .narrow(1, selection.head, 1)?
        .narrow(2, selection.token, 1)?;
    let attention = block
        .attention
        .attended
        .narrow(1, selection.head, 1)?
        .narrow(2, selection.token, 1)?;
    let mlp = block.mlp.output.narrow(1, selection.token, 1)?;
    for (operation, name, tensor) in [
        (OperationId::AttentionLayerNorm, "block_input", &input),
        (OperationId::QueryKeyValue, "query", &query),
        (OperationId::QueryKeyValue, "key", &key),
        (OperationId::QueryKeyValue, "value", &value),
        (
            OperationId::Attention,
            "attention_probabilities",
            &probabilities,
        ),
        (OperationId::Attention, "attention_output", &attention),
        (OperationId::Mlp, "mlp_output", &mlp),
    ] {
        trace.tensor(TraceTensor {
            operation,
            layer: Some(selection.layer),
            name,
            tensor,
        });
    }
    Ok(())
}
