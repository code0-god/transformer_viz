//! Architecture-first navigation and node interaction contracts.

use super::{
    architecture_overview::{
        ArchitectureNodeCapability, ArchitectureNodeId, ArchitectureOverviewState,
        ArchitectureView, architecture_block_layers,
    },
    state::{AppState, AppStatus},
};

#[test]
fn architecture_view_starts_at_root() {
    let state = ArchitectureOverviewState::default();

    assert_eq!(state.view(), ArchitectureView::Root);
    assert_eq!(state.selected_layer(), 0);
    assert_eq!(state.selected_node(), None);
    assert_eq!(state.breadcrumb_labels(2), ["GPT"]);
}

#[test]
fn transformer_block_activation_opens_configured_detail() {
    let mut state = ArchitectureOverviewState::default();

    state.activate_node(ArchitectureNodeId::TransformerBlock, 2);

    assert_eq!(state.view(), ArchitectureView::TransformerBlock);
    assert_eq!(state.selected_layer(), 0);
    assert_eq!(
        state.selected_node(),
        Some(ArchitectureNodeId::TransformerBlock)
    );
    assert_eq!(state.breadcrumb_labels(2), ["GPT", "Transformer Block × 2"]);
}

#[test]
fn root_navigation_preserves_selected_layer() {
    let mut state = ArchitectureOverviewState::default();
    state.open_transformer_block(2);
    state.select_layer(1, 2);

    state.select_root();

    assert_eq!(state.view(), ArchitectureView::Root);
    assert_eq!(state.selected_layer(), 1);
    assert_eq!(state.selected_node(), None);
}

#[test]
fn selected_layer_uses_config_bounds() {
    let mut state = ArchitectureOverviewState::default();
    state.open_transformer_block(3);

    state.select_layer(usize::MAX, 3);
    assert_eq!(state.selected_layer(), 2);

    state.open_transformer_block(0);
    assert_eq!(state.view(), ArchitectureView::Root);
    assert_eq!(state.selected_layer(), 2);
}

#[test]
fn selectable_node_does_not_navigate() {
    let mut state = ArchitectureOverviewState::default();

    state.activate_node(ArchitectureNodeId::FinalLayerNorm, 2);

    assert_eq!(state.view(), ArchitectureView::Root);
    assert_eq!(
        state.selected_node(),
        Some(ArchitectureNodeId::FinalLayerNorm)
    );
    assert_eq!(
        ArchitectureNodeId::FinalLayerNorm.capability(),
        ArchitectureNodeCapability::Selectable
    );
}

#[test]
fn node_capability_exposes_only_implemented_drill_down() {
    assert_eq!(
        ArchitectureNodeId::TransformerBlock.capability(),
        ArchitectureNodeCapability::DrillDown
    );
    assert_eq!(
        ArchitectureNodeId::SelfAttention.capability(),
        ArchitectureNodeCapability::Selectable
    );
    assert!(!ArchitectureNodeId::SelfAttention.can_open());
}

#[test]
fn architecture_node_ids_are_stable() {
    assert_eq!(ArchitectureNodeId::InputContext.as_str(), "input-context");
    assert_eq!(
        ArchitectureNodeId::TransformerBlock.as_str(),
        "transformer-block"
    );
    assert_eq!(ArchitectureNodeId::AppendContext.as_str(), "append-context");
}

#[test]
fn architecture_navigation_preserves_root_application_state() {
    let mut state = AppState::default();
    state.status = AppStatus::Ready;
    state.ui.prompt_expanded = false;
    let status = state.status.clone();
    let prompt_expanded = state.ui.prompt_expanded;

    state
        .ui
        .architecture_overview
        .activate_node(ArchitectureNodeId::TransformerBlock, 2);
    state.ui.architecture_overview.select_root();

    assert_eq!(state.status, status);
    assert_eq!(state.ui.prompt_expanded, prompt_expanded);
}

#[test]
fn architecture_layers_follow_model_config() {
    assert_eq!(architecture_block_layers(3).collect::<Vec<_>>(), [0, 1, 2]);
}
