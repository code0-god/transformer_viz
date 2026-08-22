//! Focused tests for the guided narrative state.

#[cfg(test)]
mod tests {
    use crate::app::narrative::{
        DETAIL_OPERATION_STAGES, NARRATIVE_STAGE_COUNT, NarrativePlayback, NarrativeSpeed,
        NarrativeStage,
    };

    #[test]
    fn catalog_is_stable_and_contains_exactly_nine_stages() {
        assert_eq!(NARRATIVE_STAGE_COUNT, 9);
        assert_eq!(
            NarrativeStage::ALL,
            [
                NarrativeStage::Embedding,
                NarrativeStage::AttentionLayerNorm,
                NarrativeStage::QueryKeyValue,
                NarrativeStage::AttentionScores,
                NarrativeStage::CausalMask,
                NarrativeStage::Softmax,
                NarrativeStage::ValueAggregation,
                NarrativeStage::MlpAndResidual,
                NarrativeStage::LanguageModelHead,
            ]
        );
    }

    #[test]
    fn embedding_has_no_legacy_block_operation_and_block_input_starts_attention_norm() {
        assert_eq!(
            DETAIL_OPERATION_STAGES[0],
            NarrativeStage::AttentionLayerNorm
        );
        assert!(!DETAIL_OPERATION_STAGES.contains(&NarrativeStage::Embedding));
    }

    #[test]
    fn all_eighteen_detail_operations_have_one_stage() {
        assert_eq!(DETAIL_OPERATION_STAGES.len(), 18);
        for (index, stage) in DETAIL_OPERATION_STAGES.into_iter().enumerate() {
            assert_eq!(NarrativeStage::for_detail_operation(index), Some(stage));
        }
        assert_eq!(NarrativeStage::for_detail_operation(18), None);
    }

    #[test]
    fn transport_navigation_is_bounded_and_pauses() {
        let mut playback = NarrativePlayback::default();
        playback.previous();
        assert_eq!(playback.stage, NarrativeStage::Embedding);
        playback.last();
        playback.next();
        assert_eq!(playback.stage, NarrativeStage::LanguageModelHead);
        assert!(!playback.playing);
        playback.select(NarrativeStage::AttentionScores);
        assert_eq!(playback.stage, NarrativeStage::AttentionScores);
    }

    #[test]
    fn quarter_second_ticks_match_each_speed_and_stop_at_stage_nine() {
        for (speed, ticks_per_stage) in [
            (NarrativeSpeed::Half, 10),
            (NarrativeSpeed::Normal, 6),
            (NarrativeSpeed::Double, 3),
        ] {
            let mut playback = NarrativePlayback::default();
            playback.select(NarrativeStage::MlpAndResidual);
            playback.set_speed(speed);
            playback.toggle();
            for _ in 0..ticks_per_stage {
                playback.tick();
            }
            assert_eq!(playback.stage, NarrativeStage::LanguageModelHead);
            assert!(playback.playing);
            for _ in 0..ticks_per_stage {
                playback.tick();
            }
            assert_eq!(playback.stage, NarrativeStage::LanguageModelHead);
            assert!(!playback.playing);
        }
    }
}
