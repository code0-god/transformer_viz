//! Pure deterministic final-logit sampling contracts.

use nanogpt_model::{SamplingError, sample_final_logits};
use nanogpt_schema::{GenerationConfig, SamplingMode, Temperature, TokenId, TopK};

fn config_for(mode: SamplingMode) -> GenerationConfig {
    GenerationConfig {
        mode,
        ..GenerationConfig::default()
    }
}

#[test]
fn greedy_selects_lowest_token_id_when_raw_logits_tie() -> Result<(), Box<dyn std::error::Error>> {
    // Given: two equal maximum raw logits.
    let logits = [0.5, 2.0, 2.0, -1.0];
    let config = GenerationConfig {
        temperature: Temperature::new(0.25)?,
        top_k: TopK::new(2)?,
        seed: 17,
        ..config_for(SamplingMode::Greedy)
    };
    // When: one final-position token is selected.
    let decision = sample_final_logits(&logits, &config, 0)?;
    // Then: greedy ignores sampling transforms and resolves ties by token ID.
    assert_eq!(decision.selected.token_id, TokenId(1));
    assert!((decision.selected.logit - 2.0).abs() < f32::EPSILON);
    assert_eq!(decision.random, None);
    assert_eq!(decision.interval, None);
    Ok(())
}

#[test]
fn sample_scales_logits_by_temperature_before_softmax() -> Result<(), Box<dyn std::error::Error>> {
    // Given: two logits and a temperature of one half.
    let logits = [2.0, 1.0];
    let config = GenerationConfig {
        temperature: Temperature::new(0.5)?,
        top_k: TopK::new(2)?,
        seed: 3,
        ..config_for(SamplingMode::Sample)
    };
    // When: the sampling distribution is constructed.
    let decision = sample_final_logits(&logits, &config, 0)?;
    // Then: probabilities equal softmax([4, 2]) while raw logits are retained.
    assert!((decision.candidates[0].probability - 0.880_797).abs() < 1e-6);
    assert!((decision.candidates[1].probability - 0.119_202_92).abs() < 1e-6);
    assert!((decision.candidates[0].logit - 2.0).abs() < f32::EPSILON);
    Ok(())
}

#[test]
fn sample_top_k_clamps_to_vocabulary_and_breaks_ties_by_token_id()
-> Result<(), Box<dyn std::error::Error>> {
    // Given: tied logits and Top-K larger than the vocabulary.
    let logits = [1.0, 3.0, 3.0];
    let config = GenerationConfig {
        top_k: TopK::new(99)?,
        seed: 4,
        ..config_for(SamplingMode::Sample)
    };
    // When: candidates are filtered and ordered.
    let decision = sample_final_logits(&logits, &config, 0)?;
    let ids = decision
        .candidates
        .iter()
        .map(|candidate| candidate.token_id)
        .collect::<Vec<_>>();
    // Then: all vocabulary entries remain, descending with stable token-ID ties.
    assert_eq!(ids, vec![TokenId(1), TokenId(2), TokenId(0)]);
    Ok(())
}

#[test]
fn sample_top_k_keeps_exactly_the_requested_candidates() -> Result<(), Box<dyn std::error::Error>> {
    // Given: four finite logits and Top-K two.
    let logits = [4.0, 1.0, 3.0, 2.0];
    let config = GenerationConfig {
        top_k: TopK::new(2)?,
        seed: 5,
        ..config_for(SamplingMode::Sample)
    };
    // When: the distribution is filtered.
    let decision = sample_final_logits(&logits, &config, 0)?;
    // Then: exactly the two highest logits participate.
    assert_eq!(decision.candidates.len(), 2);
    assert_eq!(decision.candidates[0].token_id, TokenId(0));
    assert_eq!(decision.candidates[1].token_id, TokenId(2));
    Ok(())
}

#[test]
fn stable_softmax_is_finite_and_sums_to_one_for_large_logits()
-> Result<(), Box<dyn std::error::Error>> {
    // Given: logits large enough to overflow an unshifted exponential.
    let logits = [10_000.0, 9_999.0, 9_998.0];
    let config = GenerationConfig {
        top_k: TopK::new(3)?,
        seed: 6,
        ..config_for(SamplingMode::Sample)
    };
    // When: stable softmax is applied.
    let decision = sample_final_logits(&logits, &config, 0)?;
    let sum = decision
        .candidates
        .iter()
        .map(|candidate| candidate.probability)
        .sum::<f32>();
    // Then: every probability is finite and normalized.
    assert!(
        decision
            .candidates
            .iter()
            .all(|candidate| candidate.probability.is_finite())
    );
    assert!((sum - 1.0).abs() < 1e-6);
    Ok(())
}

#[test]
fn same_seed_and_step_produce_the_same_sample_and_interval()
-> Result<(), Box<dyn std::error::Error>> {
    // Given: one seeded categorical distribution.
    let logits = [0.0, 0.0, 0.0, 0.0];
    let config = GenerationConfig {
        top_k: TopK::new(4)?,
        seed: 2026,
        ..config_for(SamplingMode::Sample)
    };
    // When: the same generation step is sampled twice.
    let first = sample_final_logits(&logits, &config, 7)?;
    let second = sample_final_logits(&logits, &config, 7)?;
    // Then: selection, random value, and cumulative interval are identical.
    assert_eq!(first.selected, second.selected);
    assert_eq!(first.random, second.random);
    assert_eq!(first.interval, second.interval);
    Ok(())
}

#[test]
fn different_seeds_always_select_valid_intervals() -> Result<(), Box<dyn std::error::Error>> {
    // Given: a non-uniform distribution and many distinct run seeds.
    let logits = [3.0, 2.0, 1.0];
    // When: each seed samples the first generation step.
    for seed in 0..256 {
        let decision = sample_final_logits(
            &logits,
            &GenerationConfig {
                top_k: TopK::new(3)?,
                seed,
                ..config_for(SamplingMode::Sample)
            },
            0,
        )?;
        let random = decision
            .random
            .ok_or("sample mode must expose randomness")?;
        let interval = decision
            .interval
            .ok_or("sample mode must expose its interval")?;
        // Then: every selection owns the sampled half-open cumulative interval.
        assert!((0.0..1.0).contains(&random));
        assert!(interval.start <= random);
        assert!(random < interval.end);
        assert!(decision.candidates.contains(&decision.selected));
    }
    Ok(())
}

#[test]
fn sampling_rejects_empty_and_non_finite_logits() -> Result<(), Box<dyn std::error::Error>> {
    // Given: an empty vocabulary and a vocabulary containing NaN.
    let config = GenerationConfig {
        top_k: TopK::new(1)?,
        seed: 8,
        ..config_for(SamplingMode::Sample)
    };
    // When: both invalid final-logit slices are sampled.
    let empty = sample_final_logits(&[], &config, 0);
    let non_finite = sample_final_logits(&[0.0, f32::NAN], &config, 0);
    // Then: typed errors identify the invalid model output.
    assert!(matches!(empty, Err(SamplingError::EmptyLogits)));
    assert!(matches!(
        non_finite,
        Err(SamplingError::NonFiniteLogit {
            token_id: TokenId(1)
        })
    ));
    Ok(())
}
