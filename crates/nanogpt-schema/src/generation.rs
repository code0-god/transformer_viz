use crate::SchemaError;
use serde::{Deserialize, Serialize};

/// Token-selection strategy for one generation step.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum SamplingMode {
    /// Select the lowest token ID among maximum raw logits.
    Greedy,
    /// Select from a deterministic seeded categorical distribution.
    Sample,
}

/// Positive finite softmax temperature.
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
