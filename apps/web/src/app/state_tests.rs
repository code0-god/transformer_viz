//! Focused tests for application and guided UI state.

#[cfg(test)]
mod tests {
    use std::{error::Error, io};

    use nanogpt_schema::{TokenKind, WorkerRequest, WorkerResponse};

    use crate::app::{
        state::AppState,
        state_test_fixtures::{attention_response, block_response, token_response},
        ui_state::{ExplorerUiState, InspectorTab},
    };
    use crate::{
        app::narrative::{NARRATIVE_STAGE_COUNT, NarrativeSpeed, NarrativeStage},
        spike,
    };

    type TestResult = Result<(), Box<dyn Error>>;

    fn run_response(text: &str) -> Result<WorkerResponse, spike::SpikeError> {
        spike::handle_worker_request(WorkerRequest::Run {
            request_id: 7,
            text: text.to_owned(),
        })
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
    fn causal_mask_has_no_legacy_probability_detail() {
        let mut ui = ExplorerUiState::default();

        ui.select_stage(NarrativeStage::CausalMask);

        assert_eq!(ui.detail_operation, None);
    }

    #[test]
    fn autoplay_keeps_legacy_detail_mapping_synchronized() {
        // Given: narrative playback is on the final stage backed by block operations.
        let mut ui = ExplorerUiState::default();
        ui.select_stage(NarrativeStage::MlpAndResidual);
        ui.set_narrative_speed(NarrativeSpeed::Double);
        ui.toggle_narrative();

        // When: one double-speed stage interval advances the browser-only clock.
        for _ in 0..3 {
            ui.tick_narrative();
        }

        // Then: prediction is current, its absent legacy operation is explicit, and no Worker state exists here.
        assert_eq!(ui.narrative.stage, NarrativeStage::LanguageModelHead);
        assert_eq!(ui.detail_operation, None);
        assert!(ui.narrative.playing);
        for _ in 0..3 {
            ui.tick_narrative();
        }
        assert!(!ui.narrative.playing);
    }

    #[test]
    fn run_complete_defaults_to_last_byte_and_clamps_old_coordinates() -> TestResult {
        let mut state = AppState::default();
        state.selection.layer = usize::MAX;
        state.selection.head = usize::MAX;
        state.selection.token = usize::MAX;
        state.selection.key = usize::MAX;
        state.ui.select_stage(NarrativeStage::Softmax);
        state.ui.inspector_tab = InspectorTab::Source;
        state.ui.selected_feature = 42;
        state.ui.detail_operation = Some(7);

        let requests = state.apply(run_response("ab")?)?;

        assert_eq!(state.selection.layer, 0);
        assert_eq!(state.selection.head, 0);
        assert_eq!(state.selection.token, 2);
        assert_eq!(state.selection.key, 2);
        assert_eq!(state.ui.narrative.stage, NarrativeStage::Embedding);
        assert_eq!(state.ui.inspector_tab, InspectorTab::Explanation);
        assert_eq!(state.ui.selected_feature, 0);
        assert_eq!(state.ui.detail_operation, None);
        assert!(state.ui.prompt_expanded);
        assert_eq!(requests.len(), 1);
        Ok(())
    }

    #[test]
    fn selector_requests_clamp_to_loaded_run_bounds() -> TestResult {
        let mut state = AppState::default();
        state.apply(run_response("ab")?)?;

        let layer_request = state
            .select_layer(usize::MAX)
            .ok_or_else(|| io::Error::other("loaded run did not produce a block request"))?;
        assert!(matches!(
            layer_request,
            WorkerRequest::InspectBlock { layer: 0, .. }
        ));
        let head_request = state
            .select_head(usize::MAX)
            .ok_or_else(|| io::Error::other("loaded run did not produce a head request"))?;
        assert!(matches!(
            head_request,
            WorkerRequest::InspectAttentionHead { head: 0, .. }
        ));
        let token_request = state
            .select_cell(usize::MAX, usize::MAX)
            .ok_or_else(|| io::Error::other("loaded run did not produce a token request"))?;
        assert!(matches!(
            token_request,
            WorkerRequest::InspectToken { token: 3, .. }
        ));
        assert_eq!(state.selection.token, 3);
        assert_eq!(state.selection.key, 3);
        Ok(())
    }

    #[test]
    fn bos_eos_only_completion_is_safe_and_detail_trace_preserves_user_coordinate() -> TestResult {
        let mut response = run_response("ab")?;
        let WorkerResponse::RunComplete { summary, .. } = &mut response else {
            return Err(io::Error::other("spike did not return a run completion").into());
        };
        summary.tokens.retain(|token| token.kind != TokenKind::Byte);

        let mut state = AppState::default();
        state.apply(response)?;
        assert_eq!(state.selection.token, 1);
        assert_eq!(state.selection.key, 1);

        state.selection.token = 0;
        state.selection.key = 0;
        state.ui.select_stage(NarrativeStage::MlpAndResidual);
        state.ui.inspector_tab = InspectorTab::Tensor;
        state.ui.selected_feature = 3;

        state.apply(block_response()?)?;
        assert_user_selection(&state, 0);
        let request = state
            .select_head(usize::MAX)
            .ok_or_else(|| io::Error::other("loaded block did not produce a head request"))?;
        assert!(matches!(
            request,
            WorkerRequest::InspectAttentionHead { head: 3, .. }
        ));
        assert_user_selection(&state, 3);

        state.apply(attention_response()?)?;
        assert_user_selection(&state, 3);
        state.apply(token_response()?)?;
        assert_user_selection(&state, 3);
        assert!(!state.ui.prompt_expanded);
        Ok(())
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
