use super::*;

#[test]
fn parent_and_breadcrumb_navigation_return_deterministically() {
    // Given: attention inside block 2, head 3.
    let mut map = ArchitectureMapState::default();
    map.navigate(ArchitectureNodeKind::Layer(2));
    map.navigate(ArchitectureNodeKind::Level(ArchitectureLevel::Attention));
    map.navigate(ArchitectureNodeKind::Head(3));

    // When: ancestry is inspected and Block is selected from the breadcrumb.
    assert_eq!(
        map.breadcrumb(),
        [
            ArchitectureLevel::Gpt,
            ArchitectureLevel::Block,
            ArchitectureLevel::Attention,
        ]
    );
    assert_eq!(map.parent(), Some(ArchitectureLevel::Block));
    map.return_to(ArchitectureLevel::Block);

    // Then: coordinates persist while the descendant operation is cleared.
    assert_eq!(map.level, ArchitectureLevel::Block);
    assert_eq!(map.layer, 2);
    assert_eq!(map.head, 3);
    assert_eq!(map.operation, None);
}

#[test]
fn explore_rejects_hidden_siblings_and_canonicalizes_focus_changes() {
    let mut ui = ExplorerUiState::default();
    ui.navigate_architecture(ArchitectureNodeKind::Operation(
        ArchitectureOperation::AttentionLayerNorm,
    ));
    assert_eq!(ui.detail_operation, Some(0));
    assert!(ui.select_detail_operation(1));
    assert!(!ui.select_detail_operation(6));
    assert_eq!(ui.detail_operation, Some(1));

    ui.navigate_architecture(ArchitectureNodeKind::Operation(
        ArchitectureOperation::Scale,
    ));
    assert_eq!(ui.detail_operation, Some(6));
    ui.select_mode(ExplorerMode::Guided);
    assert_eq!(ui.detail_operation, Some(6));
    ui.select_stage(NarrativeStage::QueryKeyValue);
    assert_eq!(ui.detail_operation, Some(2));
}

#[test]
fn navigation_clamps_from_model_config_and_is_worker_free_without_summary() {
    // Given: loaded metadata but no run summary.
    let mut state = AppState::default();
    state.model = Some(model());

    // When: oversized layer/head nodes and a generation operation are selected.
    let layer = state.navigate_architecture(ArchitectureNodeKind::Layer(usize::MAX));
    let head = state.navigate_architecture(ArchitectureNodeKind::Head(usize::MAX));
    let repeat = state.navigate_architecture(ArchitectureNodeKind::Operation(
        ArchitectureOperation::Repeat,
    ));

    // Then: browser state clamps to config and sends no Worker request.
    assert_eq!(state.ui.architecture.layer, 2);
    assert_eq!(state.ui.architecture.head, 3);
    assert_eq!(state.selection.layer, 2);
    assert_eq!(state.selection.head, 3);
    assert_eq!(
        state.ui.architecture.operation,
        Some(ArchitectureOperation::Repeat)
    );
    assert_eq!([layer, head, repeat], [None, None, None]);
}

#[test]
fn loaded_layer_and_head_navigation_emit_one_existing_detail_request_each() -> TestResult {
    // Given: model metadata and a cached run summary.
    let mut state = AppState::default();
    state.model = Some(model());
    state.summary = Some(run_summary()?);

    // When: layer and head coordinates change.
    let layer = state.navigate_architecture(ArchitectureNodeKind::Layer(2));
    let head = state.navigate_architecture(ArchitectureNodeKind::Head(3));

    // Then: each action yields exactly its existing detail request variant.
    assert!(matches!(
        layer,
        Some(WorkerRequest::InspectBlock { layer: 2, .. })
    ));
    assert!(matches!(
        head,
        Some(WorkerRequest::InspectAttentionHead {
            layer: 2,
            head: 3,
            ..
        })
    ));
    Ok(())
}

#[test]
fn generation_navigation_clears_stale_detail_and_has_no_false_summary_evidence() {
    // Given: a trace-backed attention detail is selected.
    let mut state = AppState::default();
    state.ui.select_stage(NarrativeStage::QueryKeyValue);
    assert_eq!(state.ui.detail_operation, Some(2));

    // When: navigation selects a generation-only boundary.
    let request = state.navigate_architecture(ArchitectureNodeKind::Operation(
        ArchitectureOperation::Repeat,
    ));

    // Then: prior detail evidence is cleared and no Worker request is invented.
    assert_eq!(state.ui.detail_operation, None);
    assert_eq!(request, None);
    assert_eq!(ArchitectureOperation::Repeat.summary_evidence(), None);
}

#[test]
fn prediction_operations_select_exact_summary_tensor_identity() {
    assert_eq!(
        ArchitectureOperation::FinalLayerNorm.summary_evidence(),
        Some(SummaryEvidence::FinalLayerNorm)
    );
    assert_eq!(
        ArchitectureOperation::LanguageModelHead.summary_evidence(),
        Some(SummaryEvidence::Logits)
    );
    assert_eq!(
        ArchitectureOperation::Logits.summary_evidence(),
        Some(SummaryEvidence::Logits)
    );
}

#[test]
fn stage_navigation_remains_request_free_and_synchronizes_architecture() -> TestResult {
    // Given: loaded cached data and the default GPT map.
    let mut state = AppState::default();
    state.model = Some(model());
    state.summary = Some(run_summary()?);

    // When: the existing stage rail selects Softmax.
    state.ui.select_stage(NarrativeStage::Softmax);

    // Then: no request API is involved and the architecture operation follows.
    assert_eq!(state.ui.architecture.level, ArchitectureLevel::Attention);
    assert_eq!(
        state.ui.architecture.operation,
        Some(ArchitectureOperation::Softmax)
    );
    Ok(())
}
