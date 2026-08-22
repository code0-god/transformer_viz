//! Config-driven browser-only architecture navigation policy.

pub mod catalog;
mod operation_focus;

#[cfg(target_arch = "wasm32")]
pub(crate) use catalog::ArchitectureNode;
#[cfg(any(test, target_arch = "wasm32"))]
pub(crate) use catalog::catalog;
pub(crate) use catalog::{
    ArchitectureLevel, ArchitectureNodeKind, ArchitectureOperation, SummaryEvidence,
};

use nanogpt_schema::{GptConfig, OperationId, WorkerRequest};

use super::state::AppState;

/// Current browser-only hierarchy path and operation selection.
#[derive(Debug, Clone, Copy, Default, PartialEq, Eq)]
pub(crate) struct ArchitectureMapState {
    pub(crate) level: ArchitectureLevel,
    pub(crate) layer: usize,
    pub(crate) head: usize,
    pub(crate) operation: Option<ArchitectureOperation>,
}

impl ArchitectureMapState {
    #[must_use]
    pub(crate) const fn head_width(config: &GptConfig) -> usize {
        config.n_embd / config.n_head
    }

    pub(crate) const fn navigate(&mut self, node: ArchitectureNodeKind) {
        match node {
            ArchitectureNodeKind::Operation(operation) => self.operation = Some(operation),
            ArchitectureNodeKind::Layer(layer) => {
                self.level = ArchitectureLevel::Block;
                self.layer = layer;
                self.operation = None;
            }
            ArchitectureNodeKind::Head(head) => {
                self.level = ArchitectureLevel::Attention;
                self.head = head;
                self.operation = None;
            }
            ArchitectureNodeKind::Level(level) => self.return_to(level),
        }
    }

    #[cfg(any(test, target_arch = "wasm32"))]
    #[must_use]
    pub(crate) const fn parent(self) -> Option<ArchitectureLevel> {
        match self.level {
            ArchitectureLevel::Gpt => None,
            ArchitectureLevel::Block | ArchitectureLevel::Generation => {
                Some(ArchitectureLevel::Gpt)
            }
            ArchitectureLevel::Attention => Some(ArchitectureLevel::Block),
        }
    }

    #[must_use]
    pub(crate) fn breadcrumb(self) -> Vec<ArchitectureLevel> {
        match self.level {
            ArchitectureLevel::Gpt => vec![ArchitectureLevel::Gpt],
            ArchitectureLevel::Block => vec![ArchitectureLevel::Gpt, ArchitectureLevel::Block],
            ArchitectureLevel::Attention => vec![
                ArchitectureLevel::Gpt,
                ArchitectureLevel::Block,
                ArchitectureLevel::Attention,
            ],
            ArchitectureLevel::Generation => {
                vec![ArchitectureLevel::Gpt, ArchitectureLevel::Generation]
            }
        }
    }

    pub(crate) const fn return_to(&mut self, level: ArchitectureLevel) {
        self.level = level;
        self.operation = None;
    }
}

pub(crate) const fn source_operation_precedence(
    architecture: Option<ArchitectureOperation>,
    legacy: Option<OperationId>,
) -> Option<OperationId> {
    match architecture {
        Some(ArchitectureOperation::Logits) => Some(OperationId::Logits),
        Some(
            ArchitectureOperation::Embedding
            | ArchitectureOperation::FinalLayerNorm
            | ArchitectureOperation::LanguageModelHead
            | ArchitectureOperation::AttentionLayerNorm
            | ArchitectureOperation::AttentionResidual
            | ArchitectureOperation::MlpLayerNorm
            | ArchitectureOperation::Mlp
            | ArchitectureOperation::MlpResidual
            | ArchitectureOperation::Query
            | ArchitectureOperation::Key
            | ArchitectureOperation::Value
            | ArchitectureOperation::QueryKeyProduct
            | ArchitectureOperation::Scale
            | ArchitectureOperation::Mask
            | ArchitectureOperation::Softmax
            | ArchitectureOperation::ValueProduct
            | ArchitectureOperation::MergeHeads
            | ArchitectureOperation::Projection
            | ArchitectureOperation::Temperature
            | ArchitectureOperation::TopK
            | ArchitectureOperation::GenerationSoftmax
            | ArchitectureOperation::Sample
            | ArchitectureOperation::Append
            | ArchitectureOperation::Repeat,
        )
        | None => legacy,
    }
}

impl AppState {
    /// Navigates the browser hierarchy and emits at most one cached detail request.
    #[must_use]
    pub(crate) fn navigate_architecture(
        &mut self,
        node: ArchitectureNodeKind,
    ) -> Option<WorkerRequest> {
        let node = match node {
            ArchitectureNodeKind::Layer(layer) => {
                ArchitectureNodeKind::Layer(self.clamp_layer(layer))
            }
            ArchitectureNodeKind::Head(head) => ArchitectureNodeKind::Head(self.clamp_head(head)),
            ArchitectureNodeKind::Operation(operation) => {
                ArchitectureNodeKind::Operation(operation)
            }
            ArchitectureNodeKind::Level(level) => ArchitectureNodeKind::Level(level),
        };
        self.ui.navigate_architecture(node);
        match node {
            ArchitectureNodeKind::Layer(layer) => self.select_layer(layer),
            ArchitectureNodeKind::Head(head) => self.select_head(head),
            ArchitectureNodeKind::Operation(_) | ArchitectureNodeKind::Level(_) => None,
        }
    }

    fn clamp_layer(&self, layer: usize) -> usize {
        layer.min(
            self.model
                .as_ref()
                .map_or(0, |model| model.config.n_layer.saturating_sub(1)),
        )
    }

    fn clamp_head(&self, head: usize) -> usize {
        head.min(
            self.model
                .as_ref()
                .map_or(0, |model| model.config.n_head.saturating_sub(1)),
        )
    }
}
