//! Exhaustive mode-aware Inspector source precedence regressions.

#[cfg(test)]
mod tests {
    use nanogpt_schema::OperationId;

    use crate::app::{
        architecture::{ArchitectureOperation, source_operation_precedence},
        ui_state::ExplorerMode,
    };

    const LEGACY_DETAILS: [Option<OperationId>; 10] = [
        None,
        Some(OperationId::Embedding),
        Some(OperationId::AttentionLayerNorm),
        Some(OperationId::QueryKeyValue),
        Some(OperationId::Attention),
        Some(OperationId::AttentionResidual),
        Some(OperationId::MlpLayerNorm),
        Some(OperationId::Mlp),
        Some(OperationId::MlpResidual),
        Some(OperationId::Logits),
    ];

    #[test]
    fn explore_source_always_uses_architecture_operation_for_every_legacy_detail() {
        for architecture in ArchitectureOperation::ALL {
            for legacy in LEGACY_DETAILS {
                assert_eq!(
                    source_operation_precedence(ExplorerMode::Explore, Some(architecture), legacy,),
                    architecture.source_operation(),
                    "architecture={architecture:?}, legacy={legacy:?}",
                );
            }
        }
        assert_eq!(
            source_operation_precedence(
                ExplorerMode::Explore,
                Some(ArchitectureOperation::Projection),
                Some(OperationId::AttentionResidual),
            ),
            Some(OperationId::Attention),
        );
        assert_eq!(
            source_operation_precedence(ExplorerMode::Explore, None, Some(OperationId::Mlp),),
            None,
        );
    }

    #[test]
    fn guided_source_preserves_retained_detail_and_logits_behavior() {
        assert_eq!(
            source_operation_precedence(
                ExplorerMode::Guided,
                Some(ArchitectureOperation::Projection),
                Some(OperationId::AttentionResidual),
            ),
            Some(OperationId::AttentionResidual),
        );
        assert_eq!(
            source_operation_precedence(
                ExplorerMode::Guided,
                Some(ArchitectureOperation::Logits),
                Some(OperationId::Attention),
            ),
            Some(OperationId::Logits),
        );
        assert_eq!(
            source_operation_precedence(
                ExplorerMode::Guided,
                Some(ArchitectureOperation::Projection),
                None,
            ),
            Some(OperationId::Attention),
        );
    }
}
