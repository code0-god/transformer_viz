//! Architecture-first navigation and node interaction contracts.

use super::{
    architecture_overview::{
        ArchitectureNodeCapability, ArchitectureNodeId, ArchitectureOverviewState,
        ArchitectureView, AttentionArchitectureMetadata, architecture_attention_heads,
        architecture_block_layers,
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

    state.activate_node(ArchitectureNodeId::TransformerBlock, 2, 4);

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

    state.activate_node(ArchitectureNodeId::FinalLayerNorm, 2, 4);

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
        ArchitectureNodeCapability::DrillDown
    );
    assert!(ArchitectureNodeId::SelfAttention.can_open());
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
    state.selection.layer = 1;
    state.selection.head = 3;
    state.selection.token = 5;
    state.generation.prompt_text = "generation sentinel".to_owned();
    state.generation.selected_step = Some(2);
    let status = state.status.clone();
    let prompt_expanded = state.ui.prompt_expanded;
    let selection = state.selection;
    let prompt_text = state.generation.prompt_text.clone();
    let selected_step = state.generation.selected_step;

    state
        .ui
        .architecture_overview
        .activate_node(ArchitectureNodeId::TransformerBlock, 2, 4);
    state
        .ui
        .architecture_overview
        .activate_node(ArchitectureNodeId::SelfAttention, 2, 4);
    state.ui.architecture_overview.select_head(usize::MAX, 4);
    state
        .ui
        .architecture_overview
        .activate_node(ArchitectureNodeId::AttentionCausalMask, 2, 4);
    state.ui.architecture_overview.select_transformer_block(2);
    state.ui.architecture_overview.select_root();

    assert_eq!(state.status, status);
    assert_eq!(state.ui.prompt_expanded, prompt_expanded);
    assert_eq!(state.selection, selection);
    assert_eq!(state.generation.prompt_text, prompt_text);
    assert_eq!(state.generation.selected_step, selected_step);
}

#[test]
fn architecture_layers_follow_model_config() {
    assert_eq!(architecture_block_layers(3).collect::<Vec<_>>(), [0, 1, 2]);
}

#[test]
fn block_to_self_attention_navigation_preserves_layer() {
    let mut state = ArchitectureOverviewState::default();
    state.open_transformer_block(2);
    state.select_layer(1, 2);

    state.activate_node(ArchitectureNodeId::SelfAttention, 2, 4);

    assert_eq!(state.view(), ArchitectureView::SelfAttention);
    assert_eq!(state.selected_layer(), 1);
    assert_eq!(state.selected_head(), 0);
}

#[test]
fn self_attention_to_block_navigation_preserves_coordinates() {
    let mut state = ArchitectureOverviewState::default();
    state.open_transformer_block(2);
    state.select_layer(1, 2);
    state.activate_node(ArchitectureNodeId::SelfAttention, 2, 4);
    state.select_head(3, 4);

    state.select_transformer_block(2);

    assert_eq!(state.view(), ArchitectureView::TransformerBlock);
    assert_eq!(state.selected_layer(), 1);
    assert_eq!(state.selected_head(), 3);
    assert_eq!(
        state.selected_node(),
        Some(ArchitectureNodeId::SelfAttention)
    );
}

#[test]
fn self_attention_breadcrumb_path_is_complete() {
    let mut state = ArchitectureOverviewState::default();
    state.open_transformer_block(2);
    state.activate_node(ArchitectureNodeId::SelfAttention, 2, 4);

    assert_eq!(
        state.breadcrumb_labels(2),
        ["GPT", "Transformer Block × 2", "Self-Attention"]
    );
}

#[test]
fn selected_head_uses_config_bounds() {
    let mut state = ArchitectureOverviewState::default();
    state.open_transformer_block(2);
    state.activate_node(ArchitectureNodeId::SelfAttention, 2, 4);

    state.select_head(usize::MAX, 4);
    assert_eq!(state.selected_head(), 3);
    assert_eq!(
        architecture_attention_heads(4).collect::<Vec<_>>(),
        [0, 1, 2, 3]
    );
}

#[test]
fn attention_metadata_derives_head_dimension_from_config() {
    let metadata = AttentionArchitectureMetadata::from_config(64, 4);

    assert_eq!(
        metadata.map(|value| (
            value.head_dimension(),
            value.head_count(),
            value.model_width()
        )),
        Some((16, 4, 64))
    );
}

#[test]
fn attention_metadata_exposes_combined_qkv_width() {
    let metadata = AttentionArchitectureMetadata::from_config(64, 4);

    assert_eq!(
        metadata.map(AttentionArchitectureMetadata::qkv_width),
        Some(192)
    );
    assert_eq!(AttentionArchitectureMetadata::from_config(63, 4), None);
}

#[test]
fn attention_operation_selection_stays_in_attention_view() {
    let mut state = ArchitectureOverviewState::default();
    state.open_transformer_block(2);
    state.activate_node(ArchitectureNodeId::SelfAttention, 2, 4);

    state.activate_node(ArchitectureNodeId::AttentionCausalMask, 2, 4);

    assert_eq!(state.view(), ArchitectureView::SelfAttention);
    assert_eq!(
        state.selected_node(),
        Some(ArchitectureNodeId::AttentionCausalMask)
    );
}

#[test]
fn attention_operation_has_no_unimplemented_drill_down() {
    assert_eq!(
        ArchitectureNodeId::AttentionQkvProjection.capability(),
        ArchitectureNodeCapability::Selectable
    );
    assert_eq!(
        ArchitectureNodeId::AttentionOutputProjection.capability(),
        ArchitectureNodeCapability::Selectable
    );
    assert!(!ArchitectureNodeId::AttentionQkvProjection.can_open());
    assert!(!ArchitectureNodeId::AttentionOutputProjection.can_open());
}
