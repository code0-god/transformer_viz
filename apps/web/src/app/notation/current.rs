//! Config and optional trace dimensions for actual-shape panels.

use crate::app::{
    architecture_overview::{ArchitectureNodeId, AttentionArchitectureMetadata},
    state::AppState,
};

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub(crate) struct CurrentAttentionShapes {
    model_width: usize,
    head_count: usize,
    head_dimension: usize,
    sequence_length: Option<usize>,
}

impl CurrentAttentionShapes {
    #[must_use]
    pub(crate) const fn from_config(
        model_width: usize,
        head_count: usize,
        sequence_length: Option<usize>,
    ) -> Option<Self> {
        let Some(metadata) = AttentionArchitectureMetadata::from_config(model_width, head_count)
        else {
            return None;
        };
        Some(Self {
            model_width,
            head_count,
            head_dimension: metadata.head_dimension(),
            sequence_length,
        })
    }

    #[must_use]
    pub(crate) const fn sequence_length(self) -> Option<usize> {
        self.sequence_length
    }

    #[must_use]
    pub(crate) const fn model_width(self) -> usize {
        self.model_width
    }

    #[must_use]
    pub(crate) const fn head_count(self) -> usize {
        self.head_count
    }

    #[must_use]
    pub(crate) const fn head_dimension(self) -> usize {
        self.head_dimension
    }

    #[must_use]
    pub(crate) fn scale_factor(self) -> Option<f64> {
        u32::try_from(self.head_dimension)
            .ok()
            .map(|dimension| 1.0 / f64::from(dimension).sqrt())
    }

    #[must_use]
    pub(crate) fn head_tensor(self) -> Option<String> {
        self.sequence_length
            .map(|t| format!("[{}, {t}, {}]", self.head_count, self.head_dimension))
    }

    #[must_use]
    pub(crate) fn full_head_tensor(self) -> Option<String> {
        self.sequence_length
            .map(|t| format!("[1, {}, {t}, {}]", self.head_count, self.head_dimension))
    }

    #[must_use]
    pub(crate) fn score_matmul(self) -> Option<String> {
        self.sequence_length.map(|t| {
            format!(
                "[{t}, {}] @ [{}, {t}] → [{t}, {t}]",
                self.head_dimension, self.head_dimension
            )
        })
    }

    #[must_use]
    pub(crate) fn value_matmul(self) -> Option<String> {
        self.sequence_length.map(|t| {
            format!(
                "[{t}, {t}] @ [{t}, {}] → [{t}, {}]",
                self.head_dimension, self.head_dimension
            )
        })
    }

    #[must_use]
    pub(crate) fn current_shape(self, id: ArchitectureNodeId) -> Option<String> {
        let t = self.sequence_length?;
        match id {
            ArchitectureNodeId::AttentionQkvProjection => Some(format!(
                "[{t}, {}] → [{t}, {}]",
                self.model_width,
                self.model_width * 3
            )),
            ArchitectureNodeId::AttentionQuery
            | ArchitectureNodeId::AttentionKey
            | ArchitectureNodeId::AttentionValue => Some(format!("[{t}, {}]", self.model_width)),
            ArchitectureNodeId::AttentionScores => self.score_matmul(),
            ArchitectureNodeId::AttentionScale
            | ArchitectureNodeId::AttentionCausalMask
            | ArchitectureNodeId::AttentionSoftmax => Some(format!("[{t}, {t}] → [{t}, {t}]")),
            ArchitectureNodeId::AttentionValueAggregation => self.value_matmul(),
            ArchitectureNodeId::AttentionMergeHeads => Some(format!(
                "[{}, {t}, {}] → [{t}, {}]",
                self.head_count, self.head_dimension, self.model_width
            )),
            ArchitectureNodeId::AttentionOutputProjection | ArchitectureNodeId::SelfAttention => {
                Some(format!(
                    "[{t}, {}] → [{t}, {}]",
                    self.model_width, self.model_width
                ))
            }
            _ => None,
        }
    }
}

/// Returns actual trace sequence length without issuing a Worker request.
#[must_use]
pub(crate) fn current_sequence_length(state: &AppState) -> Option<usize> {
    state
        .generation
        .selected_step
        .and_then(|index| state.generation.steps.get(index))
        .map(|step| step.context_token_ids.len())
        .or_else(|| state.summary.as_ref().map(|summary| summary.tokens.len()))
}
