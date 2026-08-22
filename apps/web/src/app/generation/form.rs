//! Browser generation form parsing and clamping.

use nanogpt_schema::{GenerationConfig, SamplingMode, SchemaError, Temperature, TopK};

/// Editable generation settings at the browser trust boundary.
#[derive(Debug, Clone, PartialEq, Eq)]
pub(crate) struct GenerationForm {
    pub(crate) max_new_tokens: String,
    pub(crate) temperature: String,
    pub(crate) top_k: String,
    pub(crate) mode: SamplingMode,
    pub(crate) seed: String,
}

impl Default for GenerationForm {
    fn default() -> Self {
        Self {
            max_new_tokens: "24".to_owned(),
            temperature: "1.0".to_owned(),
            top_k: "20".to_owned(),
            mode: SamplingMode::Sample,
            seed: "42".to_owned(),
        }
    }
}

impl GenerationForm {
    /// Parses and clamps browser form text against loaded model limits.
    ///
    /// # Errors
    /// Returns a schema error only if the clamped constants become invalid.
    pub(crate) fn parse(
        &self,
        block_size: usize,
        vocab_size: usize,
    ) -> Result<GenerationConfig, SchemaError> {
        let max_new_tokens = self
            .max_new_tokens
            .parse::<usize>()
            .unwrap_or(24)
            .clamp(1, block_size.max(1));
        let temperature = self
            .temperature
            .parse::<f32>()
            .unwrap_or(1.0)
            .clamp(0.1, 2.0);
        let top_k = self
            .top_k
            .parse::<usize>()
            .unwrap_or(20)
            .clamp(1, vocab_size.max(1));
        Ok(GenerationConfig {
            max_new_tokens,
            temperature: Temperature::new(temperature)?,
            top_k: TopK::new(top_k)?,
            mode: self.mode,
            seed: self.seed.parse::<u64>().unwrap_or(42),
        })
    }
}
