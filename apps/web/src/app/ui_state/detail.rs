//! One mode-aware Inspector detail ownership policy.

use super::{ExplorerMode, ExplorerUiState};
use crate::app::narrative::{DETAIL_OPERATION_STAGES, NarrativeStage};

impl ExplorerUiState {
    #[must_use]
    /// Accepts a detail only when the active mode's focus owns it.
    pub fn select_detail_operation(&mut self, index: usize) -> bool {
        if self.detail_visible(index) {
            self.detail_operation = Some(index);
            true
        } else {
            false
        }
    }

    /// The ownership predicate used by detail rendering and tensor resolution.
    #[must_use]
    pub(crate) fn detail_visible(&self, index: usize) -> bool {
        match self.mode {
            ExplorerMode::Guided => {
                DETAIL_OPERATION_STAGES.get(index) == Some(&self.narrative.stage)
            }
            #[cfg(any(test, target_arch = "wasm32"))]
            ExplorerMode::Explore => self
                .architecture
                .operation
                .is_some_and(|operation| operation.retained_detail_indices().contains(&index)),
            #[cfg(not(any(test, target_arch = "wasm32")))]
            ExplorerMode::Explore => false,
        }
    }

    #[cfg(any(test, target_arch = "wasm32"))]
    pub(super) const fn canonicalize_detail(&mut self) {
        let visible = match self.mode {
            ExplorerMode::Guided => guided_detail_indices(self.narrative.stage),
            #[cfg(any(test, target_arch = "wasm32"))]
            ExplorerMode::Explore => match self.architecture.operation {
                Some(operation) => operation.retained_detail_indices(),
                None => &[],
            },
            #[cfg(not(any(test, target_arch = "wasm32")))]
            ExplorerMode::Explore => &[],
        };
        self.detail_operation = match self.detail_operation {
            Some(selected) if slice_contains(visible, selected) => Some(selected),
            _ => visible.first().copied(),
        };
    }
}

#[cfg(any(test, target_arch = "wasm32"))]
const fn slice_contains(indices: &[usize], needle: usize) -> bool {
    let mut index = 0;
    while index < indices.len() {
        if indices[index] == needle {
            return true;
        }
        index += 1;
    }
    false
}

#[cfg(any(test, target_arch = "wasm32"))]
const fn guided_detail_indices(stage: NarrativeStage) -> &'static [usize] {
    use NarrativeStage as S;
    match stage {
        S::LayerNorm => &[0, 1],
        S::QueryKeyValue => &[2, 3, 4],
        S::AttentionScore => &[5, 6],
        S::Softmax => &[7],
        S::ValueAggregation => &[8, 9, 10],
        S::Residual => &[11],
        S::Mlp => &[12, 13, 14, 15],
        S::BlockOutput => &[16, 17],
        S::Tokenization
        | S::TokenEmbedding
        | S::PositionEmbedding
        | S::CausalMask
        | S::FinalLayerNorm
        | S::LanguageModelHead
        | S::Logits
        | S::Temperature
        | S::TopK
        | S::Sampling
        | S::GeneratedToken
        | S::AppendToContext
        | S::Repeat => &[],
    }
}

pub(super) const fn representative_detail(stage: NarrativeStage) -> Option<usize> {
    use NarrativeStage as S;
    match stage {
        S::LayerNorm => Some(1),
        S::QueryKeyValue => Some(2),
        S::AttentionScore => Some(6),
        S::Softmax => Some(7),
        S::ValueAggregation => Some(8),
        S::Residual => Some(11),
        S::Mlp => Some(13),
        S::BlockOutput => Some(17),
        S::Tokenization
        | S::TokenEmbedding
        | S::PositionEmbedding
        | S::CausalMask
        | S::FinalLayerNorm
        | S::LanguageModelHead
        | S::Logits
        | S::Temperature
        | S::TopK
        | S::Sampling
        | S::GeneratedToken
        | S::AppendToContext
        | S::Repeat => None,
    }
}
