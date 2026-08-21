//! Explicit nanoGPT-compatible transformer inference.

/// Internal explicit causal-attention operations.
#[doc(hidden)]
pub mod attention;
mod head;
/// Internal pre-normalized Transformer layers.
#[doc(hidden)]
pub mod layers;
mod load;
mod model;
/// Internal forward-request validation.
#[doc(hidden)]
pub mod request;
/// Internal trace selection and dispatch.
#[doc(hidden)]
pub mod trace;

use candle_core::Tensor;
use nanogpt_schema::{OperationId, SchemaError, TokenId, TraceMode};
use thiserror::Error;

pub use attention::CausalSelfAttention;
pub use head::TiedLmHead;
pub use layers::{Block, Mlp};
pub use model::Gpt;

/// Errors produced while loading or evaluating a model.
#[derive(Debug, Error)]
#[non_exhaustive]
pub enum ModelError {
    /// Shared architecture dimensions are invalid.
    #[error("invalid model configuration: {0}")]
    Config(#[from] SchemaError),
    /// A model asset did not match the expected format.
    #[error("invalid model asset: {0}")]
    InvalidAsset(String),
    /// The asset stored a second copy of the tied language-model head.
    #[error("model asset must tie logits to transformer.wte.weight without lm_head.weight")]
    DuplicateLanguageModelHead,
    /// Inference is restricted to Candle's CPU backend.
    #[error("model inference requires the Candle CPU device")]
    UnsupportedDevice,
    /// At least one conditioning token is required.
    #[error("model input must contain at least one token")]
    EmptySequence,
    /// The conditioning sequence exceeds the configured context.
    #[error("sequence length {length} exceeds block size {block_size}")]
    SequenceTooLong {
        /// Submitted token count.
        length: usize,
        /// Configured maximum token count.
        block_size: usize,
    },
    /// A token is outside the configured vocabulary.
    #[error("token ID {0} is outside the configured vocabulary")]
    TokenOutOfRange(u32),
    /// A layer, head, or token trace selector is outside the current request.
    #[error("trace selector is outside the model configuration or sequence")]
    InvalidTraceSelector,
    /// A tensor dimension cannot be represented by Candle's u32 index dtype.
    #[error("model dimension exceeds supported u32 indexing")]
    DimensionOverflow,
    /// Hidden states do not match the shared token embedding width.
    #[error("tied head hidden width {hidden} does not match token embedding width {embedding}")]
    TiedHeadDimension {
        /// Hidden-state width.
        hidden: usize,
        /// Token-embedding width.
        embedding: usize,
    },
    /// Candle could not evaluate a model operation.
    #[error("model tensor operation failed: {0}")]
    Candle(#[from] candle_core::Error),
}

/// One ranked language-model candidate.
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct TopKCandidate {
    /// Vocabulary token ID.
    pub token_id: TokenId,
    /// Raw model logit.
    pub logit: f32,
    /// Full-vocabulary softmax probability.
    pub probability: f32,
}

/// Typed input for one deterministic forward pass.
#[derive(Debug, Clone, Copy)]
pub struct ForwardRequest<'a> {
    /// Prompt token IDs.
    pub token_ids: &'a [TokenId],
    /// Number of ranked candidates to return.
    pub top_k: usize,
    /// Requested trace selector.
    pub trace_mode: TraceMode,
}

/// A tensor made available at an explicit nanoGPT operation boundary.
#[derive(Debug)]
pub struct TraceTensor<'a> {
    /// Stable operation identifier.
    pub operation: OperationId,
    /// Transformer layer when the operation is layer-local.
    pub layer: Option<usize>,
    /// Stable tensor role within the operation.
    pub name: &'static str,
    /// Operation tensor.
    pub tensor: &'a Tensor,
}

/// A diagonal-inclusive causal mask made available to trace serialization.
#[derive(Debug, Clone, Copy)]
pub struct CausalMask<'a> {
    /// Transformer layer.
    pub layer: usize,
    /// Query row count.
    pub rows: usize,
    /// Key column count.
    pub columns: usize,
    /// Row-major cells; `true` means attention is allowed.
    pub allowed: &'a [bool],
}

/// Receives model tensors without coupling the core to trace serialization.
pub trait TraceSink {
    /// Records one explicit operation tensor.
    fn tensor(&mut self, trace: TraceTensor<'_>);

    /// Records the diagonal-inclusive causal mask for one layer.
    fn causal_mask(&mut self, mask: CausalMask<'_>);
}

/// Discards trace events.
#[derive(Debug, Default)]
pub struct NoTrace;

impl TraceSink for NoTrace {
    fn tensor(&mut self, _trace: TraceTensor<'_>) {}

    fn causal_mask(&mut self, _mask: CausalMask<'_>) {}
}

/// Result of one deterministic forward pass.
#[derive(Debug)]
pub struct ForwardOutput {
    /// Logits for every prompt position, shaped `[1, T, vocab]`.
    pub logits: Tensor,
    /// Full-vocabulary probabilities for the final position.
    pub probabilities: Tensor,
    /// Descending final-position candidates.
    pub top_k: Vec<TopKCandidate>,
}
