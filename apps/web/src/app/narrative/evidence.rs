//! Exhaustive dominant evidence-view identity for each curriculum concept.

use super::NarrativeStage;

/// Authoritative candidate quantity allowed by a prediction concept.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum PredictionCandidateMetric {
    /// Raw model output before temperature, filtering, or softmax.
    RawLogit,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
/// Stable dominant real-evidence presentation identity.
pub enum EvidenceView {
    /// Evidence dedicated to the `Tokenization` boundary.
    Tokenization,
    /// Evidence dedicated to the `TokenEmbedding` boundary.
    TokenEmbedding,
    /// Evidence dedicated to the `PositionEmbedding` boundary.
    PositionEmbedding,
    /// Evidence dedicated to the `LayerNorm` boundary.
    LayerNorm,
    /// Evidence dedicated to the `QueryKeyValue` boundary.
    QueryKeyValue,
    /// Evidence dedicated to the `AttentionScore` boundary.
    AttentionScore,
    /// Evidence dedicated to the `CausalMask` boundary.
    CausalMask,
    /// Evidence dedicated to the `Softmax` boundary.
    Softmax,
    /// Evidence dedicated to the `ValueAggregation` boundary.
    ValueAggregation,
    /// Evidence dedicated to the `AttentionResidual` boundary.
    AttentionResidual,
    /// Evidence dedicated to the `MlpTransform` boundary.
    MlpTransform,
    /// Evidence dedicated to the `BlockOutput` boundary.
    BlockOutput,
    /// Evidence dedicated to the `FinalLayerNorm` boundary.
    FinalLayerNorm,
    /// Evidence dedicated to the `LanguageModelHead` boundary.
    LanguageModelHead,
    /// Evidence dedicated to the `Logits` boundary.
    Logits,
    /// Evidence dedicated to the `Sampling` boundary.
    Sampling,
    /// Evidence dedicated to the `GeneratedToken` boundary.
    GeneratedToken,
    /// Evidence dedicated to the `GenerationBoundary` boundary.
    GenerationBoundary,
}

impl NarrativeStage {
    /// Returns the candidate metric, only where the curriculum exposes candidates.
    #[must_use]
    pub const fn prediction_candidate_metric(self) -> Option<PredictionCandidateMetric> {
        match self {
            Self::Logits => Some(PredictionCandidateMetric::RawLogit),
            Self::Tokenization
            | Self::TokenEmbedding
            | Self::PositionEmbedding
            | Self::LayerNorm
            | Self::QueryKeyValue
            | Self::AttentionScore
            | Self::CausalMask
            | Self::Softmax
            | Self::ValueAggregation
            | Self::Residual
            | Self::Mlp
            | Self::BlockOutput
            | Self::FinalLayerNorm
            | Self::LanguageModelHead
            | Self::Temperature
            | Self::TopK
            | Self::Sampling
            | Self::GeneratedToken
            | Self::AppendToContext
            | Self::Repeat => None,
        }
    }

    /// Returns the dominant evidence presentation for this concept.
    #[must_use]
    pub const fn evidence_view(self) -> EvidenceView {
        match self {
            Self::Tokenization => EvidenceView::Tokenization,
            Self::TokenEmbedding => EvidenceView::TokenEmbedding,
            Self::PositionEmbedding => EvidenceView::PositionEmbedding,
            Self::LayerNorm => EvidenceView::LayerNorm,
            Self::QueryKeyValue => EvidenceView::QueryKeyValue,
            Self::AttentionScore => EvidenceView::AttentionScore,
            Self::CausalMask => EvidenceView::CausalMask,
            Self::Softmax => EvidenceView::Softmax,
            Self::ValueAggregation => EvidenceView::ValueAggregation,
            Self::Residual => EvidenceView::AttentionResidual,
            Self::Mlp => EvidenceView::MlpTransform,
            Self::BlockOutput => EvidenceView::BlockOutput,
            Self::FinalLayerNorm => EvidenceView::FinalLayerNorm,
            Self::LanguageModelHead => EvidenceView::LanguageModelHead,
            Self::Logits => EvidenceView::Logits,
            Self::Sampling => EvidenceView::Sampling,
            Self::GeneratedToken => EvidenceView::GeneratedToken,
            Self::Temperature | Self::TopK | Self::AppendToContext | Self::Repeat => {
                EvidenceView::GenerationBoundary
            }
        }
    }
}
