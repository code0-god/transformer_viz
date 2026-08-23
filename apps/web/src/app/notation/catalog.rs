//! Canonical notation catalog partitioned by Architecture level.

use super::NotationEntry;

macro_rules! entry {
    ($id:ident, $title:literal, $formula:literal, $detail:literal, $input:literal, $output:literal, $accessible:literal, $description:literal) => {
        NotationEntry {
            id: crate::app::architecture_overview::ArchitectureNodeId::$id,
            title: $title,
            formula: $formula,
            diagram_detail: $detail,
            symbolic_input: $input,
            symbolic_output: $output,
            accessible_name: $accessible,
            description: $description,
        }
    };
}

mod attention;
mod block;
mod root;

use attention::ATTENTION_NOTATION;
use block::BLOCK_NOTATION;
use root::ROOT_NOTATION;

pub(super) const NOTATION_CATALOG: &[&[NotationEntry]] =
    &[ROOT_NOTATION, BLOCK_NOTATION, ATTENTION_NOTATION];
