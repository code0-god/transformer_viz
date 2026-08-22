//! Canonical grouped Guided curriculum and deterministic browser transport.

mod evidence;
pub use evidence::{EvidenceView, PredictionCandidateMetric};

/// Number of concepts in the canonical curriculum.
pub const NARRATIVE_STAGE_COUNT: usize = 21;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
/// A named curriculum part used by the grouped rail.
pub enum CurriculumGroup {
    /// Input token and embedding concepts.
    InputRepresentation,
    /// Attention and MLP block concepts.
    TransformerBlock,
    /// Final normalization and vocabulary prediction concepts.
    Prediction,
    /// Autoregressive token-generation concepts.
    Generation,
}

impl CurriculumGroup {
    /// Exact stable order consumed by transport and presentation.
    pub const ALL: [Self; 4] = [
        Self::InputRepresentation,
        Self::TransformerBlock,
        Self::Prediction,
        Self::Generation,
    ];

    /// Human-readable group heading.
    #[must_use]
    pub const fn label(self) -> &'static str {
        match self {
            Self::InputRepresentation => "Input representation",
            Self::TransformerBlock => "Transformer Block",
            Self::Prediction => "Prediction",
            Self::Generation => "Generation",
        }
    }

    /// Returns the stable DOM key for this curriculum group.
    #[must_use]
    pub const fn slug(self) -> &'static str {
        match self {
            Self::InputRepresentation => "input",
            Self::TransformerBlock => "transformer",
            Self::Prediction => "prediction",
            Self::Generation => "generation",
        }
    }

    /// Returns the first concept selected when a collapsed group is activated.
    #[must_use]
    pub const fn first_stage(self) -> NarrativeStage {
        match self {
            Self::InputRepresentation => NarrativeStage::Tokenization,
            Self::TransformerBlock => NarrativeStage::LayerNorm,
            Self::Prediction => NarrativeStage::FinalLayerNorm,
            Self::Generation => NarrativeStage::Temperature,
        }
    }
}

#[derive(Debug, Clone, Copy, Default, PartialEq, Eq, Hash)]
#[repr(u8)]
/// One canonical Guided curriculum concept.
pub enum NarrativeStage {
    #[default]
    /// Tokenizer ID boundary before vector lookup.
    Tokenization,
    /// Learned token-vector lookup.
    TokenEmbedding,
    /// Learned position-vector addition.
    PositionEmbedding,
    /// Pre-attention normalization.
    LayerNorm,
    /// Query, key, and value projections.
    QueryKeyValue,
    /// Scaled query-key relevance score.
    AttentionScore,
    /// Future-position exclusion.
    CausalMask,
    /// Attention probability normalization.
    Softmax,
    /// Probability-weighted value sum.
    ValueAggregation,
    /// Attention residual addition.
    Residual,
    /// Token-wise nonlinear MLP transform.
    Mlp,
    /// MLP residual result passed to the next block.
    BlockOutput,
    /// Final residual-stream normalization.
    FinalLayerNorm,
    /// Tied embedding projection into vocabulary space.
    LanguageModelHead,
    /// Raw vocabulary prediction scores.
    Logits,
    /// Generation-logit temperature scaling.
    Temperature,
    /// Generation candidate filtering.
    TopK,
    /// Generation probability and selection policy.
    Sampling,
    /// Exact selected token identity.
    GeneratedToken,
    /// Selected-token context append.
    AppendToContext,
    /// Full-context forward repetition.
    Repeat,
}

impl NarrativeStage {
    /// Exact stable order consumed by transport and presentation.
    pub const ALL: [Self; NARRATIVE_STAGE_COUNT] = [
        Self::Tokenization,
        Self::TokenEmbedding,
        Self::PositionEmbedding,
        Self::LayerNorm,
        Self::QueryKeyValue,
        Self::AttentionScore,
        Self::CausalMask,
        Self::Softmax,
        Self::ValueAggregation,
        Self::Residual,
        Self::Mlp,
        Self::BlockOutput,
        Self::FinalLayerNorm,
        Self::LanguageModelHead,
        Self::Logits,
        Self::Temperature,
        Self::TopK,
        Self::Sampling,
        Self::GeneratedToken,
        Self::AppendToContext,
        Self::Repeat,
    ];

    #[must_use]
    /// Zero-based position in the canonical catalog.
    pub const fn index(self) -> usize {
        self as usize
    }

    #[must_use]
    /// Curriculum part containing this concept.
    pub const fn group(self) -> CurriculumGroup {
        match self {
            Self::Tokenization | Self::TokenEmbedding | Self::PositionEmbedding => {
                CurriculumGroup::InputRepresentation
            }
            Self::LayerNorm
            | Self::QueryKeyValue
            | Self::AttentionScore
            | Self::CausalMask
            | Self::Softmax
            | Self::ValueAggregation
            | Self::Residual
            | Self::Mlp
            | Self::BlockOutput => CurriculumGroup::TransformerBlock,
            Self::FinalLayerNorm | Self::LanguageModelHead | Self::Logits => {
                CurriculumGroup::Prediction
            }
            Self::Temperature
            | Self::TopK
            | Self::Sampling
            | Self::GeneratedToken
            | Self::AppendToContext
            | Self::Repeat => CurriculumGroup::Generation,
        }
    }

    #[must_use]
    /// Legacy 18-operation owner, when the index is valid.
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
            Self::Repeat
        }
    }
}

/// Compatibility assignment for the isolated legacy 18-operation trace.
pub const DETAIL_OPERATION_STAGES: [NarrativeStage; 18] = [
    NarrativeStage::LayerNorm,
    NarrativeStage::LayerNorm,
    NarrativeStage::QueryKeyValue,
    NarrativeStage::QueryKeyValue,
    NarrativeStage::QueryKeyValue,
    NarrativeStage::AttentionScore,
    NarrativeStage::AttentionScore,
    NarrativeStage::Softmax,
    NarrativeStage::ValueAggregation,
    NarrativeStage::ValueAggregation,
    NarrativeStage::ValueAggregation,
    NarrativeStage::Residual,
    NarrativeStage::Mlp,
    NarrativeStage::Mlp,
    NarrativeStage::Mlp,
    NarrativeStage::Mlp,
    NarrativeStage::BlockOutput,
    NarrativeStage::BlockOutput,
];

#[derive(Debug, Clone, Copy, Default, PartialEq, Eq)]
/// User-selected deterministic curriculum playback rate.
pub enum NarrativeSpeed {
    /// Half-speed playback interval.
    Half,
    #[default]
    /// Normal playback interval.
    Normal,
    /// Double-speed playback interval.
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

#[derive(Debug, Clone, Copy, Default, PartialEq, Eq)]
/// Bounded cursor and deterministic autoplay state.
pub struct NarrativePlayback {
    /// Currently selected curriculum concept.
    pub stage: NarrativeStage,
    /// Whether deterministic autoplay is active.
    pub playing: bool,
    /// Current autoplay rate.
    pub speed: NarrativeSpeed,
    ticks: usize,
}

impl NarrativePlayback {
    /// Moves backward one concept and pauses.
    pub const fn previous(&mut self) {
        self.stage = NarrativeStage::from_index(self.stage.index().saturating_sub(1));
        self.pause();
    }
    /// Selects an exact concept and pauses.
    pub const fn select(&mut self, stage: NarrativeStage) {
        self.stage = stage;
        self.pause();
    }
    /// Moves forward one concept and pauses.
    pub const fn next(&mut self) {
        self.stage = NarrativeStage::from_index(self.stage.index().saturating_add(1));
        self.pause();
    }
    /// Selects Repeat and pauses.
    pub const fn last(&mut self) {
        self.stage = NarrativeStage::Repeat;
        self.pause();
    }
    /// Starts or pauses deterministic autoplay.
    pub const fn toggle(&mut self) {
        if self.playing {
            self.pause();
        } else {
            self.playing = true;
            self.ticks = 0;
        }
    }
    /// Changes rate and resets the partial interval.
    pub const fn set_speed(&mut self, speed: NarrativeSpeed) {
        self.speed = speed;
        self.ticks = 0;
    }
    /// Advances one deterministic 250 ms clock tick.
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
