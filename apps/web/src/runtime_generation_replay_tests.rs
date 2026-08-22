use nanogpt_schema::{
    GenerationConfig, GenerationStepSummary, SamplingMode, Temperature, TopK, WorkerRequest,
    WorkerResponse,
};

use super::{AssetBundle, RuntimeError, WorkerRuntime};

fn assets() -> AssetBundle {
    AssetBundle {
        manifest: include_str!("../public/models/edu/manifest.json").to_owned(),
        config: include_str!("../public/models/edu/config.json").to_owned(),
        tokenizer: include_str!("../public/models/edu/tokenizer.json").to_owned(),
        weights: include_bytes!("../public/models/edu/model.safetensors").to_vec(),
    }
}

fn initialized() -> Result<WorkerRuntime, RuntimeError> {
    let mut runtime = WorkerRuntime::default();
    runtime.initialize(&assets())?;
    Ok(runtime)
}

fn config() -> Result<GenerationConfig, RuntimeError> {
    Ok(GenerationConfig {
        max_new_tokens: 4,
        temperature: Temperature::new(1.0)?,
        top_k: TopK::new(20)?,
        mode: SamplingMode::Sample,
        seed: 42,
    })
}

fn generated_step(events: &[WorkerResponse]) -> Result<GenerationStepSummary, RuntimeError> {
    events
        .iter()
        .find_map(|event| match event {
            WorkerResponse::TokenGenerated { step, .. } => Some(step.clone()),
            _ => None,
        })
        .ok_or(RuntimeError::InvalidSelector)
}

fn assert_generation_equal(left: &GenerationStepSummary, right: &GenerationStepSummary) {
    assert_eq!(left.index, right.index);
    assert_eq!(left.context_token_ids, right.context_token_ids);
    assert_eq!(left.generated_token, right.generated_token);
    assert_eq!(left.selected_logit, right.selected_logit);
    assert_eq!(left.selected_probability, right.selected_probability);
    assert_eq!(left.candidates, right.candidates);
    assert_eq!(left.random, right.random);
    assert_eq!(left.selected_interval, right.selected_interval);
}

fn assert_selected_replay(
    summary: &nanogpt_schema::RunSummary,
    original: &GenerationStepSummary,
) -> Result<(), RuntimeError> {
    let replayed = summary
        .logits
        .top_k
        .iter()
        .find(|candidate| candidate.token_id == original.generated_token.id)
        .ok_or(RuntimeError::GenerationReplayMismatch)?;
    assert_eq!(replayed.token_id, original.generated_token.id);
    assert!((replayed.logit.get() - original.selected_logit.get()).abs() <= 1e-4);
    Ok(())
}

#[test]
fn selected_step_replay_is_exact_inspectable_and_generation_neutral() -> Result<(), RuntimeError> {
    // Given: peer generation runtimes advanced through two identical committed steps.
    let mut runtime = initialized()?;
    let mut peer = initialized()?;
    let start = runtime.start_generation(7, "cat", &config()?)?;
    let peer_start = peer.start_generation(7, "cat", &config()?)?;
    let generation_run_id = match start.responses.as_slice() {
        [WorkerResponse::GenerationStarted { run_id, .. }] => *run_id,
        _ => return Err(RuntimeError::InvalidSelector),
    };
    let original = generated_step(&runtime.advance_generation(start.key)?)?;
    let peer_original = generated_step(&peer.advance_generation(peer_start.key)?)?;
    assert_generation_equal(&original, &peer_original);
    let second =
        generated_step(&runtime.continue_generation(7, generation_run_id, original.index)?)?;
    let peer_second =
        generated_step(&peer.continue_generation(7, generation_run_id, peer_original.index)?)?;
    assert_generation_equal(&second, &peer_second);

    // When: step zero is replayed through its generation ID and historical index.
    let response = runtime.handle(WorkerRequest::InspectGenerationStep {
        request_id: 99,
        generation_run_id,
        step_index: 0,
    })?;
    let WorkerResponse::GenerationStepTrace {
        request_id,
        generation_run_id: response_generation_id,
        step_index,
        step,
        summary,
    } = response
    else {
        return Err(RuntimeError::InvalidSelector);
    };

    // Then: the historical step is unchanged and the fresh summary uses its exact context.
    assert_eq!(request_id, 99);
    assert_eq!(response_generation_id, generation_run_id);
    assert_eq!(step_index, 0);
    assert_generation_equal(&step, &original);
    let replay_ids = summary
        .tokens
        .iter()
        .map(|token| token.id)
        .collect::<Vec<_>>();
    assert_eq!(replay_ids, original.context_token_ids);
    assert_ne!(summary.run_id, generation_run_id);
    assert_eq!(summary.logits.top_k.len(), original.candidates.len());
    assert_eq!(
        summary.logits.logits.values.len(),
        original.candidates.len()
    );
    let mut maximum_logit_delta = 0.0_f32;
    for ((replayed, raw_logit), historical) in summary
        .logits
        .top_k
        .iter()
        .zip(&summary.logits.logits.values)
        .zip(&original.candidates)
    {
        assert_eq!(replayed.token_id, historical.token_id);
        let tolerance = 1e-4_f32;
        let candidate_delta = (replayed.logit.get() - historical.logit.get()).abs();
        let raw_delta = (raw_logit.get() - historical.logit.get()).abs();
        maximum_logit_delta = maximum_logit_delta.max(candidate_delta).max(raw_delta);
        assert!(candidate_delta <= tolerance);
        assert!(raw_delta <= tolerance);
    }
    assert_selected_replay(&summary, &original)?;
    assert!(maximum_logit_delta <= 1e-4);

    // And: the fresh trace cache drives every existing detail replay.
    assert!(matches!(
        runtime.handle(WorkerRequest::InspectBlock {
            request_id: 100,
            run_id: summary.run_id,
            layer: 0,
        }),
        Ok(WorkerResponse::BlockTrace { .. })
    ));
    assert!(matches!(
        runtime.handle(WorkerRequest::InspectAttentionHead {
            request_id: 101,
            run_id: summary.run_id,
            layer: 0,
            head: 0,
        }),
        Ok(WorkerResponse::AttentionHeadTrace { .. })
    ));
    assert!(matches!(
        runtime.handle(WorkerRequest::InspectToken {
            request_id: 102,
            run_id: summary.run_id,
            layer: 0,
            head: 0,
            token: 0,
        }),
        Ok(WorkerResponse::TokenTrace { .. })
    ));

    // And: replay neither appends nor resamples; both peers continue identically.
    let next = generated_step(&runtime.continue_generation(7, generation_run_id, second.index)?)?;
    let peer_next =
        generated_step(&peer.continue_generation(7, generation_run_id, peer_second.index)?)?;
    assert_generation_equal(&next, &peer_next);
    assert_eq!(next.index, 2);
    Ok(())
}

#[test]
fn replay_mismatch_preserves_previous_trace_cache() -> Result<(), RuntimeError> {
    // Given: an inspectable run cache and one deliberately corrupted stored generation candidate.
    let mut runtime = initialized()?;
    let previous = runtime.handle(WorkerRequest::Run {
        request_id: 1,
        text: "dog".to_owned(),
    })?;
    let WorkerResponse::RunComplete { summary, .. } = previous else {
        return Err(RuntimeError::InvalidSelector);
    };
    let previous_run_id = summary.run_id;
    let start = runtime.start_generation(7, "cat", &config()?)?;
    let generation_run_id = match start.responses.as_slice() {
        [WorkerResponse::GenerationStarted { run_id, .. }] => *run_id,
        _ => return Err(RuntimeError::InvalidSelector),
    };
    let _events = runtime.advance_generation(start.key)?;
    runtime.corrupt_first_generation_candidate()?;

    // When: replay parity validation detects the historical mismatch.
    let replay = runtime.handle(WorkerRequest::InspectGenerationStep {
        request_id: 8,
        generation_run_id,
        step_index: 0,
    });

    // Then: the mismatch is typed and the previous detail cache remains committed.
    assert!(matches!(
        replay,
        Err(RuntimeError::GenerationReplayMismatch)
    ));
    assert!(matches!(
        runtime.handle(WorkerRequest::InspectBlock {
            request_id: 9,
            run_id: previous_run_id,
            layer: 0,
        }),
        Ok(WorkerResponse::BlockTrace { .. })
    ));
    Ok(())
}

#[test]
fn selected_step_replay_rejects_stale_generation_and_invalid_index() -> Result<(), RuntimeError> {
    // Given: one current generation with one stored step.
    let mut runtime = initialized()?;
    let start = runtime.start_generation(7, "cat", &config()?)?;
    let generation_run_id = match start.responses.as_slice() {
        [WorkerResponse::GenerationStarted { run_id, .. }] => *run_id,
        _ => return Err(RuntimeError::InvalidSelector),
    };
    let _events = runtime.advance_generation(start.key)?;

    // When: a stale generation ID and an out-of-range step are requested.
    let stale = runtime.handle(WorkerRequest::InspectGenerationStep {
        request_id: 8,
        generation_run_id: generation_run_id.saturating_add(100),
        step_index: 0,
    });
    let invalid = runtime.handle(WorkerRequest::InspectGenerationStep {
        request_id: 9,
        generation_run_id,
        step_index: 1,
    });

    // Then: both failures remain typed and distinct.
    assert!(matches!(stale, Err(RuntimeError::StaleRun)));
    assert!(matches!(invalid, Err(RuntimeError::InvalidSelector)));
    Ok(())
}
