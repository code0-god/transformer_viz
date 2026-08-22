//! Lead-review regressions for distinct evidence and level-to-Guided focus.

#[cfg(test)]
mod tests {
    use nanogpt_schema::{FiniteF32, LogitCandidate, TokenId};

    use crate::app::{
        architecture::{ArchitectureLevel, ArchitectureNodeKind, ArchitectureOperation},
        narrative::{EvidenceView, NarrativeStage, PredictionCandidateMetric},
        prediction_candidate::project_logit_candidate,
        ui_state::{ExplorerMode, ExplorerUiState},
    };

    #[test]
    fn split_curriculum_concepts_have_distinct_dominant_evidence_views() {
        use EvidenceView as V;
        use NarrativeStage as S;
        assert_eq!(S::Tokenization.evidence_view(), V::Tokenization);
        assert_eq!(S::TokenEmbedding.evidence_view(), V::TokenEmbedding);
        assert_eq!(S::PositionEmbedding.evidence_view(), V::PositionEmbedding);
        assert_eq!(S::ValueAggregation.evidence_view(), V::ValueAggregation);
        assert_eq!(S::Residual.evidence_view(), V::AttentionResidual);
        assert_eq!(S::Mlp.evidence_view(), V::MlpTransform);
        assert_eq!(S::BlockOutput.evidence_view(), V::BlockOutput);
        assert_eq!(S::FinalLayerNorm.evidence_view(), V::FinalLayerNorm);
        assert_eq!(S::LanguageModelHead.evidence_view(), V::LanguageModelHead);
        assert_eq!(S::Logits.evidence_view(), V::Logits);
        assert_eq!(S::Sampling.evidence_view(), V::Sampling);
        assert_eq!(S::GeneratedToken.evidence_view(), V::GeneratedToken);
    }

    #[test]
    fn generation_operation_and_concept_are_bijective_pairs_and_ln2_keeps_detail() {
        let mut ui = ExplorerUiState::default();
        for (operation, concept) in [
            (
                ArchitectureOperation::GenerationSoftmax,
                NarrativeStage::Sampling,
            ),
            (
                ArchitectureOperation::Sample,
                NarrativeStage::GeneratedToken,
            ),
        ] {
            ui.navigate_architecture(ArchitectureNodeKind::Operation(operation));
            assert_eq!(ui.narrative.stage, concept);
            ui.select_stage(concept);
            assert_eq!(ui.architecture.operation, Some(operation));
        }
        ui.navigate_architecture(ArchitectureNodeKind::Operation(
            ArchitectureOperation::MlpLayerNorm,
        ));
        assert_eq!(ui.narrative.stage, NarrativeStage::Mlp);
        assert_eq!(ui.detail_operation, Some(12));
    }

    #[test]
    fn prediction_concepts_expose_raw_logits_without_probability_encoding() {
        assert_eq!(
            NarrativeStage::Logits.prediction_candidate_metric(),
            Some(PredictionCandidateMetric::RawLogit)
        );
        assert_eq!(
            NarrativeStage::LanguageModelHead.prediction_candidate_metric(),
            None
        );
    }

    #[test]
    fn candidate_projection_uses_raw_logit_for_numeric_attribute_and_signed_text()
    -> Result<(), Box<dyn std::error::Error>> {
        let candidate = LogitCandidate {
            token_id: TokenId(7),
            display: "x".to_owned(),
            logit: FiniteF32::new(12.375)?,
            probability: FiniteF32::new(0.987_654_3)?,
        };

        let projection = project_logit_candidate(&candidate);
        let attribute_value = projection.data_attribute().parse::<f64>()?;

        assert_eq!(projection.raw_value.to_bits(), 12.375_f64.to_bits());
        assert_eq!(attribute_value.to_bits(), projection.raw_value.to_bits());
        assert_eq!(projection.display_text, "+12.3750000");
        assert_ne!(
            projection.raw_value.to_bits(),
            f64::from(candidate.probability.get()).to_bits()
        );
        assert_ne!(
            projection.display_text,
            format!("{:+.7}", candidate.probability.get())
        );
        Ok(())
    }

    #[test]
    fn explore_level_to_guided_canonicalizes_retained_curriculum_focus() {
        let mut ui = ExplorerUiState::default();
        ui.select_stage(NarrativeStage::GeneratedToken);
        ui.navigate_architecture(ArchitectureNodeKind::Level(ArchitectureLevel::Generation));
        assert_eq!(ui.mode, ExplorerMode::Explore);
        assert_eq!(ui.architecture.operation, None);
        assert_eq!(ui.narrative.stage, NarrativeStage::GeneratedToken);

        ui.select_mode(ExplorerMode::Guided);

        assert_eq!(ui.narrative.stage, NarrativeStage::GeneratedToken);
        assert_eq!(ui.architecture.level, ArchitectureLevel::Generation);
        assert_eq!(
            ui.architecture.operation,
            Some(ArchitectureOperation::Sample)
        );
    }
}
