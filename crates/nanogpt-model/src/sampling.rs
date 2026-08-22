use nanogpt_schema::{GenerationConfig, SamplingMode, TokenId};
use thiserror::Error;

use crate::TopKCandidate;

/// Half-open cumulative probability interval used for categorical selection.
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct SamplingInterval {
    /// Inclusive lower cumulative bound.
    pub start: f32,
    /// Exclusive upper cumulative bound.
    pub end: f32,
}

/// Complete deterministic decision for one final-position logit vector.
#[derive(Debug, Clone, PartialEq)]
pub struct SamplingDecision {
    /// Selected candidate including its raw logit and transformed probability.
    pub selected: TopKCandidate,
    /// Uniform value in `[0, 1)` for sample mode, absent for greedy mode.
    pub random: Option<f32>,
    /// Selected cumulative interval for sample mode, absent for greedy mode.
    pub interval: Option<SamplingInterval>,
    /// Retained candidates ordered by descending raw logit and ascending token ID on ties.
    pub candidates: Vec<TopKCandidate>,
}

/// Invalid final-position logits or sampling distribution.
#[derive(Debug, Error, PartialEq, Eq)]
#[non_exhaustive]
pub enum SamplingError {
    /// The model produced no vocabulary logits.
    #[error("final-position logits must contain at least one token")]
    EmptyLogits,
    /// A model logit was NaN or infinite.
    #[error("logit for token {token_id:?} must be finite")]
    NonFiniteLogit {
        /// Token with the invalid logit.
        token_id: TokenId,
    },
    /// A vocabulary position cannot be represented by the shared token ID.
    #[error("vocabulary exceeds supported u32 token IDs")]
    VocabularyTooLarge,
}

/// Selects one token from a final-position raw-logit slice.
///
/// Sample mode applies temperature, stable Top-K, stable softmax, and a derived
/// `SplitMix64` draw. Greedy mode selects the raw-logit argmax and does not draw.
///
/// # Errors
/// Returns [`SamplingError`] for empty, non-finite, or unrepresentable logits.
pub fn sample_final_logits(
    logits: &[f32],
    config: &GenerationConfig,
    step_index: u64,
) -> Result<SamplingDecision, SamplingError> {
    if logits.is_empty() {
        return Err(SamplingError::EmptyLogits);
    }

    let mut candidates = Vec::with_capacity(logits.len());
    for (index, &logit) in logits.iter().enumerate() {
        let token_id =
            TokenId(u32::try_from(index).map_err(|_| SamplingError::VocabularyTooLarge)?);
        if !logit.is_finite() {
            return Err(SamplingError::NonFiniteLogit { token_id });
        }
        candidates.push(TopKCandidate {
            token_id,
            logit,
            probability: 0.0,
        });
    }
    candidates.sort_by(|left, right| {
        right
            .logit
            .total_cmp(&left.logit)
            .then_with(|| left.token_id.0.cmp(&right.token_id.0))
    });
    candidates.truncate(config.top_k.get().min(candidates.len()));

    let maximum = candidates[0].logit;
    let temperature = config.temperature.get();
    let mut normalizer = 0.0_f32;
    for candidate in &mut candidates {
        candidate.probability = ((candidate.logit - maximum) / temperature).exp();
        normalizer += candidate.probability;
    }
    for candidate in &mut candidates {
        candidate.probability /= normalizer;
    }

    match config.mode {
        SamplingMode::Greedy => Ok(SamplingDecision {
            selected: candidates[0],
            random: None,
            interval: None,
            candidates,
        }),
        SamplingMode::Sample => {
            let bytes = splitmix64(derive_step_seed(config.seed, step_index)).to_be_bytes();
            let upper = u32::from_be_bytes([bytes[0], bytes[1], bytes[2], bytes[3]]);
            let random = f32::from_bits(0x3F80_0000 | (upper >> 9)) - 1.0;
            let Some(last_candidate) = candidates.last().copied() else {
                return Err(SamplingError::EmptyLogits);
            };
            let mut start = 0.0_f32;
            for candidate in candidates.iter().copied().take(candidates.len() - 1) {
                let end = start + candidate.probability;
                if random < end {
                    return Ok(SamplingDecision {
                        selected: candidate,
                        random: Some(random),
                        interval: Some(SamplingInterval { start, end }),
                        candidates,
                    });
                }
                start = end;
            }
            Ok(SamplingDecision {
                selected: last_candidate,
                random: Some(random),
                interval: Some(SamplingInterval { start, end: 1.0 }),
                candidates,
            })
        }
    }
}

/// Derives a stable independent seed for one generation step.
#[must_use]
pub const fn derive_step_seed(run_seed: u64, step_index: u64) -> u64 {
    splitmix64(run_seed.wrapping_add(step_index.wrapping_mul(0x9E37_79B9_7F4A_7C15)))
}

const fn splitmix64(value: u64) -> u64 {
    let mut mixed = value.wrapping_add(0x9E37_79B9_7F4A_7C15);
    mixed = (mixed ^ (mixed >> 30)).wrapping_mul(0xBF58_476D_1CE4_E5B9);
    mixed = (mixed ^ (mixed >> 27)).wrapping_mul(0x94D0_49BB_1331_11EB);
    mixed ^ (mixed >> 31)
}
