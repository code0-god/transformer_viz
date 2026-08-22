//! Focused tests for architecture catalog, navigation, and request policy.

#[cfg(test)]
mod tests {
    use std::error::Error;

    use nanogpt_schema::{GptConfig, ModelMetadata, WorkerRequest};

    type TestResult = Result<(), Box<dyn Error>>;

    use crate::app::{
        architecture::{
            ArchitectureLevel, ArchitectureMapState, ArchitectureNodeKind, ArchitectureOperation,
            SummaryEvidence, catalog,
        },
        narrative::NarrativeStage,
        state::AppState,
        state_test_fixtures::run_summary,
    };

    fn config() -> GptConfig {
        GptConfig {
            block_size: 24,
            vocab_size: 259,
            n_layer: 3,
            n_head: 4,
            n_embd: 64,
            bias: true,
        }
    }

    fn model() -> ModelMetadata {
        ModelMetadata {
            name: "test".to_owned(),
            corpus: "test".to_owned(),
            nanogpt_commit: "test".to_owned(),
            parameter_count: 1,
            config: config(),
        }
    }

    #[test]
    fn catalog_has_exact_four_levels_and_config_driven_coordinates() {
        // Given: a validated model configuration with non-default layer/head counts.
        let config = config();

        // When: every architecture catalog is materialized.
        let levels = ArchitectureLevel::ALL;
        let gpt = catalog(&config, ArchitectureLevel::Gpt);
        let attention = catalog(&config, ArchitectureLevel::Attention);

        // Then: level identity and coordinate nodes come only from the configuration.
        assert_eq!(
            levels,
            [
                ArchitectureLevel::Gpt,
                ArchitectureLevel::Block,
                ArchitectureLevel::Attention,
                ArchitectureLevel::Generation,
            ]
        );
        assert_eq!(
            levels.map(ArchitectureLevel::slug),
            ["gpt", "block", "attention", "generation"]
        );
        assert_eq!(
            gpt.iter()
                .filter(|node| matches!(node.kind, ArchitectureNodeKind::Layer(_)))
                .count(),
            config.n_layer
        );
        assert_eq!(
            attention
                .iter()
                .filter(|node| matches!(node.kind, ArchitectureNodeKind::Head(_)))
                .count(),
            config.n_head
        );
        assert_eq!(ArchitectureMapState::head_width(&config), 16);
    }

    #[test]
    fn catalog_operation_values_match_the_four_level_contract() {
        // Given: the architecture catalog contract.
        let config = config();

        // When: operation values are extracted without presentation copy.
        let operations = |level| {
            catalog(&config, level)
                .into_iter()
                .filter_map(|node| match node.kind {
                    ArchitectureNodeKind::Operation(operation) => Some(operation),
                    ArchitectureNodeKind::Layer(_)
                    | ArchitectureNodeKind::Head(_)
                    | ArchitectureNodeKind::Level(_) => None,
                })
                .collect::<Vec<_>>()
        };

        // Then: every level exposes the exact machine-consumed operation order.
        assert_eq!(
            operations(ArchitectureLevel::Gpt),
            [
                ArchitectureOperation::Embedding,
                ArchitectureOperation::FinalLayerNorm,
                ArchitectureOperation::LanguageModelHead,
            ]
        );
        assert_eq!(
            operations(ArchitectureLevel::Block),
            [
                ArchitectureOperation::AttentionLayerNorm,
                ArchitectureOperation::AttentionResidual,
                ArchitectureOperation::MlpLayerNorm,
                ArchitectureOperation::Mlp,
                ArchitectureOperation::MlpResidual,
            ]
        );
        assert_eq!(
            operations(ArchitectureLevel::Attention),
            [
                ArchitectureOperation::Query,
                ArchitectureOperation::Key,
                ArchitectureOperation::Value,
                ArchitectureOperation::QueryKeyProduct,
                ArchitectureOperation::Scale,
                ArchitectureOperation::Mask,
                ArchitectureOperation::Softmax,
                ArchitectureOperation::ValueProduct,
                ArchitectureOperation::MergeHeads,
                ArchitectureOperation::Projection,
            ]
        );
        assert_eq!(
            operations(ArchitectureLevel::Generation),
            [
                ArchitectureOperation::Logits,
                ArchitectureOperation::Temperature,
                ArchitectureOperation::TopK,
                ArchitectureOperation::GenerationSoftmax,
                ArchitectureOperation::Sample,
                ArchitectureOperation::Append,
                ArchitectureOperation::Repeat,
            ]
        );
    }

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
    fn operations_map_only_to_existing_narrative_and_detail_evidence() {
        assert_eq!(
            ArchitectureOperation::Softmax.target(),
            Some((NarrativeStage::Softmax, Some(7)))
        );
        assert_eq!(
            ArchitectureOperation::MlpResidual.target(),
            Some((NarrativeStage::MlpAndResidual, Some(17)))
        );
        assert_eq!(
            ArchitectureOperation::FinalLayerNorm.target(),
            Some((NarrativeStage::LanguageModelHead, None))
        );
        assert_eq!(ArchitectureOperation::Repeat.target(), None);
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
}
