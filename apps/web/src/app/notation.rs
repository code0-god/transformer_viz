//! Canonical notation for architecture diagrams and explanatory panels.

#[cfg(any(test, target_arch = "wasm32"))]
use super::architecture_overview::ArchitectureNodeId;

#[cfg(any(test, target_arch = "wasm32"))]
mod catalog;
#[cfg(any(test, target_arch = "wasm32"))]
pub mod current;
#[cfg(any(test, target_arch = "wasm32"))]
pub mod symbols;

#[cfg(any(test, target_arch = "wasm32"))]
pub(crate) use current::{CurrentAttentionShapes, current_sequence_length};
#[cfg(any(test, target_arch = "wasm32"))]
pub(crate) use symbols::{
    ATTENTION_INPUT_DEFINITION, ATTENTION_INPUT_DETAIL, ATTENTION_INPUT_TITLE,
    ATTENTION_OUTPUT_DETAIL, ATTENTION_OUTPUT_TITLE, ATTENTION_SUMMARY, ATTENTION_VALUE_CAPTION,
    BLOCK_INPUT_DETAIL, BLOCK_INPUT_TITLE, BLOCK_OUTPUT_DETAIL, BLOCK_OUTPUT_TITLE,
    BLOCK_RESIDUAL_1_DETAIL, BLOCK_RESIDUAL_1_TITLE, HEAD_OUTPUT_DETAIL, HEAD_OUTPUT_TITLE,
    ROOT_HIDDEN_OUTPUT, ROOT_HIDDEN_SHAPE, SPLIT_HEADS_DETAIL, SPLIT_HEADS_TITLE,
    VALUE_HEAD_EDGE_LABEL, attention_symbol_definitions,
};
#[cfg(test)]
pub(crate) use symbols::{BLOCK_OUTPUT_SYMBOL, BLOCK_RESIDUAL_1_SYMBOL, ROOT_HIDDEN_INPUT};

/// Canonical text associated with one architecture operation or tensor.
#[cfg(any(test, target_arch = "wasm32"))]
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub(crate) struct NotationEntry {
    pub(crate) id: ArchitectureNodeId,
    pub(crate) title: &'static str,
    pub(crate) formula: &'static str,
    pub(crate) diagram_detail: &'static str,
    pub(crate) symbolic_input: &'static str,
    pub(crate) symbolic_output: &'static str,
    pub(crate) accessible_name: &'static str,
    pub(crate) description: &'static str,
}

/// Looks up canonical notation by stable architecture node identity.
#[cfg(any(test, target_arch = "wasm32"))]
#[must_use]
pub(crate) fn notation_for(id: ArchitectureNodeId) -> Option<&'static NotationEntry> {
    notation_entries().find(|entry| entry.id == id)
}

/// Iterates over every canonical notation entry exactly once.
#[cfg(any(test, target_arch = "wasm32"))]
pub(crate) fn notation_entries() -> impl Iterator<Item = &'static NotationEntry> {
    catalog::NOTATION_CATALOG
        .iter()
        .flat_map(|entries| entries.iter())
}

/// Formats the only UI use of the multiplication sign.
#[must_use]
pub(crate) fn block_repeat_label(layer_count: usize) -> String {
    format!("Transformer Block × {layer_count}")
}

/// Formats one symbolic input/output relationship for explanation panels.
#[cfg(any(test, target_arch = "wasm32"))]
#[must_use]
pub(crate) fn symbolic_shape(entry: &NotationEntry) -> String {
    if entry.symbolic_input == entry.symbolic_output {
        entry.symbolic_output.to_owned()
    } else {
        format!("{} → {}", entry.symbolic_input, entry.symbolic_output)
    }
}
