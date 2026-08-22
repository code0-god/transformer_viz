//! Exhaustive shared operation/curriculum focus mappings.

use super::{ArchitectureLevel, ArchitectureOperation, SummaryEvidence};
use crate::app::narrative::NarrativeStage;

impl ArchitectureOperation {
    #[cfg(test)]
    pub(crate) const ALL: [Self; 25] = [
        Self::Embedding,
        Self::FinalLayerNorm,
        Self::LanguageModelHead,
        Self::AttentionLayerNorm,
        Self::AttentionResidual,
        Self::MlpLayerNorm,
        Self::Mlp,
        Self::MlpResidual,
        Self::Query,
        Self::Key,
        Self::Value,
        Self::QueryKeyProduct,
        Self::Scale,
        Self::Mask,
        Self::Softmax,
        Self::ValueProduct,
        Self::MergeHeads,
        Self::Projection,
        Self::Logits,
        Self::Temperature,
        Self::TopK,
        Self::GenerationSoftmax,
        Self::Sample,
        Self::Append,
        Self::Repeat,
    ];

    /// Nearest exact curriculum concept for every architecture operation.
    #[must_use]
    pub(crate) const fn concept(self) -> NarrativeStage {
        use NarrativeStage as S;
        match self {
            Self::Embedding => S::TokenEmbedding,
            Self::FinalLayerNorm => S::FinalLayerNorm,
            Self::LanguageModelHead => S::LanguageModelHead,
            Self::Logits => S::Logits,
            Self::AttentionLayerNorm => S::LayerNorm,
            Self::MlpLayerNorm | Self::Mlp => S::Mlp,
            Self::Query | Self::Key | Self::Value => S::QueryKeyValue,
            Self::QueryKeyProduct | Self::Scale => S::AttentionScore,
            Self::Mask => S::CausalMask,
            Self::Softmax => S::Softmax,
            Self::ValueProduct | Self::MergeHeads | Self::Projection => S::ValueAggregation,
            Self::AttentionResidual => S::Residual,
            Self::MlpResidual => S::BlockOutput,
            Self::Temperature => S::Temperature,
            Self::TopK => S::TopK,
            Self::GenerationSoftmax => S::Sampling,
            Self::Sample => S::GeneratedToken,
            Self::Append => S::AppendToContext,
            Self::Repeat => S::Repeat,
        }
    }

    /// Canonical architecture level and representative operation for Guided focus.
    #[must_use]
    pub(crate) const fn for_concept(concept: NarrativeStage) -> (ArchitectureLevel, Self) {
        use NarrativeStage as S;
        match concept {
            S::Tokenization | S::TokenEmbedding | S::PositionEmbedding => {
                (ArchitectureLevel::Gpt, Self::Embedding)
            }
            S::LayerNorm => (ArchitectureLevel::Block, Self::AttentionLayerNorm),
            S::QueryKeyValue => (ArchitectureLevel::Attention, Self::Query),
            S::AttentionScore => (ArchitectureLevel::Attention, Self::QueryKeyProduct),
            S::CausalMask => (ArchitectureLevel::Attention, Self::Mask),
            S::Softmax => (ArchitectureLevel::Attention, Self::Softmax),
            S::ValueAggregation => (ArchitectureLevel::Attention, Self::ValueProduct),
            S::Residual => (ArchitectureLevel::Block, Self::AttentionResidual),
            S::Mlp => (ArchitectureLevel::Block, Self::Mlp),
            S::BlockOutput => (ArchitectureLevel::Block, Self::MlpResidual),
            S::FinalLayerNorm => (ArchitectureLevel::Gpt, Self::FinalLayerNorm),
            S::LanguageModelHead => (ArchitectureLevel::Gpt, Self::LanguageModelHead),
            S::Logits => (ArchitectureLevel::Generation, Self::Logits),
            S::Temperature => (ArchitectureLevel::Generation, Self::Temperature),
            S::TopK => (ArchitectureLevel::Generation, Self::TopK),
            S::Sampling => (ArchitectureLevel::Generation, Self::GenerationSoftmax),
            S::GeneratedToken => (ArchitectureLevel::Generation, Self::Sample),
            S::AppendToContext => (ArchitectureLevel::Generation, Self::Append),
            S::Repeat => (ArchitectureLevel::Generation, Self::Repeat),
        }
    }

    /// Legacy detail evidence target, kept isolated from curriculum identity.
    #[must_use]
    pub(crate) const fn target(self) -> (NarrativeStage, Option<usize>) {
        let concept = self.concept();
        let detail = match self {
            Self::AttentionLayerNorm => Some(1),
            Self::AttentionResidual => Some(11),
            Self::MlpLayerNorm => Some(12),
            Self::Mlp => Some(13),
            Self::MlpResidual => Some(17),
            Self::Query => Some(2),
            Self::Key => Some(3),
            Self::Value => Some(4),
            Self::QueryKeyProduct => Some(5),
            Self::Scale => Some(6),
            Self::Softmax => Some(7),
            Self::ValueProduct => Some(8),
            Self::MergeHeads => Some(9),
            Self::Projection => Some(10),
            Self::Embedding
            | Self::FinalLayerNorm
            | Self::LanguageModelHead
            | Self::Mask
            | Self::Logits
            | Self::Temperature
            | Self::TopK
            | Self::GenerationSoftmax
            | Self::Sample
            | Self::Append
            | Self::Repeat => None,
        };
        (concept, detail)
    }

    /// Exact summary tensor identity, when the operation reads summary evidence.
    #[must_use]
    pub(crate) const fn summary_evidence(self) -> Option<SummaryEvidence> {
        match self {
            Self::FinalLayerNorm => Some(SummaryEvidence::FinalLayerNorm),
            Self::LanguageModelHead | Self::Logits => Some(SummaryEvidence::Logits),
            Self::Embedding
            | Self::AttentionLayerNorm
            | Self::AttentionResidual
            | Self::MlpLayerNorm
            | Self::Mlp
            | Self::MlpResidual
            | Self::Query
            | Self::Key
            | Self::Value
            | Self::QueryKeyProduct
            | Self::Scale
            | Self::Mask
            | Self::Softmax
            | Self::ValueProduct
            | Self::MergeHeads
            | Self::Projection
            | Self::Temperature
            | Self::TopK
            | Self::GenerationSoftmax
            | Self::Sample
            | Self::Append
            | Self::Repeat => None,
        }
    }
}
