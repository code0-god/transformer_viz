use crate::{
    FiniteF32, MaskSnapshot, SchemaVersion, TensorSnapshot, TensorStats, TokenId, TokenInfo,
};
use serde::{Deserialize, Serialize};
/// Exact amount and selector of trace detail requested from inference.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "snake_case", deny_unknown_fields)]
pub enum TraceMode {
    /// Disable trace capture.
    Off,
    /// Capture whole-run summaries.
    Summary,
    /// Capture one Transformer block.
    Block {
        /// Zero-based block index.
        layer: usize,
    },
    /// Capture one attention head.
    AttentionHead {
        /// Zero-based block index.
        layer: usize,
        /// Zero-based head index.
        head: usize,
    },
    /// Capture one token within an attention head.
    Token {
        /// Zero-based block index.
        layer: usize,
        /// Zero-based head index.
        head: usize,
        /// Zero-based token position.
        token: usize,
    },
}
/// Stable identifier for a nanoGPT forward-pass operation.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum OperationId {
    /// Token and positional embedding addition.
    Embedding,
    /// Pre-attention layer normalization.
    AttentionLayerNorm,
    /// Combined query/key/value projection.
    QueryKeyValue,
    /// Scaled causal self-attention.
    Attention,
    /// Attention projection and residual addition.
    AttentionResidual,
    /// Pre-MLP layer normalization.
    MlpLayerNorm,
    /// MLP expansion, GELU, and projection.
    Mlp,
    /// MLP residual addition.
    MlpResidual,
    /// Final layer normalization.
    FinalLayerNorm,
    /// Tied language-model head.
    Logits,
}
/// Deployed base-relative source location for an educational operation (for example, `reference/model.py`).
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct SourceReference {
    /// Deployed base-relative source file.
    pub file: String,
    /// Function or expression label.
    pub symbol: String,
    /// First one-based line.
    pub start_line: usize,
    /// Last one-based line.
    pub end_line: usize,
}
/// Source-linked operation summary.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct OperationTrace {
    /// Forward-pass operation.
    pub operation: OperationId,
    /// Canonical nanoGPT source location.
    pub source: SourceReference,
    /// Real output tensor at this operation boundary.
    pub tensor: TensorSnapshot,
    /// Output statistics.
    pub output: TensorStats,
}
/// Summary of one Transformer layer.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct LayerSummary {
    /// Zero-based layer index.
    pub layer: usize,
    /// Layer input statistics.
    pub input: TensorStats,
    /// Attention output statistics.
    pub attention: TensorStats,
    /// MLP output statistics.
    pub mlp: TensorStats,
    /// Layer output statistics.
    pub output: TensorStats,
}
/// Detailed values for one causal attention head.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct AttentionHeadTrace {
    /// Zero-based layer index.
    pub layer: usize,
    /// Zero-based head index.
    pub head: usize,
    /// Query vectors.
    pub query: TensorSnapshot,
    /// Key vectors.
    pub key: TensorSnapshot,
    /// Value vectors.
    pub value: TensorSnapshot,
    /// Query-key products before scaling.
    pub raw_scores: TensorSnapshot,
    /// Scores after head-size scaling.
    pub scaled_scores: TensorSnapshot,
    /// Explicit causal mask.
    pub mask: MaskSnapshot,
    /// Post-mask softmax probabilities.
    pub probabilities: TensorSnapshot,
    /// Attention probabilities multiplied by values.
    pub output: TensorSnapshot,
    /// Canonical source location.
    pub source: SourceReference,
}
/// Detailed MLP expansion, activation, and projection values.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct MlpTrace {
    /// Zero-based layer index.
    pub layer: usize,
    /// Normalized MLP input.
    pub input: TensorSnapshot,
    /// Expanded hidden values.
    pub hidden: TensorSnapshot,
    /// Exact GELU activation values.
    pub activated: TensorSnapshot,
    /// Projected MLP output.
    pub output: TensorSnapshot,
    /// Canonical source location.
    pub source: SourceReference,
}
/// One candidate from the model's output distribution.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct LogitCandidate {
    /// Candidate token ID.
    pub token_id: TokenId,
    /// Human-readable token display.
    pub display: String,
    /// Raw logit.
    pub logit: FiniteF32,
    /// Softmax probability.
    pub probability: FiniteF32,
}
/// Final logits and ranked candidate tokens.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct LogitsTrace {
    /// Full or selected vocabulary logits.
    pub logits: TensorSnapshot,
    /// Highest-probability candidates in descending order.
    pub top_k: Vec<LogitCandidate>,
    /// Canonical source location.
    pub source: SourceReference,
}
/// Token, position, and summed embeddings captured at model input.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct EmbeddingTrace {
    /// Token embedding lookup output.
    pub token: TensorSnapshot,
    /// Position embedding lookup output.
    pub position: TensorSnapshot,
    /// Element-wise embedding sum emitted by the model.
    pub sum: TensorSnapshot,
    /// Canonical source location.
    pub source: SourceReference,
}
/// Summary returned after a complete inference run.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct RunSummary {
    /// Contract version.
    pub schema_version: SchemaVersion,
    /// Stable run identifier used by inspection requests.
    pub run_id: u64,
    /// Encoded prompt tokens.
    pub tokens: Vec<TokenInfo>,
    /// Per-layer summaries.
    pub layers: Vec<LayerSummary>,
    /// Measured model inference duration in milliseconds.
    pub duration_ms: FiniteF32,
    /// Input embedding tensors captured by stable ID.
    pub embeddings: EmbeddingTrace,
    /// Final layer-normalization output captured by stable ID.
    pub final_layer_norm: TensorSnapshot,
    /// Final output distribution.
    pub logits: LogitsTrace,
}
/// Detailed trace for one Transformer block.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct BlockTrace {
    /// Contract version.
    pub schema_version: SchemaVersion,
    /// Stable run identifier.
    pub run_id: u64,
    /// Zero-based layer index.
    pub layer: usize,
    /// Source-linked operation summaries.
    pub operations: Vec<OperationTrace>,
    /// Attention output after residual addition.
    pub attention_residual: TensorSnapshot,
    /// Detailed MLP values.
    pub mlp: MlpTrace,
    /// Block output after residual addition.
    pub output: TensorSnapshot,
}
/// Detailed trace for one token selection.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct TokenTrace {
    /// Contract version.
    pub schema_version: SchemaVersion,
    /// Stable run identifier.
    pub run_id: u64,
    /// Zero-based layer index.
    pub layer: usize,
    /// Zero-based head index.
    pub head: usize,
    /// Zero-based token position.
    pub token: usize,
    /// Selected token metadata.
    pub token_info: TokenInfo,
    /// Token representation entering the selected layer.
    pub input: TensorSnapshot,
    /// Selected attention output.
    pub attention: TensorSnapshot,
    /// Selected MLP output.
    pub mlp: TensorSnapshot,
    /// Logits at the selected token position.
    pub logits: LogitsTrace,
}
