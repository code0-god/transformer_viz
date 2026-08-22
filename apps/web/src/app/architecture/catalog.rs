//! Stable architecture levels, operations, and config-driven node catalog.

use nanogpt_schema::GptConfig;

use super::super::narrative::NarrativeStage;

/// Stable hierarchy levels exposed by the architecture map.
#[derive(Debug, Clone, Copy, Default, PartialEq, Eq)]
pub(crate) enum ArchitectureLevel {
    /// Full GPT forward path.
    #[default]
    Gpt,
    /// One selected Transformer block.
    Block,
    /// One selected block's multi-head attention.
    Attention,
    /// Autoregressive generation loop.
    Generation,
}

impl ArchitectureLevel {
    /// Exact public hierarchy catalog.
    #[cfg(test)]
    pub(crate) const ALL: [Self; 4] = [Self::Gpt, Self::Block, Self::Attention, Self::Generation];

    /// Stable machine-readable level key.
    #[must_use]
    pub(crate) const fn slug(self) -> &'static str {
        match self {
            Self::Gpt => "gpt",
            Self::Block => "block",
            Self::Attention => "attention",
            Self::Generation => "generation",
        }
    }
}

/// Selectable computation boundaries in the architecture map.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub(crate) enum ArchitectureOperation {
    Embedding,
    FinalLayerNorm,
    LanguageModelHead,
    AttentionLayerNorm,
    AttentionResidual,
    MlpLayerNorm,
    Mlp,
    MlpResidual,
    Query,
    Key,
    Value,
    QueryKeyProduct,
    Scale,
    Mask,
    Softmax,
    ValueProduct,
    MergeHeads,
    Projection,
    Logits,
    Temperature,
    TopK,
    GenerationSoftmax,
    Sample,
    Append,
    Repeat,
}

/// Summary tensor identity selected by an architecture operation.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub(crate) enum SummaryEvidence {
    /// Final normalized residual stream.
    FinalLayerNorm,
    /// Vocabulary logits from the tied language-model head.
    Logits,
}

impl ArchitectureOperation {
    /// Existing narrative/detail evidence, when this boundary has an honest mapping.
    #[must_use]
    pub(crate) const fn target(self) -> Option<(NarrativeStage, Option<usize>)> {
        use NarrativeStage as S;
        match self {
            Self::Embedding => Some((S::Embedding, None)),
            Self::FinalLayerNorm | Self::LanguageModelHead | Self::Logits => {
                Some((S::LanguageModelHead, None))
            }
            Self::AttentionLayerNorm => Some((S::AttentionLayerNorm, Some(1))),
            Self::AttentionResidual => Some((S::ValueAggregation, Some(11))),
            Self::MlpLayerNorm => Some((S::MlpAndResidual, Some(12))),
            Self::Mlp => Some((S::MlpAndResidual, Some(13))),
            Self::MlpResidual => Some((S::MlpAndResidual, Some(17))),
            Self::Query => Some((S::QueryKeyValue, Some(2))),
            Self::Key => Some((S::QueryKeyValue, Some(3))),
            Self::Value => Some((S::QueryKeyValue, Some(4))),
            Self::QueryKeyProduct => Some((S::AttentionScores, Some(5))),
            Self::Scale => Some((S::AttentionScores, Some(6))),
            Self::Mask => Some((S::CausalMask, None)),
            Self::Softmax => Some((S::Softmax, Some(7))),
            Self::ValueProduct => Some((S::ValueAggregation, Some(8))),
            Self::MergeHeads => Some((S::ValueAggregation, Some(9))),
            Self::Projection => Some((S::ValueAggregation, Some(10))),
            Self::Temperature
            | Self::TopK
            | Self::GenerationSoftmax
            | Self::Sample
            | Self::Append
            | Self::Repeat => None,
        }
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

/// One selectable node kind; labels remain presentation-only.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub(crate) enum ArchitectureNodeKind {
    Operation(ArchitectureOperation),
    Layer(usize),
    Head(usize),
    Level(ArchitectureLevel),
}

/// Catalog entry used by the Leptos component.
#[cfg(any(test, target_arch = "wasm32"))]
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub(crate) struct ArchitectureNode {
    pub(crate) kind: ArchitectureNodeKind,
}

/// Builds the exact level catalog from model configuration.
#[cfg(any(test, target_arch = "wasm32"))]
#[must_use]
pub(crate) fn catalog(config: &GptConfig, level: ArchitectureLevel) -> Vec<ArchitectureNode> {
    use ArchitectureLevel as L;
    use ArchitectureNodeKind::{Head, Layer, Level, Operation};
    use ArchitectureOperation as O;
    let kinds = match level {
        L::Gpt => std::iter::once(Operation(O::Embedding))
            .chain((0..config.n_layer).map(Layer))
            .chain([
                Operation(O::FinalLayerNorm),
                Operation(O::LanguageModelHead),
                Level(L::Generation),
            ])
            .collect(),
        L::Block => vec![
            Operation(O::AttentionLayerNorm),
            Level(L::Attention),
            Operation(O::AttentionResidual),
            Operation(O::MlpLayerNorm),
            Operation(O::Mlp),
            Operation(O::MlpResidual),
        ],
        L::Attention => (0..config.n_head)
            .map(Head)
            .chain(
                [
                    O::Query,
                    O::Key,
                    O::Value,
                    O::QueryKeyProduct,
                    O::Scale,
                    O::Mask,
                    O::Softmax,
                    O::ValueProduct,
                    O::MergeHeads,
                    O::Projection,
                ]
                .into_iter()
                .map(Operation),
            )
            .collect(),
        L::Generation => [
            O::Logits,
            O::Temperature,
            O::TopK,
            O::GenerationSoftmax,
            O::Sample,
            O::Append,
            O::Repeat,
        ]
        .into_iter()
        .map(Operation)
        .collect(),
    };
    kinds
        .into_iter()
        .map(|kind| ArchitectureNode { kind })
        .collect()
}
