//! Deterministic state for the 18-step Transformer data-path playback.

/// Number of real tensor boundaries in one selected Transformer block.
pub const PLAYBACK_STEP_COUNT: usize = 18;

/// Playback rate selected by the user.
#[derive(Debug, Clone, Copy, Default, PartialEq, Eq)]
pub enum PlaybackSpeed {
    /// Half speed.
    Half,
    /// Normal speed.
    #[default]
    Normal,
    /// Double speed.
    Double,
}

/// Bounded playback cursor and transport state.
#[derive(Debug, Clone, Copy, Default, PartialEq, Eq)]
pub struct Playback {
    /// Zero-based selected data-path step.
    pub step: usize,
    /// Whether timed playback is active.
    pub playing: bool,
    /// Selected playback rate.
    pub speed: PlaybackSpeed,
    ticks: usize,
}

impl Playback {
    /// Selects the first operation and pauses.
    pub const fn first(&mut self) {
        self.step = 0;
        self.pause();
    }

    /// Moves one operation backward without crossing the first step.
    pub const fn previous(&mut self) {
        self.step = self.step.saturating_sub(1);
        self.pause();
    }

    /// Selects one operation by its zero-based trace index and pauses.
    pub const fn select(&mut self, step: usize) {
        self.step = if step < PLAYBACK_STEP_COUNT {
            step
        } else {
            PLAYBACK_STEP_COUNT - 1
        };
        self.pause();
    }

    /// Moves one operation forward without crossing the last step.
    pub const fn next(&mut self) {
        if self.step < PLAYBACK_STEP_COUNT - 1 {
            self.step += 1;
        }
        self.pause();
    }

    /// Selects the last operation and pauses.
    pub const fn last(&mut self) {
        self.step = PLAYBACK_STEP_COUNT - 1;
        self.pause();
    }

    /// Starts or pauses timed playback.
    pub const fn toggle(&mut self) {
        if self.playing {
            self.pause();
        } else {
            if self.step == PLAYBACK_STEP_COUNT - 1 {
                self.step = 0;
            }
            self.playing = true;
            self.ticks = 0;
        }
    }

    /// Changes timed playback speed.
    pub const fn set_speed(&mut self, speed: PlaybackSpeed) {
        self.speed = speed;
        self.ticks = 0;
    }

    /// Advances the deterministic 250ms transport clock.
    pub const fn tick(&mut self) {
        if !self.playing {
            return;
        }
        self.ticks = self.ticks.saturating_add(1);
        if self.ticks < self.speed.tick_threshold() {
            return;
        }
        self.ticks = 0;
        if self.step == PLAYBACK_STEP_COUNT - 1 {
            self.playing = false;
        } else {
            self.step += 1;
        }
    }

    const fn pause(&mut self) {
        self.playing = false;
        self.ticks = 0;
    }
}

impl PlaybackSpeed {
    const fn tick_threshold(self) -> usize {
        match self {
            Self::Half => 4,
            Self::Normal => 2,
            Self::Double => 1,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::{PLAYBACK_STEP_COUNT, Playback, PlaybackSpeed};

    #[test]
    fn transport_stays_bounded_when_moving_past_both_ends() {
        // Given: playback at the first operation.
        let mut playback = Playback::default();

        // When: previous, last, and next are requested at their respective bounds.
        playback.previous();
        assert_eq!(playback.step, 0);
        playback.last();
        playback.next();

        // Then: the cursor remains inside all 18 real operations and transport pauses.
        assert_eq!(playback.step, PLAYBACK_STEP_COUNT - 1);
        assert!(!playback.playing);
    }

    #[test]
    fn transport_transitions_update_step_play_state_and_speed() {
        // Given: playback at the first operation.
        let mut playback = Playback::default();

        // When: next, play, speed, and first transitions are applied.
        playback.next();
        assert_eq!(playback.step, 1);
        playback.toggle();
        assert!(playback.playing);
        playback.set_speed(PlaybackSpeed::Double);
        assert_eq!(playback.speed, PlaybackSpeed::Double);
        playback.first();

        // Then: first returns to a paused initial cursor.
        assert_eq!(playback.step, 0);
        assert!(!playback.playing);
    }

    #[test]
    fn deterministic_ticks_respect_speed_and_stop_at_last_step() {
        // Given: half-speed playback one step before the end.
        let mut playback = Playback::default();
        playback.select(PLAYBACK_STEP_COUNT - 2);
        playback.set_speed(PlaybackSpeed::Half);
        playback.toggle();

        // When: exactly two half-speed step intervals elapse.
        for _ in 0..8 {
            playback.tick();
        }

        // Then: playback reaches the final operation and stops without a timer sleep.
        assert_eq!(playback.step, PLAYBACK_STEP_COUNT - 1);
        assert!(!playback.playing);
    }
}
