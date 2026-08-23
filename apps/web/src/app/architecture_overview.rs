//! Pure navigation and interaction state for the architecture canvas.

use std::ops::Range;

/// Architecture depth shown by the shared canvas.
#[derive(Clone, Copy, Debug, Default, Eq, PartialEq)]
pub enum ArchitectureView {
    /// Complete GPT architecture.
    #[default]
    Root,
    /// One Pre-LN Transformer block.
    TransformerBlock,
}

/// Stable identity for every architecture node in the current hierarchy.
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum ArchitectureNodeId {
    /// GPT root breadcrumb identity.
    Root,
    /// Current token sequence.
    InputContext,
    /// Token embedding lookup.
    TokenEmbedding,
    /// Position embedding lookup.
    PositionEmbedding,
    /// Embedding merge addition.
    EmbeddingAdd,
    /// Initial hidden state.
    HiddenState,
    /// Repeated Transformer block.
    TransformerBlock,
    /// First Pre-LN normalization.
    LayerNorm1,
    /// Causal multi-head self-attention.
    SelfAttention,
    /// First residual addition.
    Residual1,
    /// Second Pre-LN normalization.
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
}

impl ArchitectureNodeId {
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
        }
    }

    /// Interaction supported by this node in the current release.
    #[must_use]
    pub const fn capability(self) -> ArchitectureNodeCapability {
        match self {
            Self::TransformerBlock => ArchitectureNodeCapability::DrillDown,
            Self::InputContext
            | Self::TokenEmbedding
            | Self::PositionEmbedding
            | Self::LayerNorm1
            | Self::SelfAttention
            | Self::Residual1
            | Self::LayerNorm2
            | Self::Mlp
            | Self::Residual2
            | Self::FinalLayerNorm
            | Self::LmHead
            | Self::Logits
            | Self::TokenSelection
            | Self::GeneratedToken
            | Self::AppendContext => ArchitectureNodeCapability::Selectable,
            Self::Root | Self::EmbeddingAdd | Self::HiddenState => {
                ArchitectureNodeCapability::Static
            }
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
    /// Node is structural and has no direct action.
    Static,
    /// Node can become the current selection.
    Selectable,
    /// Node opens an implemented child architecture.
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

/// First-class navigation state for the architecture canvas.
#[derive(Clone, Copy, Debug, Default, Eq, PartialEq)]
pub struct ArchitectureOverviewState {
    view: ArchitectureView,
    selected_layer: usize,
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
        if let Some(layer) = clamp_layer(self.selected_layer, layer_count) {
            self.selected_layer = layer;
            self.selected_node = Some(ArchitectureNodeId::TransformerBlock);
            self.view = ArchitectureView::TransformerBlock;
        } else {
            self.select_root();
        }
    }

    /// Changes the retained layer index without changing canvas depth.
    pub const fn select_layer(&mut self, requested_layer: usize, layer_count: usize) {
        if let Some(layer) = clamp_layer(requested_layer, layer_count) {
            self.selected_layer = layer;
        }
    }

    /// Activates one node according to its current capability.
    pub const fn activate_node(&mut self, node: ArchitectureNodeId, layer_count: usize) {
        match node.capability() {
            ArchitectureNodeCapability::Static => {}
            ArchitectureNodeCapability::Selectable => {
                self.selected_node = Some(node);
            }
            ArchitectureNodeCapability::DrillDown => {
                self.open_transformer_block(layer_count);
            }
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
        }
    }
}

const fn clamp_layer(requested_layer: usize, layer_count: usize) -> Option<usize> {
    match layer_count.checked_sub(1) {
        Some(last_layer) => Some(if requested_layer < last_layer {
            requested_layer
        } else {
            last_layer
        }),
        None => None,
    }
}

/// Exact configured Transformer block indices.
#[must_use]
pub const fn architecture_block_layers(layer_count: usize) -> Range<usize> {
    0..layer_count
}
