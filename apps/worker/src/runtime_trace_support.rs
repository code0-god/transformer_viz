//! Private tensor-to-schema conversion helpers for runtime trace capture.

use candle_core::Tensor;
use nanogpt_model::ForwardOutput;
use nanogpt_schema::{
    FiniteF32, LogitCandidate, LogitsTrace, OperationId, SourceReference, TensorSnapshot, TokenInfo,
};

use crate::runtime_error::RuntimeError;

#[derive(Debug, Clone, Copy)]
pub(crate) struct TokenSelection<'a> {
    pub(crate) run_id: u64,
    pub(crate) layer: usize,
    pub(crate) head: usize,
    pub(crate) token: usize,
    pub(crate) tokens: &'a [TokenInfo],
}

pub(crate) fn snapshot(name: &str, tensor: &Tensor) -> Result<TensorSnapshot, RuntimeError> {
    let raw = tensor.contiguous()?.flatten_all()?.to_vec1::<f32>()?;
    let values = raw
        .into_iter()
        .map(FiniteF32::new)
        .collect::<Result<Vec<_>, _>>()?;
    Ok(TensorSnapshot::new(
        name.to_owned(),
        tensor.dims().to_vec(),
        values,
    )?)
}

pub(crate) fn logits_trace(output: &ForwardOutput) -> Result<LogitsTrace, RuntimeError> {
    let values = output
        .top_k
        .iter()
        .map(|candidate| FiniteF32::new(candidate.logit))
        .collect::<Result<Vec<_>, _>>()?;
    let logits = TensorSnapshot::new("top_10_logits".to_owned(), vec![values.len()], values)?;
    let top_k = output
        .top_k
        .iter()
        .map(|candidate| {
            Ok(LogitCandidate {
                token_id: candidate.token_id,
                display: token_display(candidate.token_id.0),
                logit: FiniteF32::new(candidate.logit)?,
                probability: FiniteF32::new(candidate.probability)?,
            })
        })
        .collect::<Result<Vec<_>, RuntimeError>>()?;
    Ok(LogitsTrace {
        logits,
        top_k,
        source: source(OperationId::Logits)?,
    })
}

pub(crate) fn source(operation: OperationId) -> Result<SourceReference, RuntimeError> {
    Ok(crate::source_map::source_reference(operation)?)
}

fn token_display(id: u32) -> String {
    match id {
        0 => "<BOS>".to_owned(),
        1 => "<EOS>".to_owned(),
        2 => "<UNK>".to_owned(),
        3..=258 => {
            char::from_u32(id - 3).map_or_else(|| "<?>".to_owned(), |value| value.to_string())
        }
        _ => "<?>".to_owned(),
    }
}
