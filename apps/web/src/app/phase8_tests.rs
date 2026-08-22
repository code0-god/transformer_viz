//! Phase 8 shared Guided/Explore contract tests.

#[cfg(test)]
mod tests {
    use crate::app::{
        architecture::{ArchitectureLevel, ArchitectureNodeKind, ArchitectureOperation},
        narrative::{CurriculumGroup, NARRATIVE_STAGE_COUNT, NarrativePlayback, NarrativeStage},
        state::AppState,
        ui_state::{ExplorerMode, ExplorerUiState, InspectorTab},
    };

    #[test]
    fn curriculum_is_exact_grouped_order() {
        use NarrativeStage as S;
        assert_eq!(NARRATIVE_STAGE_COUNT, 21);
        assert_eq!(
            CurriculumGroup::ALL.map(CurriculumGroup::label),
            [
                "Input representation",
                "Transformer Block",
                "Prediction",
                "Generation",
            ]
        );
        assert_eq!(
            S::ALL,
            [
                S::Tokenization,
                S::TokenEmbedding,
                S::PositionEmbedding,
                S::LayerNorm,
                S::QueryKeyValue,
                S::AttentionScore,
                S::CausalMask,
                S::Softmax,
                S::ValueAggregation,
                S::Residual,
                S::Mlp,
                S::BlockOutput,
                S::FinalLayerNorm,
                S::LanguageModelHead,
                S::Logits,
                S::Temperature,
                S::TopK,
                S::Sampling,
                S::GeneratedToken,
                S::AppendToContext,
                S::Repeat,
            ]
        );
        assert_eq!(
            S::ALL.map(S::group),
            [
                CurriculumGroup::InputRepresentation,
                CurriculumGroup::InputRepresentation,
                CurriculumGroup::InputRepresentation,
                CurriculumGroup::TransformerBlock,
                CurriculumGroup::TransformerBlock,
                CurriculumGroup::TransformerBlock,
                CurriculumGroup::TransformerBlock,
                CurriculumGroup::TransformerBlock,
                CurriculumGroup::TransformerBlock,
                CurriculumGroup::TransformerBlock,
                CurriculumGroup::TransformerBlock,
                CurriculumGroup::TransformerBlock,
                CurriculumGroup::Prediction,
                CurriculumGroup::Prediction,
                CurriculumGroup::Prediction,
                CurriculumGroup::Generation,
                CurriculumGroup::Generation,
                CurriculumGroup::Generation,
                CurriculumGroup::Generation,
                CurriculumGroup::Generation,
                CurriculumGroup::Generation,
            ]
        );
    }

    #[test]
    fn transport_is_bounded_defaults_paused_and_stops_at_repeat() {
        let mut playback = NarrativePlayback::default();
        assert_eq!(playback.stage, NarrativeStage::Tokenization);
        assert!(!playback.playing);
        playback.previous();
        assert_eq!(playback.stage, NarrativeStage::Tokenization);
        playback.last();
        playback.next();
        assert_eq!(playback.stage, NarrativeStage::Repeat);
        playback.toggle();
        assert!(playback.playing);
        for _ in 0..10 {
            playback.tick();
        }
        assert_eq!(playback.stage, NarrativeStage::Repeat);
        assert!(!playback.playing);
    }

    #[test]
    fn operation_to_concept_mapping_is_exhaustive_at_shared_boundaries() {
        use ArchitectureOperation as O;
        use NarrativeStage as S;
        assert_eq!(O::Query.concept(), S::QueryKeyValue);
        assert_eq!(O::Key.concept(), S::QueryKeyValue);
        assert_eq!(O::Value.concept(), S::QueryKeyValue);
        assert_eq!(O::QueryKeyProduct.concept(), S::AttentionScore);
        assert_eq!(O::Scale.concept(), S::AttentionScore);
        assert_eq!(O::ValueProduct.concept(), S::ValueAggregation);
        assert_eq!(O::MergeHeads.concept(), S::ValueAggregation);
        assert_eq!(O::Projection.concept(), S::ValueAggregation);
        assert_eq!(O::GenerationSoftmax.concept(), S::Sampling);
        assert_eq!(O::Sample.concept(), S::GeneratedToken);
        assert_eq!(O::MlpLayerNorm.concept(), S::Mlp);
        for operation in O::ALL {
            let _ = operation.concept();
        }
    }

    #[test]
    fn guided_and_explore_are_alternate_writers_of_one_focus() {
        let mut ui = ExplorerUiState {
            inspector_tab: InspectorTab::Source,
            ..ExplorerUiState::default()
        };
        ui.select_stage(NarrativeStage::GeneratedToken);
        assert_eq!(ui.mode, ExplorerMode::Guided);
        assert_eq!(
            ui.architecture.operation,
            Some(ArchitectureOperation::Sample)
        );
        ui.navigate_architecture(ArchitectureNodeKind::Operation(
            ArchitectureOperation::Scale,
        ));
        assert_eq!(ui.mode, ExplorerMode::Explore);
        assert_eq!(ui.narrative.stage, NarrativeStage::AttentionScore);
        assert_eq!(
            ui.architecture.operation,
            Some(ArchitectureOperation::Scale)
        );
        assert_eq!(ui.inspector_tab, InspectorTab::Source);
        ui.select_mode(ExplorerMode::Guided);
        assert_eq!(ui.narrative.stage, NarrativeStage::AttentionScore);
        assert_eq!(
            ui.architecture.operation,
            Some(ArchitectureOperation::Scale)
        );
    }

    #[test]
    fn mode_switch_preserves_generation_and_shared_coordinates() {
        let mut state = AppState::default();
        state.generation.selected_step = Some(4);
        state.selection.layer = 2;
        state.selection.head = 3;
        state.selection.token = 5;
        state.selection.key = 1;
        state.ui.inspector_tab = InspectorTab::Tensor;
        state.ui.select_stage(NarrativeStage::GeneratedToken);
        state.ui.select_mode(ExplorerMode::Explore);
        state.ui.select_mode(ExplorerMode::Guided);
        assert_eq!(state.generation.selected_step, Some(4));
        assert_eq!(
            (
                state.selection.layer,
                state.selection.head,
                state.selection.token,
                state.selection.key
            ),
            (2, 3, 5, 1)
        );
        assert_eq!(state.ui.inspector_tab, InspectorTab::Tensor);
        assert_eq!(state.ui.narrative.stage, NarrativeStage::GeneratedToken);
    }

    #[test]
    fn mode_tabs_support_roving_keyboard_commands() {
        assert_eq!(
            ExplorerMode::Guided.after_key("ArrowRight"),
            Some(ExplorerMode::Explore)
        );
        assert_eq!(
            ExplorerMode::Explore.after_key("ArrowLeft"),
            Some(ExplorerMode::Guided)
        );
        assert_eq!(
            ExplorerMode::Explore.after_key("Home"),
            Some(ExplorerMode::Guided)
        );
        assert_eq!(
            ExplorerMode::Guided.after_key("End"),
            Some(ExplorerMode::Explore)
        );
        assert_eq!(ExplorerMode::Guided.after_key("Enter"), None);
    }

    #[test]
    fn mode_stage_level_and_operation_movement_are_worker_free() {
        let mut state = AppState::default();
        state.ui.select_stage(NarrativeStage::Sampling);
        state.ui.select_mode(ExplorerMode::Explore);
        assert_eq!(
            state.navigate_architecture(ArchitectureNodeKind::Level(ArchitectureLevel::Generation)),
            None
        );
        assert_eq!(
            state.navigate_architecture(ArchitectureNodeKind::Operation(
                ArchitectureOperation::TopK
            )),
            None
        );
        assert_eq!(state.ui.narrative.stage, NarrativeStage::TopK);
    }
}
