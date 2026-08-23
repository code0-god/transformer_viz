//! Independent root and block navigation for the architecture-first canvas.

use std::ops::Range;

/// Location selected in the architecture overview.
#[derive(Clone, Copy, Debug, Default, Eq, PartialEq)]
pub enum ArchitectureOverviewSelection {
    /// Whole GPT architecture.
    #[default]
    Gpt,
    /// One configured Transformer block.
    Block {
        /// Zero-based layer index.
        layer: usize,
    },
}

/// First-class navigation state for the architecture overview.
#[derive(Clone, Copy, Debug, Default, Eq, PartialEq)]
pub struct ArchitectureOverviewState {
    selection: ArchitectureOverviewSelection,
}

impl ArchitectureOverviewState {
    /// Returns the current architecture location.
    #[must_use]
    pub const fn selection(self) -> ArchitectureOverviewSelection {
        self.selection
    }

    /// Selects the whole GPT architecture.
    pub const fn select_root(&mut self) {
        self.selection = ArchitectureOverviewSelection::Gpt;
    }

    /// Selects a block, clamped to the loaded model layer count.
    pub const fn select_block(&mut self, requested_layer: usize, layer_count: usize) {
        self.selection = match layer_count.checked_sub(1) {
            Some(last_layer) => ArchitectureOverviewSelection::Block {
                layer: if requested_layer < last_layer {
                    requested_layer
                } else {
                    last_layer
                },
            },
            None => ArchitectureOverviewSelection::Gpt,
        };
    }

    /// Returns labels for the extensible architecture breadcrumb.
    #[must_use]
    pub fn breadcrumb_labels(self) -> Vec<String> {
        match self.selection {
            ArchitectureOverviewSelection::Gpt => vec!["GPT".to_owned()],
            ArchitectureOverviewSelection::Block { layer } => {
                vec!["GPT".to_owned(), format!("Block {layer}")]
            }
        }
    }
}

/// Returns the exact configured Transformer block indices.
#[must_use]
pub const fn architecture_block_layers(layer_count: usize) -> Range<usize> {
    0..layer_count
}
