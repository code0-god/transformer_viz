use nanogpt_schema::TraceMode;

use crate::{ForwardRequest, Gpt, ModelError};

pub(crate) fn validate(model: &Gpt, request: &ForwardRequest<'_>) -> Result<(), ModelError> {
    if request.token_ids.is_empty() {
        return Err(ModelError::EmptySequence);
    }
    let block_size = model.wpe.embeddings().dim(0)?;
    if request.token_ids.len() > block_size {
        return Err(ModelError::SequenceTooLong {
            length: request.token_ids.len(),
            block_size,
        });
    }
    let vocab_size = model.wte.embeddings().dim(0)?;
    if let Some(token) = request
        .token_ids
        .iter()
        .find(|token| usize::try_from(token.0).map_or(true, |id| id >= vocab_size))
    {
        return Err(ModelError::TokenOutOfRange(token.0));
    }
    match request.trace_mode {
        TraceMode::Off | TraceMode::Summary => Ok(()),
        TraceMode::Block { layer } => validate_layer(model, layer),
        TraceMode::AttentionHead { layer, head } => {
            validate_layer(model, layer)?;
            validate_head(model, layer, head)
        }
        TraceMode::Token { layer, head, token } => {
            validate_layer(model, layer)?;
            validate_head(model, layer, head)?;
            if token < request.token_ids.len() {
                Ok(())
            } else {
                Err(ModelError::InvalidTraceSelector)
            }
        }
    }
}

const fn validate_layer(model: &Gpt, layer: usize) -> Result<(), ModelError> {
    if layer < model.blocks.len() {
        Ok(())
    } else {
        Err(ModelError::InvalidTraceSelector)
    }
}

fn validate_head(model: &Gpt, layer: usize, head: usize) -> Result<(), ModelError> {
    let block = model
        .blocks
        .get(layer)
        .ok_or(ModelError::InvalidTraceSelector)?;
    if head < block.attn.n_head {
        Ok(())
    } else {
        Err(ModelError::InvalidTraceSelector)
    }
}
