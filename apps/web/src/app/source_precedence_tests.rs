//! Focused Inspector source precedence regression.

#[cfg(test)]
mod tests {
    use nanogpt_schema::OperationId;

    use crate::app::architecture::{ArchitectureOperation, source_operation_precedence};

    #[test]
    fn generation_logits_source_overrides_stale_legacy_detail() {
        // Given: Architecture Map Logits and an unrelated legacy Attention source.
        // When / Then: current Generation Logits wins over stale detail evidence.
        assert_eq!(
            source_operation_precedence(
                Some(ArchitectureOperation::Logits),
                Some(OperationId::Attention),
            ),
            Some(OperationId::Logits),
        );
    }
}
