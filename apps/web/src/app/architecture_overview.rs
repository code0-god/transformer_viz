//! Pure navigation and interaction state for the architecture canvas.

use std::ops::Range;

mod node;

pub use node::{ArchitectureNodeCapability, ArchitectureNodeId};

/// Architecture depth shown by the shared canvas.
#[derive(Clone, Copy, Debug, Default, Eq, PartialEq)]
pub enum ArchitectureView {
    /// Complete GPT architecture.
    #[default]
    Root,
    /// One Pre-LN Transformer block.
    TransformerBlock,
    /// Causal multi-head self-attention internals.
    SelfAttention,
}

/// Config-derived shape values shown by Self-Attention Architecture.
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub struct AttentionArchitectureMetadata {
    model_width: usize,
    head_count: usize,
    head_dimension: usize,
    qkv_width: usize,
}

impl AttentionArchitectureMetadata {
    /// Derives exact attention dimensions from validated model config values.
    #[must_use]
    pub const fn from_config(model_width: usize, head_count: usize) -> Option<Self> {
        if head_count == 0 || !model_width.is_multiple_of(head_count) {
            return None;
        }
        let Some(qkv_width) = model_width.checked_mul(3) else {
            return None;
        };
        Some(Self {
            model_width,
            head_count,
            head_dimension: model_width / head_count,
            qkv_width,
        })
    }

    #[must_use]
    /// Model embedding width C.
    pub const fn model_width(self) -> usize {
        self.model_width
    }

    #[must_use]
    /// Configured attention head count H.
    pub const fn head_count(self) -> usize {
        self.head_count
    }

    #[must_use]
    /// Per-head dimension D.
    pub const fn head_dimension(self) -> usize {
        self.head_dimension
    }

    #[must_use]
    /// Combined projection output width 3C.
    pub const fn qkv_width(self) -> usize {
        self.qkv_width
    }
}

/// First-class navigation state for the architecture canvas.
#[derive(Clone, Copy, Debug, Default, Eq, PartialEq)]
pub struct ArchitectureOverviewState {
    view: ArchitectureView,
    selected_layer: usize,
    selected_head: usize,
    selected_node: Option<ArchitectureNodeId>,
}

impl ArchitectureOverviewState {
    /// Current canvas depth.
    #[must_use]
    pub const fn view(self) -> ArchitectureView {
        self.view
    }

    /// Configured block index retained across root/detail navigation.
    #[must_use]
    pub const fn selected_layer(self) -> usize {
        self.selected_layer
    }

    /// Configured attention head retained across architecture navigation.
    #[must_use]
    pub const fn selected_head(self) -> usize {
        self.selected_head
    }

    /// Current node selection.
    #[must_use]
    pub const fn selected_node(self) -> Option<ArchitectureNodeId> {
        self.selected_node
    }

    /// Returns to GPT Root while retaining the selected block index.
    pub const fn select_root(&mut self) {
        self.view = ArchitectureView::Root;
        self.selected_node = None;
    }

    /// Opens the implemented Transformer Block detail.
    pub const fn open_transformer_block(&mut self, layer_count: usize) {
        if let Some(layer) = clamp_index(self.selected_layer, layer_count) {
            self.selected_layer = layer;
            self.selected_node = Some(ArchitectureNodeId::TransformerBlock);
            self.view = ArchitectureView::TransformerBlock;
        } else {
            self.select_root();
        }
    }

    /// Returns to Transformer Block while retaining layer and head coordinates.
    pub const fn select_transformer_block(&mut self, layer_count: usize) {
        if let Some(layer) = clamp_index(self.selected_layer, layer_count) {
            self.selected_layer = layer;
            self.selected_node = Some(ArchitectureNodeId::SelfAttention);
            self.view = ArchitectureView::TransformerBlock;
        } else {
            self.select_root();
        }
    }

    /// Opens the implemented Self-Attention architecture.
    pub const fn open_self_attention(&mut self, layer_count: usize, head_count: usize) {
        let layer = clamp_index(self.selected_layer, layer_count);
        let head = clamp_index(self.selected_head, head_count);
        match (layer, head) {
            (Some(layer), Some(head)) => {
                self.selected_layer = layer;
                self.selected_head = head;
                self.selected_node = Some(ArchitectureNodeId::SelfAttention);
                self.view = ArchitectureView::SelfAttention;
            }
            _ => self.select_root(),
        }
    }

    /// Changes the retained layer index without changing canvas depth.
    pub const fn select_layer(&mut self, requested_layer: usize, layer_count: usize) {
        if let Some(layer) = clamp_index(requested_layer, layer_count) {
            self.selected_layer = layer;
        }
    }

    /// Changes the retained head index without changing canvas depth.
    pub const fn select_head(&mut self, requested_head: usize, head_count: usize) {
        if let Some(head) = clamp_index(requested_head, head_count) {
            self.selected_head = head;
        }
    }

    /// Activates one node according to its current capability.
    pub const fn activate_node(
        &mut self,
        node: ArchitectureNodeId,
        layer_count: usize,
        head_count: usize,
    ) {
        match node {
            ArchitectureNodeId::TransformerBlock => self.open_transformer_block(layer_count),
            ArchitectureNodeId::SelfAttention => {
                self.open_self_attention(layer_count, head_count);
            }
            _ if matches!(node.capability(), ArchitectureNodeCapability::Selectable) => {
                self.selected_node = Some(node);
            }
            _ => {}
        }
    }

    /// Extensible breadcrumb labels for the active canvas depth.
    #[must_use]
    pub fn breadcrumb_labels(self, layer_count: usize) -> Vec<String> {
        match self.view {
            ArchitectureView::Root => vec!["GPT".to_owned()],
            ArchitectureView::TransformerBlock => {
                vec![
                    "GPT".to_owned(),
                    format!("Transformer Block × {layer_count}"),
                ]
            }
            ArchitectureView::SelfAttention => vec![
                "GPT".to_owned(),
                format!("Transformer Block × {layer_count}"),
                "Self-Attention".to_owned(),
            ],
        }
    }
}

const fn clamp_index(requested: usize, count: usize) -> Option<usize> {
    match count.checked_sub(1) {
        Some(last) => Some(if requested < last { requested } else { last }),
        None => None,
    }
}

/// Exact configured Transformer block indices.
#[must_use]
pub const fn architecture_block_layers(layer_count: usize) -> Range<usize> {
    0..layer_count
}

/// Exact configured attention head indices.
#[must_use]
pub const fn architecture_attention_heads(head_count: usize) -> Range<usize> {
    0..head_count
}
