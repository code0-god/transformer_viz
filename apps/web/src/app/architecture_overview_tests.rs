//! Architecture-first root and block navigation contracts.

use super::architecture_overview::{
    ArchitectureOverviewSelection, ArchitectureOverviewState, architecture_block_layers,
};

#[test]
fn architecture_overview_defaults_to_gpt_root() {
    let state = ArchitectureOverviewState::default();

    assert_eq!(state.selection(), ArchitectureOverviewSelection::Gpt);
}

#[test]
fn architecture_overview_selects_valid_block() {
    let mut state = ArchitectureOverviewState::default();

    state.select_block(1, 2);

    assert_eq!(
        state.selection(),
        ArchitectureOverviewSelection::Block { layer: 1 }
    );
}

#[test]
fn architecture_overview_builds_root_and_block_breadcrumb() {
    let mut state = ArchitectureOverviewState::default();
    state.select_block(0, 2);

    assert_eq!(state.breadcrumb_labels(), ["GPT", "Block 0"]);
    state.select_root();
    assert_eq!(state.breadcrumb_labels(), ["GPT"]);
}

#[test]
fn architecture_overview_clamps_invalid_layer() {
    let mut state = ArchitectureOverviewState::default();

    state.select_block(99, 2);
    assert_eq!(
        state.selection(),
        ArchitectureOverviewSelection::Block { layer: 1 }
    );
    state.select_block(0, 0);
    assert_eq!(state.selection(), ArchitectureOverviewSelection::Gpt);
}

#[test]
fn architecture_overview_uses_configured_layer_count() {
    assert_eq!(architecture_block_layers(3).collect::<Vec<_>>(), [0, 1, 2]);
}
