//! Stable-ID access to captured trace tensors and checked visualization slices.
use nanogpt_schema::{
    AttentionHeadTrace, BlockTrace, EmbeddingTrace, FiniteF32, LogitsTrace, OperationId,
    RunSummary, TensorSnapshot, TokenTrace,
};
use thiserror::Error;
/// Lookup and tensor-shape failures that are safe to surface as empty UI states.
#[derive(Debug, Clone, PartialEq, Eq, Error)]
pub enum TraceLookupError {
    /// The requested trace kind has not been loaded.
    #[error("{0} trace is not available")]
    Empty(&'static str),
    /// No tensor has the requested stable ID.
    #[error("tensor '{0}' is not available")]
    TensorNotFound(String),
    /// A tensor rank does not match the requested interpretation.
    #[error("tensor '{0}' requires rank {1}, found shape {2:?}")]
    InvalidShape(String, usize, Vec<usize>),
    /// A batch, head, or token selector is outside the captured shape.
    #[error("tensor '{0}' selector is outside shape {1:?}")]
    SelectionOutOfBounds(String, Vec<usize>),
}
/// Stable-ID lookup over any currently loaded trace response.
#[derive(Debug, Clone, Copy)]
pub struct TraceLookup<'a> {
    summary: Option<&'a RunSummary>,
    block: Option<&'a BlockTrace>,
    head: Option<&'a AttentionHeadTrace>,
    token: Option<&'a TokenTrace>,
}
impl<'a> TraceLookup<'a> {
    /// Creates an empty lookup. Add available responses with the builder methods.
    #[must_use]
    pub const fn new() -> Self {
        Self {
            summary: None,
            block: None,
            head: None,
            token: None,
        }
    }
    /// Adds a run summary.
    #[must_use]
    pub const fn with_summary(mut self, summary: &'a RunSummary) -> Self {
        self.summary = Some(summary);
        self
    }
    /// Adds a block trace.
    #[must_use]
    pub const fn with_block(mut self, block: &'a BlockTrace) -> Self {
        self.block = Some(block);
        self
    }
    /// Adds an attention-head trace.
    #[must_use]
    pub const fn with_head(mut self, head: &'a AttentionHeadTrace) -> Self {
        self.head = Some(head);
        self
    }
    /// Adds a token trace.
    #[must_use]
    pub const fn with_token(mut self, token: &'a TokenTrace) -> Self {
        self.token = Some(token);
        self
    }
    /// Returns all three embedding snapshots, or an empty state before a run completes.
    #[must_use]
    pub fn embeddings(&self) -> Option<&'a EmbeddingTrace> {
        self.summary.map(|summary| &summary.embeddings)
    }
    /// Returns final layer normalization, or an empty state before a run completes.
    #[must_use]
    pub fn final_layer_norm(&self) -> Option<&'a TensorSnapshot> {
        self.summary.map(|summary| &summary.final_layer_norm)
    }
    /// Returns final logits, or an empty state before a run completes.
    #[must_use]
    pub fn logits(&self) -> Option<&'a LogitsTrace> {
        self.summary.map(|summary| &summary.logits)
    }
    /// Finds an operation tensor by both operation and stable tensor ID.
    /// # Errors
    /// Returns a typed empty or missing-ID error.
    pub fn operation_tensor(
        &self,
        operation: OperationId,
        id: &str,
    ) -> Result<&'a TensorSnapshot, TraceLookupError> {
        let block = self.block.ok_or(TraceLookupError::Empty("block"))?;
        block
            .operations
            .iter()
            .find(|trace| trace.operation == operation && trace.tensor.id == id)
            .map(|trace| &trace.tensor)
            .ok_or_else(|| TraceLookupError::TensorNotFound(id.to_owned()))
    }
    /// Finds any tensor in a block response by stable ID.
    /// # Errors
    /// Returns a typed empty or missing-ID error.
    pub fn block_tensor(&self, id: &str) -> Result<&'a TensorSnapshot, TraceLookupError> {
        let block = self.block.ok_or(TraceLookupError::Empty("block"))?;
        block
            .operations
            .iter()
            .map(|trace| &trace.tensor)
            .chain([
                &block.attention_residual,
                &block.mlp.input,
                &block.mlp.hidden,
                &block.mlp.activated,
                &block.mlp.output,
                &block.output,
            ])
            .find(|tensor| tensor.id == id)
            .ok_or_else(|| TraceLookupError::TensorNotFound(id.to_owned()))
    }
    /// Finds a tensor in an attention-head response by stable ID.
    /// # Errors
    /// Returns a typed empty or missing-ID error.
    pub fn head_tensor(&self, id: &str) -> Result<&'a TensorSnapshot, TraceLookupError> {
        let head = self.head.ok_or(TraceLookupError::Empty("attention head"))?;
        [
            &head.query,
            &head.key,
            &head.value,
            &head.raw_scores,
            &head.scaled_scores,
            &head.probabilities,
            &head.output,
        ]
        .into_iter()
        .find(|tensor| tensor.id == id)
        .ok_or_else(|| TraceLookupError::TensorNotFound(id.to_owned()))
    }
    /// Finds a tensor in a token response by stable ID.
    /// # Errors
    /// Returns a typed empty or missing-ID error.
    pub fn token_tensor(&self, id: &str) -> Result<&'a TensorSnapshot, TraceLookupError> {
        let token = self.token.ok_or(TraceLookupError::Empty("token"))?;
        [
            &token.input,
            &token.attention,
            &token.mlp,
            &token.logits.logits,
        ]
        .into_iter()
        .find(|tensor| tensor.id == id)
        .ok_or_else(|| TraceLookupError::TensorNotFound(id.to_owned()))
    }
}
impl Default for TraceLookup<'_> {
    fn default() -> Self {
        Self::new()
    }
}
/// Interprets a tensor as `[B,T,C]`.
/// # Errors
/// Returns [`TraceLookupError::InvalidShape`] unless rank is three.
pub fn btc_shape(tensor: &TensorSnapshot) -> Result<[usize; 3], TraceLookupError> {
    match tensor.shape.as_slice() {
        [batches, tokens, features] => Ok([*batches, *tokens, *features]),
        _ => Err(invalid_shape(tensor, 3)),
    }
}
/// Interprets a tensor as `[B,H,T,D]`.
/// # Errors
/// Returns [`TraceLookupError::InvalidShape`] unless rank is four.
pub fn bhtd_shape(tensor: &TensorSnapshot) -> Result<[usize; 4], TraceLookupError> {
    match tensor.shape.as_slice() {
        [batches, heads, tokens, features] => Ok([*batches, *heads, *tokens, *features]),
        _ => Err(invalid_shape(tensor, 4)),
    }
}
/// Returns one feature row selected from a `[B,T,C]` tensor.
/// # Errors
/// Returns a typed shape or selector error.
pub fn selected_token_row(
    tensor: &TensorSnapshot,
    batch: usize,
    token: usize,
) -> Result<&[FiniteF32], TraceLookupError> {
    let [batches, tokens, features] = btc_shape(tensor)?;
    if batch >= batches || token >= tokens {
        return Err(out_of_bounds(tensor));
    }
    let row = batch
        .checked_mul(tokens)
        .and_then(|value| value.checked_add(token))
        .and_then(|value| value.checked_mul(features))
        .ok_or_else(|| out_of_bounds(tensor))?;
    tensor
        .values
        .get(row..row.saturating_add(features))
        .ok_or_else(|| out_of_bounds(tensor))
}
/// Returns one head/token feature slice from a `[B,H,T,D]` tensor.
/// # Errors
/// Returns a typed shape or selector error.
pub fn selected_head_token_slice(
    tensor: &TensorSnapshot,
    batch: usize,
    head: usize,
    token: usize,
) -> Result<&[FiniteF32], TraceLookupError> {
    let [batches, heads, tokens, features] = bhtd_shape(tensor)?;
    if batch >= batches || head >= heads || token >= tokens {
        return Err(out_of_bounds(tensor));
    }
    let row = batch
        .checked_mul(heads)
        .and_then(|value| value.checked_add(head))
        .and_then(|value| value.checked_mul(tokens))
        .and_then(|value| value.checked_add(token))
        .and_then(|value| value.checked_mul(features))
        .ok_or_else(|| out_of_bounds(tensor))?;
    tensor
        .values
        .get(row..row.saturating_add(features))
        .ok_or_else(|| out_of_bounds(tensor))
}
/// Clamps a feature selector, returning `None` for an empty feature axis.
#[must_use]
pub fn clamp_feature_index(index: usize, feature_count: usize) -> Option<usize> {
    feature_count.checked_sub(1).map(|last| index.min(last))
}
fn invalid_shape(tensor: &TensorSnapshot, expected_rank: usize) -> TraceLookupError {
    TraceLookupError::InvalidShape(tensor.id.clone(), expected_rank, tensor.shape.clone())
}
fn out_of_bounds(tensor: &TensorSnapshot) -> TraceLookupError {
    TraceLookupError::SelectionOutOfBounds(tensor.id.clone(), tensor.shape.clone())
}
