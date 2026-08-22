//! Focused pure-state tests for Inspector-only selection.

#[cfg(test)]
mod tests {
    use crate::app::{
        narrative::NarrativeStage,
        ui_state::{ExplorerUiState, InspectorTab},
    };

    #[test]
    fn detail_and_feature_selection_are_pure_and_bounded() {
        // Given: active playback and a Q/K/V stage with unrelated UI coordinates.
        let mut ui = ExplorerUiState::default();
        ui.select_stage(NarrativeStage::QueryKeyValue);
        ui.inspector_tab = InspectorTab::Source;
        ui.toggle_narrative();
        let narrative = ui.narrative;
        let prompt_expanded = ui.prompt_expanded;

        // When: a mapped detail and an oversized feature are selected.
        assert!(ui.select_detail_operation(3));
        assert_eq!(ui.select_feature(99, 16), Some(15));

        // Then: only detail/feature change; stage, playback, and shell state are stable.
        assert_eq!(ui.detail_operation, Some(3));
        assert_eq!(ui.selected_feature, 15);
        assert_eq!(ui.narrative, narrative);
        assert_eq!(ui.inspector_tab, InspectorTab::Source);
        assert_eq!(ui.prompt_expanded, prompt_expanded);
        assert!(!ui.select_detail_operation(12));
        assert_eq!(ui.detail_operation, Some(3));
        assert_eq!(ui.select_feature(0, 0), None);
        assert_eq!(ui.selected_feature, 15);
    }

    #[test]
    fn matrix_stage_transition_preserves_global_feature_selection() {
        // Given: a feature selected on a feature-bearing stage.
        let mut ui = ExplorerUiState::default();
        assert_eq!(ui.select_feature(63, 64), Some(63));

        // When: navigation enters matrix-addressed score, mask, and softmax stages.
        for stage in [
            NarrativeStage::AttentionScores,
            NarrativeStage::CausalMask,
            NarrativeStage::Softmax,
        ] {
            ui.select_stage(stage);
            assert_eq!(ui.selected_feature, 63);
        }

        // Then: matrix q/k selection has not invented or clamped a feature axis.
        assert_eq!(ui.narrative.stage, NarrativeStage::Softmax);
        assert_eq!(ui.selected_feature, 63);
    }

    #[test]
    fn inspector_tab_keyboard_navigation_wraps_and_supports_boundaries() {
        assert_eq!(
            InspectorTab::Explanation.after_key("ArrowLeft"),
            Some(InspectorTab::Source)
        );
        assert_eq!(
            InspectorTab::Source.after_key("ArrowRight"),
            Some(InspectorTab::Explanation)
        );
        assert_eq!(
            InspectorTab::Tensor.after_key("Home"),
            Some(InspectorTab::Explanation)
        );
        assert_eq!(
            InspectorTab::Explanation.after_key("End"),
            Some(InspectorTab::Source)
        );
        assert_eq!(InspectorTab::Tensor.after_key("Enter"), None);
    }
}
