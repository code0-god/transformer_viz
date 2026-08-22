//! Guided nine-stage narrative state.

/// Number of stages in the guided learning narrative.
pub const NARRATIVE_STAGE_COUNT: usize = 9;

/// Stable guided-learning order from model input to prediction.
#[derive(Debug, Clone, Copy, Default, PartialEq, Eq, Hash)]
#[repr(u8)]
pub enum NarrativeStage {
    /// Token and position embeddings enter the residual stream.
    #[default]
    Embedding,
    /// The residual stream is normalized before attention.
    AttentionLayerNorm,
    /// Query, key, and value projections are formed.
    QueryKeyValue,
    /// Query-key scores are computed and scaled.
    AttentionScores,
    /// Future key positions are excluded.
    CausalMask,
    /// Allowed scores become attention probabilities.
    Softmax,
    /// Values are aggregated and returned to the residual stream.
    ValueAggregation,
    /// The MLP transforms features and adds its residual.
    MlpAndResidual,
    /// The final representation becomes token predictions.
    LanguageModelHead,
}

impl NarrativeStage {
    /// Ordered catalog used by the rail, transport, and keyboard navigation.
    pub const ALL: [Self; NARRATIVE_STAGE_COUNT] = [
        Self::Embedding,
        Self::AttentionLayerNorm,
        Self::QueryKeyValue,
        Self::AttentionScores,
        Self::CausalMask,
        Self::Softmax,
        Self::ValueAggregation,
        Self::MlpAndResidual,
        Self::LanguageModelHead,
    ];

    /// Returns the zero-based stable catalog position.
    #[must_use]
    pub const fn index(self) -> usize {
        self as usize
    }

    /// Maps one legacy 18-step detail operation into the guided narrative.
    #[must_use]
    pub const fn for_detail_operation(index: usize) -> Option<Self> {
        if index < DETAIL_OPERATION_STAGES.len() {
            Some(DETAIL_OPERATION_STAGES[index])
        } else {
            None
        }
    }

    const fn from_index(index: usize) -> Self {
        if index < NARRATIVE_STAGE_COUNT {
            Self::ALL[index]
        } else {
            Self::LanguageModelHead
        }
    }
}

/// Exhaustive one-to-one assignment of the existing 18 detail-operation indices.
///
/// Embedding owns summary tensors and no legacy block operation. The legacy trace
/// combines masking and softmax at operation 7, so that boundary belongs to masking.
/// Softmax and the language-model head use dedicated traces instead of claiming a
/// duplicate detail index.
pub const DETAIL_OPERATION_STAGES: [NarrativeStage; 18] = [
    NarrativeStage::AttentionLayerNorm,
    NarrativeStage::AttentionLayerNorm,
    NarrativeStage::QueryKeyValue,
    NarrativeStage::QueryKeyValue,
    NarrativeStage::QueryKeyValue,
    NarrativeStage::AttentionScores,
    NarrativeStage::AttentionScores,
    NarrativeStage::CausalMask,
    NarrativeStage::ValueAggregation,
    NarrativeStage::ValueAggregation,
    NarrativeStage::ValueAggregation,
    NarrativeStage::ValueAggregation,
    NarrativeStage::MlpAndResidual,
    NarrativeStage::MlpAndResidual,
    NarrativeStage::MlpAndResidual,
    NarrativeStage::MlpAndResidual,
    NarrativeStage::MlpAndResidual,
    NarrativeStage::MlpAndResidual,
];

/// User-selected speed for the 250ms narrative clock.
#[derive(Debug, Clone, Copy, Default, PartialEq, Eq)]
pub enum NarrativeSpeed {
    /// Approximately 2.4 seconds per stage (ten ticks, 2.5 seconds).
    Half,
    /// Approximately 1.4 seconds per stage (six ticks, 1.5 seconds).
    #[default]
    Normal,
    /// Approximately 0.8 seconds per stage (three ticks, 0.75 seconds).
    Double,
}

impl NarrativeSpeed {
    const fn ticks_per_stage(self) -> usize {
        match self {
            Self::Half => 10,
            Self::Normal => 6,
            Self::Double => 3,
        }
    }
}

/// Bounded transport state for the nine guided stages.
#[derive(Debug, Clone, Copy, Default, PartialEq, Eq)]
pub struct NarrativePlayback {
    /// Currently selected narrative stage.
    pub stage: NarrativeStage,
    /// Whether timed playback is active.
    pub playing: bool,
    /// Selected playback rate.
    pub speed: NarrativeSpeed,
    ticks: usize,
}

impl NarrativePlayback {
    /// Selects the first stage and pauses.
    pub const fn first(&mut self) {
        self.stage = NarrativeStage::Embedding;
        self.pause();
    }

    /// Selects the previous stage, bounded at the start, and pauses.
    pub const fn previous(&mut self) {
        self.stage = NarrativeStage::from_index(self.stage.index().saturating_sub(1));
        self.pause();
    }

    /// Selects a stage and pauses.
    pub const fn select(&mut self, stage: NarrativeStage) {
        self.stage = stage;
        self.pause();
    }

    /// Selects the next stage, bounded at the end, and pauses.
    pub const fn next(&mut self) {
        self.stage = NarrativeStage::from_index(self.stage.index().saturating_add(1));
        self.pause();
    }

    /// Selects the final stage and pauses.
    pub const fn last(&mut self) {
        self.stage = NarrativeStage::LanguageModelHead;
        self.pause();
    }

    /// Starts or pauses playback, restarting from the beginning after completion.
    pub const fn toggle(&mut self) {
        if self.playing {
            self.pause();
        } else {
            if self.stage.index() == NARRATIVE_STAGE_COUNT - 1 {
                self.stage = NarrativeStage::Embedding;
            }
            self.playing = true;
            self.ticks = 0;
        }
    }

    /// Changes playback speed and resets the partial stage interval.
    pub const fn set_speed(&mut self, speed: NarrativeSpeed) {
        self.speed = speed;
        self.ticks = 0;
    }

    /// Advances one deterministic 250ms clock tick.
    pub const fn tick(&mut self) {
        if !self.playing {
            return;
        }
        self.ticks = self.ticks.saturating_add(1);
        if self.ticks < self.speed.ticks_per_stage() {
            return;
        }
        self.ticks = 0;
        if self.stage.index() == NARRATIVE_STAGE_COUNT - 1 {
            self.playing = false;
        } else {
            self.stage = NarrativeStage::from_index(self.stage.index() + 1);
        }
    }

    const fn pause(&mut self) {
        self.playing = false;
        self.ticks = 0;
    }
}
