use crate::{AttentionMask, ModelMetadata, SchemaVersion, TensorData, TensorSummary, Token};
use serde::{Deserialize, Serialize};

/// Amount and selector of trace detail requested by the UI.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "snake_case", deny_unknown_fields)]
pub enum TraceMode {
    /// Whole-pass summaries.
    Summary,
    /// One Transformer block.
    Block {
        /// Zero-based block index.
        layer: usize,
    },
    /// One attention head.
    Attention {
        /// Zero-based block index.
        layer: usize,
        /// Zero-based head index.
        head: usize,
    },
    /// One sequence position.
    Token {
        /// Zero-based token position.
        position: usize,
    },
    /// Every educational tensor.
    Full,
}

/// Named nanoGPT forward-pass operation.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum Operation {
    /// Token plus position embedding.
    Embedding,
    /// Pre-attention normalization.
    AttentionLayerNorm,
    /// Combined QKV projection.
    QueryKeyValue,
    /// Scaled causal attention.
    Attention,
    /// Attention residual.
    AttentionResidual,
    /// Pre-MLP normalization.
    MlpLayerNorm,
    /// MLP expansion/GELU/projection.
    Mlp,
    /// MLP residual.
    MlpResidual,
    /// Final normalization.
    FinalLayerNorm,
    /// Tied language-model head.
    Logits,
}

/// Source code location corresponding to an operation.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct SourceLocation {
    /// Repository-relative file.
    pub file: String,
    /// First one-based line.
    pub line_start: usize,
    /// Last one-based line.
    pub line_end: usize,
    /// Function or expression label.
    pub symbol: String,
}

/// Source-linked operation summary.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct OperationTrace {
    /// Forward operation.
    pub operation: Operation,
    /// Canonical source.
    pub source: SourceLocation,
    /// Output statistics.
    pub output: TensorSummary,
}

/// Detailed trace for one token position.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct TokenTrace {
    /// Sequence position.
    pub position: usize,
    /// Token at this position.
    pub token: Token,
    /// Token plus position embedding.
    pub embedding: TensorData,
    /// Optional vocabulary logits.
    pub logits: Option<TensorData>,
}

/// Detailed values for one causal attention head.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct AttentionTrace {
    /// Block index.
    pub layer: usize,
    /// Head index.
    pub head: usize,
    /// Query vectors.
    pub query: TensorData,
    /// Key vectors.
    pub key: TensorData,
    /// Value vectors.
    pub value: TensorData,
    /// Pre-scale scores.
    pub raw_scores: TensorData,
    /// Scaled scores.
    pub scaled_scores: TensorData,
    /// Explicit causal mask.
    pub mask: AttentionMask,
    /// Softmax probabilities.
    pub probabilities: TensorData,
    /// Attention times values.
    pub weighted_values: TensorData,
}

/// One Transformer block's educational outputs.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct BlockTrace {
    /// Block index.
    pub layer: usize,
    /// Selected head detail.
    pub attention: Option<AttentionTrace>,
    /// Attention residual.
    pub attention_residual: TensorSummary,
    /// MLP before residual.
    pub mlp: TensorSummary,
    /// Block output.
    pub output: TensorSummary,
}

/// Versioned forward-pass trace returned by the Worker.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Trace {
    /// Contract version.
    pub schema_version: SchemaVersion,
    /// Model provenance.
    pub model: ModelMetadata,
    /// Input tokens.
    pub tokens: Vec<Token>,
    /// Source-linked operation summaries.
    pub operations: Vec<OperationTrace>,
    /// Requested token details.
    pub token_traces: Vec<TokenTrace>,
    /// Block traces.
    pub blocks: Vec<BlockTrace>,
    /// Final logits summary.
    pub logits: TensorSummary,
}
