//! Stable architecture node identities and interaction capabilities.

/// Stable identity for every architecture node in the current hierarchy.
#[derive(Clone, Copy, Debug, Eq, Hash, PartialEq)]
pub enum ArchitectureNodeId {
    /// GPT root breadcrumb.
    Root,
    /// Current token sequence.
    InputContext,
    /// Token embedding lookup.
    TokenEmbedding,
    /// Position embedding lookup.
    PositionEmbedding,
    /// Embedding branch addition.
    EmbeddingAdd,
    /// Initial hidden state.
    HiddenState,
    /// Repeated decoder block.
    TransformerBlock,
    /// First block normalization.
    LayerNorm1,
    /// Causal multi-head self-attention.
    SelfAttention,
    /// First residual addition.
    Residual1,
    /// Second block normalization.
    LayerNorm2,
    /// Feed-forward network.
    Mlp,
    /// Second residual addition.
    Residual2,
    /// Final hidden-state normalization.
    FinalLayerNorm,
    /// Vocabulary projection.
    LmHead,
    /// Per-token scores.
    Logits,
    /// Sampling stage.
    TokenSelection,
    /// Sampled token.
    GeneratedToken,
    /// Context append operation.
    AppendContext,
    /// Combined C to 3C projection.
    AttentionQkvProjection,
    /// Query projection output.
    AttentionQuery,
    /// Key projection output.
    AttentionKey,
    /// Value projection output.
    AttentionValue,
    /// Query-key score product.
    AttentionScores,
    /// Inverse square-root scaling.
    AttentionScale,
    /// Future-position mask.
    AttentionCausalMask,
    /// Score normalization.
    AttentionSoftmax,
    /// Probability-value product.
    AttentionValueAggregation,
    /// Head concatenation.
    AttentionMergeHeads,
    /// Final C to C projection.
    AttentionOutputProjection,
}

impl ArchitectureNodeId {
    /// Complete stable node catalog.
    #[cfg(test)]
    pub(crate) const ALL: [Self; 30] = [
        Self::Root,
        Self::InputContext,
        Self::TokenEmbedding,
        Self::PositionEmbedding,
        Self::EmbeddingAdd,
        Self::HiddenState,
        Self::TransformerBlock,
        Self::LayerNorm1,
        Self::SelfAttention,
        Self::Residual1,
        Self::LayerNorm2,
        Self::Mlp,
        Self::Residual2,
        Self::FinalLayerNorm,
        Self::LmHead,
        Self::Logits,
        Self::TokenSelection,
        Self::GeneratedToken,
        Self::AppendContext,
        Self::AttentionQkvProjection,
        Self::AttentionQuery,
        Self::AttentionKey,
        Self::AttentionValue,
        Self::AttentionScores,
        Self::AttentionScale,
        Self::AttentionCausalMask,
        Self::AttentionSoftmax,
        Self::AttentionValueAggregation,
        Self::AttentionMergeHeads,
        Self::AttentionOutputProjection,
    ];

    /// Stable machine-readable value used by browser contracts.
    #[must_use]
    pub const fn as_str(self) -> &'static str {
        match self {
            Self::Root => "root",
            Self::InputContext => "input-context",
            Self::TokenEmbedding => "token-embedding",
            Self::PositionEmbedding => "position-embedding",
            Self::EmbeddingAdd => "embedding-add",
            Self::HiddenState => "hidden-state",
            Self::TransformerBlock => "transformer-block",
            Self::LayerNorm1 => "layer-norm-1",
            Self::SelfAttention => "self-attention",
            Self::Residual1 => "residual-1",
            Self::LayerNorm2 => "layer-norm-2",
            Self::Mlp => "mlp",
            Self::Residual2 => "residual-2",
            Self::FinalLayerNorm => "final-layer-norm",
            Self::LmHead => "lm-head",
            Self::Logits => "logits",
            Self::TokenSelection => "token-selection",
            Self::GeneratedToken => "generated-token",
            Self::AppendContext => "append-context",
            Self::AttentionQkvProjection => "attention-qkv-projection",
            Self::AttentionQuery => "attention-query",
            Self::AttentionKey => "attention-key",
            Self::AttentionValue => "attention-value",
            Self::AttentionScores => "attention-scores",
            Self::AttentionScale => "attention-scale",
            Self::AttentionCausalMask => "attention-causal-mask",
            Self::AttentionSoftmax => "attention-softmax",
            Self::AttentionValueAggregation => "attention-value-aggregation",
            Self::AttentionMergeHeads => "attention-merge-heads",
            Self::AttentionOutputProjection => "attention-output-projection",
        }
    }

    /// Interaction supported by this node in the current release.
    #[must_use]
    pub const fn capability(self) -> ArchitectureNodeCapability {
        match self {
            Self::TransformerBlock | Self::SelfAttention => ArchitectureNodeCapability::DrillDown,
            Self::Root | Self::EmbeddingAdd | Self::HiddenState => {
                ArchitectureNodeCapability::Static
            }
            Self::InputContext
            | Self::TokenEmbedding
            | Self::PositionEmbedding
            | Self::LayerNorm1
            | Self::Residual1
            | Self::LayerNorm2
            | Self::Mlp
            | Self::Residual2
            | Self::FinalLayerNorm
            | Self::LmHead
            | Self::Logits
            | Self::TokenSelection
            | Self::GeneratedToken
            | Self::AppendContext
            | Self::AttentionQkvProjection
            | Self::AttentionQuery
            | Self::AttentionKey
            | Self::AttentionValue
            | Self::AttentionScores
            | Self::AttentionScale
            | Self::AttentionCausalMask
            | Self::AttentionSoftmax
            | Self::AttentionValueAggregation
            | Self::AttentionMergeHeads
            | Self::AttentionOutputProjection => ArchitectureNodeCapability::Selectable,
        }
    }

    /// Whether activating the node enters a deeper architecture view.
    #[must_use]
    pub const fn can_open(self) -> bool {
        matches!(self.capability(), ArchitectureNodeCapability::DrillDown)
    }
}

/// User action available on an architecture node.
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum ArchitectureNodeCapability {
    /// Structural node without direct action.
    Static,
    /// Selectable node without child architecture.
    Selectable,
    /// Node with an implemented child architecture.
    DrillDown,
}

impl ArchitectureNodeCapability {
    /// Stable machine-readable value used by browser contracts.
    #[must_use]
    pub const fn as_str(self) -> &'static str {
        match self {
            Self::Static => "static",
            Self::Selectable => "selectable",
            Self::DrillDown => "drill-down",
        }
    }

    /// Whether the node needs button semantics.
    #[must_use]
    pub const fn is_interactive(self) -> bool {
        !matches!(self, Self::Static)
    }
}
