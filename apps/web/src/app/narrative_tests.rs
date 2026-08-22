//! Focused tests for canonical curriculum transport and legacy detail compatibility.

#[cfg(test)]
mod tests {
    use crate::app::narrative::{
        DETAIL_OPERATION_STAGES, NarrativePlayback, NarrativeSpeed, NarrativeStage,
    };

    #[test]
    fn all_eighteen_legacy_operations_keep_one_curriculum_owner() {
        assert_eq!(DETAIL_OPERATION_STAGES.len(), 18);
        for (index, stage) in DETAIL_OPERATION_STAGES.into_iter().enumerate() {
            assert_eq!(NarrativeStage::for_detail_operation(index), Some(stage));
        }
        assert_eq!(NarrativeStage::for_detail_operation(18), None);
    }

    #[test]
    fn each_speed_advances_exactly_one_step_per_interval() {
        for (speed, ticks) in [
            (NarrativeSpeed::Half, 10),
            (NarrativeSpeed::Normal, 6),
            (NarrativeSpeed::Double, 3),
        ] {
            let mut playback = NarrativePlayback::default();
            playback.select(NarrativeStage::AppendToContext);
            playback.set_speed(speed);
            playback.toggle();
            for _ in 0..ticks {
                playback.tick();
            }
            assert_eq!(playback.stage, NarrativeStage::Repeat);
            assert!(playback.playing);
            for _ in 0..ticks {
                playback.tick();
            }
            assert!(!playback.playing);
        }
    }
}
