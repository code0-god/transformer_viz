use crate::{FiniteF32, LogitCandidate, SchemaError, TokenId, TokenInfo};
use serde::{Deserialize, Serialize};

/// Token-selection strategy for one generation step.
#[cfg_attr(feature = "typescript-bindings", derive(ts_rs::TS))]
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum SamplingMode {
    /// Select the lowest token ID among maximum raw logits.
    Greedy,
    /// Select from a deterministic seeded categorical distribution.
    Sample,
}

/// Positive finite softmax temperature.
#[cfg_attr(feature = "typescript-bindings", derive(ts_rs::TS))]
#[cfg_attr(feature = "typescript-bindings", ts(type = "number"))]
#[derive(Debug, Clone, Copy, PartialEq, PartialOrd, Serialize, Deserialize)]
#[serde(try_from = "f32", into = "f32")]
pub struct Temperature(f32);

impl Temperature {
    /// Creates a positive finite temperature.
    ///
    /// # Errors
    /// Returns [`SchemaError::InvalidTemperature`] for zero, negative, NaN, or infinity.
    pub const fn new(value: f32) -> Result<Self, SchemaError> {
        if value.is_finite() && value > 0.0 {
            Ok(Self(value))
        } else {
            Err(SchemaError::InvalidTemperature)
        }
    }

    /// Returns the positive finite value.
    #[must_use]
    pub const fn get(self) -> f32 {
        self.0
    }
}

impl TryFrom<f32> for Temperature {
    type Error = SchemaError;

    fn try_from(value: f32) -> Result<Self, Self::Error> {
        Self::new(value)
    }
}

impl From<Temperature> for f32 {
    fn from(value: Temperature) -> Self {
        value.0
    }
}

/// Non-zero count of candidates retained before softmax.
#[cfg_attr(feature = "typescript-bindings", derive(ts_rs::TS))]
#[cfg_attr(feature = "typescript-bindings", ts(type = "number"))]
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Serialize, Deserialize)]
#[serde(try_from = "usize", into = "usize")]
pub struct TopK(usize);

impl TopK {
    /// Creates a non-zero Top-K count.
    ///
    /// # Errors
    /// Returns [`SchemaError::ZeroValue`] when `value` is zero.
    pub const fn new(value: usize) -> Result<Self, SchemaError> {
        if value == 0 {
            Err(SchemaError::ZeroValue { field: "top_k" })
        } else {
            Ok(Self(value))
        }
    }

    /// Returns the candidate count.
    #[must_use]
    pub const fn get(self) -> usize {
        self.0
    }
}

impl TryFrom<usize> for TopK {
    type Error = SchemaError;

    fn try_from(value: usize) -> Result<Self, Self::Error> {
        Self::new(value)
    }
}

impl From<TopK> for usize {
    fn from(value: TopK) -> Self {
        value.0
    }
}

/// Controls deterministic autoregressive token generation.
#[cfg_attr(feature = "typescript-bindings", derive(ts_rs::TS))]
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct GenerationConfig {
    /// Maximum tokens appended after the prompt.
    pub max_new_tokens: usize,
    /// Softmax temperature used to construct the candidate distribution.
    pub temperature: Temperature,
    /// Maximum candidates retained before softmax.
    pub top_k: TopK,
    /// Token-selection strategy.
    pub mode: SamplingMode,
    /// Stable seed for the complete generation run.
    pub seed: u64,
}

impl Default for GenerationConfig {
    fn default() -> Self {
        Self {
            max_new_tokens: 24,
            temperature: Temperature(1.0),
            top_k: TopK(20),
            mode: SamplingMode::Sample,
            seed: 42,
        }
    }
}

/// Why an autoregressive generation stream terminated.
#[cfg_attr(feature = "typescript-bindings", derive(ts_rs::TS))]
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum GenerationStopReason {
    /// The configured generated-token count was reached.
    MaxNewTokens,
    /// The tokenizer EOS token was generated.
    EndOfSequence,
    /// The model context has no room for another forward pass.
    ContextLimit,
    /// The caller explicitly stopped the active request.
    UserStopped,
    /// A newer valid generation replaced this one.
    Replaced,
    /// Generation failed after it started.
    Error,
}

/// Half-open cumulative interval containing the deterministic sample draw.
#[cfg_attr(feature = "typescript-bindings", derive(ts_rs::TS))]
#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct CumulativeProbabilityInterval {
    /// Inclusive cumulative lower bound.
    pub start: FiniteF32,
    /// Exclusive cumulative upper bound.
    pub end: FiniteF32,
}

/// Compact visualization data for one committed autoregressive token.
#[cfg_attr(feature = "typescript-bindings", derive(ts_rs::TS))]
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct GenerationStepSummary {
    /// Zero-based generated-token index.
    pub index: usize,
    /// Full model context before selecting this token.
    pub context_token_ids: Vec<TokenId>,
    /// Selected token metadata.
    pub generated_token: TokenInfo,
    /// Selected raw model logit.
    pub selected_logit: FiniteF32,
    /// Selected probability after temperature and Top-K.
    pub selected_probability: FiniteF32,
    /// Retained candidates in deterministic sampling order.
    pub candidates: Vec<LogitCandidate>,
    /// Deterministic sample draw, absent in greedy mode.
    pub random: Option<FiniteF32>,
    /// Selected cumulative interval, absent in greedy mode.
    pub selected_interval: Option<CumulativeProbabilityInterval>,
    /// Full-context model-forward duration.
    pub forward_ms: FiniteF32,
    /// Final-logit sampling duration.
    pub sampling_ms: FiniteF32,
    /// Complete generation-step duration.
    pub total_ms: FiniteF32,
}
