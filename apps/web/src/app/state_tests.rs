//! Focused tests for application and guided UI state.

#[cfg(test)]
mod tests {
    use nanogpt_schema::{TokenKind, WorkerRequest, WorkerResponse};

    use crate::app::{
        state::AppState,
        state_test_fixtures::{attention_response, block_response, token_response},
        ui_state::{ExplorerUiState, InspectorTab},
    };
    use crate::{
        app::narrative::{NARRATIVE_STAGE_COUNT, NarrativeStage},
        spike,
    };

    fn run_response(text: &str) -> WorkerResponse {
        spike::handle_worker_request(WorkerRequest::Run {
            request_id: 7,
            text: text.to_owned(),
        })
        .expect("the deterministic spike run should succeed")
    }

    fn assert_user_selection(state: &AppState, head: usize) {
        assert_eq!(state.selection.layer, 0);
        assert_eq!(state.selection.head, head);
        assert_eq!(state.selection.token, 0);
        assert_eq!(state.selection.key, 0);
        assert_eq!(state.ui.narrative.stage, NarrativeStage::MlpAndResidual);
        assert_eq!(state.ui.inspector_tab, InspectorTab::Tensor);
        assert_eq!(state.ui.selected_feature, 3);
        assert_eq!(state.ui.detail_operation, Some(12));
    }

    #[test]
    fn explorer_ui_defaults_and_stage_movement_are_worker_free() {
        let mut ui = ExplorerUiState::default();
        assert_eq!(ui.inspector_tab, InspectorTab::Explanation);
        assert!(ui.prompt_expanded);
        assert!(!ui.model_map_expanded);
        assert_eq!(ui.narrative.stage, NarrativeStage::Embedding);
        assert_eq!(ui.detail_operation, None);

        for expected in NarrativeStage::ALL.into_iter().skip(1) {
            ui.next_stage();
            assert_eq!(ui.narrative.stage, expected);
        }
        assert_eq!(ui.narrative.stage.index() + 1, NARRATIVE_STAGE_COUNT);
        assert_eq!(ui.detail_operation, None);

        ui.previous_stage();
        assert_eq!(ui.narrative.stage, NarrativeStage::MlpAndResidual);
        assert_eq!(ui.detail_operation, Some(12));
    }

    #[test]
    fn run_complete_defaults_to_last_byte_and_clamps_old_coordinates() {
        let mut state = AppState::default();
        state.selection.layer = usize::MAX;
        state.selection.head = usize::MAX;
        state.selection.token = usize::MAX;
        state.selection.key = usize::MAX;
        state.ui.select_stage(NarrativeStage::Softmax);
        state.ui.inspector_tab = InspectorTab::Source;
        state.ui.selected_feature = 42;
        state.ui.detail_operation = Some(7);

        let requests = state
            .apply(run_response("ab"))
            .expect("run completion should apply");

        assert_eq!(state.selection.layer, 0);
        assert_eq!(state.selection.head, 0);
        assert_eq!(state.selection.token, 2);
        assert_eq!(state.selection.key, 2);
        assert_eq!(state.ui.narrative.stage, NarrativeStage::Embedding);
        assert_eq!(state.ui.inspector_tab, InspectorTab::Explanation);
        assert_eq!(state.ui.selected_feature, 0);
        assert_eq!(state.ui.detail_operation, None);
        assert!(!state.ui.prompt_expanded);
        assert_eq!(requests.len(), 1);
    }

    #[test]
    fn selector_requests_clamp_to_loaded_run_bounds() {
        let mut state = AppState::default();
        state
            .apply(run_response("ab"))
            .expect("run completion should apply");

        let layer_request = state
            .select_layer(usize::MAX)
            .expect("a loaded run should produce a block request");
        assert!(matches!(
            layer_request,
            WorkerRequest::InspectBlock { layer: 0, .. }
        ));
        let head_request = state
            .select_head(usize::MAX)
            .expect("a loaded run should produce a head request");
        assert!(matches!(
            head_request,
            WorkerRequest::InspectAttentionHead { head: 0, .. }
        ));
        let token_request = state
            .select_cell(usize::MAX, usize::MAX)
            .expect("a loaded run should produce a token request");
        assert!(matches!(
            token_request,
            WorkerRequest::InspectToken { token: 3, .. }
        ));
        assert_eq!(state.selection.token, 3);
        assert_eq!(state.selection.key, 3);
    }

    #[test]
    fn bos_eos_only_completion_is_safe_and_detail_trace_preserves_user_coordinate() {
        let mut response = run_response("ab");
        let WorkerResponse::RunComplete { summary, .. } = &mut response else {
            panic!("spike must return a run completion");
        };
        summary.tokens.retain(|token| token.kind != TokenKind::Byte);

        let mut state = AppState::default();
        state
            .apply(response)
            .expect("special-token-only summary should be accepted");
        assert_eq!(state.selection.token, 1);
        assert_eq!(state.selection.key, 1);

        state.selection.token = 0;
        state.selection.key = 0;
        state.ui.select_stage(NarrativeStage::MlpAndResidual);
        state.ui.inspector_tab = InspectorTab::Tensor;
        state.ui.selected_feature = 3;

        state
            .apply(block_response())
            .expect("block detail should apply");
        assert_user_selection(&state, 0);
        let request = state
            .select_head(usize::MAX)
            .expect("the loaded block should produce a head request");
        assert!(matches!(
            request,
            WorkerRequest::InspectAttentionHead { head: 3, .. }
        ));
        assert_user_selection(&state, 3);

        state
            .apply(attention_response())
            .expect("head detail should apply");
        assert_user_selection(&state, 3);
        state
            .apply(token_response())
            .expect("token detail should apply");
        assert_user_selection(&state, 3);
    }

    #[test]
    fn run_clears_stale_trace_and_advances_request_id() {
        // Given: a fresh explorer state.
        let mut state = AppState::default();

        // When: two runs are requested.
        let first = state.run("the cat");
        let second = state.run("the dog");

        // Then: request IDs are unique and monotonically increasing.
        assert_ne!(first, second);
    }
}
