use nanogpt_schema::{
    GenerationConfig, GenerationStopReason, SamplingMode, Temperature, TopK, WorkerResponse,
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

fn config(max_new_tokens: usize) -> Result<GenerationConfig, RuntimeError> {
    Ok(GenerationConfig {
        max_new_tokens,
        temperature: Temperature::new(1.0)?,
        top_k: TopK::new(20)?,
        mode: SamplingMode::Sample,
        seed: 42,
    })
}

#[test]
fn started_one_step_and_full_stream_append_context_deterministically() -> Result<(), RuntimeError> {
    // Given: two initialized runtimes with the same prompt and config.
    let mut first = initialized()?;
    let mut second = initialized()?;
    let first_start = first.start_generation(7, "cat", &config(3)?)?;
    let second_start = second.start_generation(7, "cat", &config(3)?)?;
    assert!(matches!(
        first_start.responses.as_slice(),
        [WorkerResponse::GenerationStarted { request_id: 7, .. }]
    ));

    // When: both streams advance to completion one forward at a time.
    let mut first_steps = Vec::new();
    let mut second_steps = Vec::new();
    loop {
        let events = first.advance_generation(first_start.key)?;
        let peer = second.advance_generation(second_start.key)?;
        for event in &events {
            if let WorkerResponse::TokenGenerated { step, .. } = event {
                first_steps.push(step.clone());
            }
        }
        for event in &peer {
            if let WorkerResponse::TokenGenerated { step, .. } = event {
                second_steps.push(step.clone());
            }
        }
        if events
            .iter()
            .any(|event| matches!(event, WorkerResponse::GenerationFinished { .. }))
        {
            break;
        }
    }

    // Then: prior generated IDs are appended in order and deterministic fields match.
    assert_eq!(first_steps.len(), 3);
    assert_eq!(
        first_steps[1].context_token_ids.last(),
        Some(&first_steps[0].generated_token.id)
    );
    assert_eq!(
        first_steps[2].context_token_ids.last(),
        Some(&first_steps[1].generated_token.id)
    );
    assert_eq!(
        first_steps[1].context_token_ids.len(),
        first_steps[0].context_token_ids.len() + 1
    );
    let first_ids: Vec<_> = first_steps
        .iter()
        .map(|step| step.generated_token.id)
        .collect();
    let second_ids: Vec<_> = second_steps
        .iter()
        .map(|step| step.generated_token.id)
        .collect();
    assert_eq!(first_ids, second_ids);
    for (first_step, second_step) in first_steps.iter().zip(&second_steps) {
        assert_eq!(first_step.selected_logit, second_step.selected_logit);
        assert_eq!(
            first_step.selected_probability,
            second_step.selected_probability
        );
        assert_eq!(first_step.candidates, second_step.candidates);
        assert_eq!(first_step.random, second_step.random);
        assert_eq!(first_step.selected_interval, second_step.selected_interval);
    }
    assert!(first_steps.iter().all(|step| !step.candidates.is_empty()));
    Ok(())
}

#[test]
fn max_tokens_stop_and_context_limit_are_terminal_after_committed_steps() -> Result<(), RuntimeError>
{
    // Given: a short generation and a prompt leaving one context slot.
    let mut runtime = initialized()?;
    let max_start = runtime.start_generation(1, "cat", &config(1)?)?;
    // When: one token is generated.
    let max_events = runtime.advance_generation(max_start.key)?;
    // Then: the token precedes the max-token terminal event.
    assert!(matches!(
        max_events.as_slice(),
        [
            WorkerResponse::TokenGenerated { .. },
            WorkerResponse::GenerationFinished {
                reason: GenerationStopReason::MaxNewTokens,
                ..
            }
        ]
    ));

    let context_config = GenerationConfig {
        seed: 5,
        ..config(3)?
    };
    let context_start = runtime.start_generation(2, &"x".repeat(22), &context_config)?;
    let context_events = runtime.advance_generation(context_start.key)?;
    assert!(
        matches!(
            context_events.as_slice(),
            [
                WorkerResponse::TokenGenerated { step, .. },
                WorkerResponse::GenerationFinished {
                    reason: GenerationStopReason::ContextLimit,
                    ..
                }
            ] if step.context_token_ids.len() == 23
        ),
        "{context_events:?}"
    );
    Ok(())
}

#[test]
fn generated_eos_is_emitted_before_end_of_sequence() -> Result<(), RuntimeError> {
    // Given: a fixture context whose deterministic sample is EOS.
    let mut runtime = initialized()?;
    let start = runtime.start_generation(3, &"x".repeat(22), &config(3)?)?;
    // When: the final available context position advances once.
    let events = runtime.advance_generation(start.key)?;
    // Then: EOS is visible as a token step before its terminal reason.
    assert!(matches!(
        events.as_slice(),
        [
            WorkerResponse::TokenGenerated { step, .. },
            WorkerResponse::GenerationFinished {
                reason: GenerationStopReason::EndOfSequence,
                ..
            }
        ] if step.generated_token.kind == nanogpt_schema::TokenKind::Eos
    ));
    Ok(())
}

#[test]
fn stop_replacement_stale_key_and_invalid_replacement_preserve_state() -> Result<(), RuntimeError> {
    // Given: active generation A with one completed step.
    let mut runtime = initialized()?;
    let a = runtime.start_generation(10, "cat", &config(4)?)?;
    let _step = runtime.advance_generation(a.key)?;

    // When: invalid B is attempted, then valid B replaces A.
    assert!(runtime.start_generation(11, "", &config(4)?).is_err());
    assert!(matches!(
        runtime.advance_generation(a.key)?.as_slice(),
        [WorkerResponse::TokenGenerated { .. }]
    ));
    let b = runtime.start_generation(12, "dog", &config(4)?)?;

    // Then: replacement ordering is exact; stale A and stale stop are no-ops, active B stops once.
    assert!(matches!(
        b.responses.as_slice(),
        [
            WorkerResponse::GenerationFinished {
                request_id: 10,
                reason: GenerationStopReason::Replaced,
                ..
            },
            WorkerResponse::GenerationStarted { request_id: 12, .. }
        ]
    ));
    assert!(runtime.advance_generation(a.key)?.is_empty());
    assert!(runtime.stop_generation(10).is_none());
    assert!(matches!(
        runtime.advance_generation(b.key)?.as_slice(),
        [WorkerResponse::TokenGenerated { .. }]
    ));
    assert!(matches!(
        runtime.stop_generation(12),
        Some(WorkerResponse::GenerationFinished {
            reason: GenerationStopReason::UserStopped,
            ..
        })
    ));
    assert!(runtime.stop_generation(12).is_none());
    Ok(())
}

#[test]
fn generation_failure_emits_one_error_terminal_and_deactivates_key() -> Result<(), RuntimeError> {
    // Given: one active generation key correlated to its request.
    let mut runtime = initialized()?;
    let start = runtime.start_generation(21, "cat", &config(3)?)?;
    assert_eq!(start.key.request_id(), 21);
    // When: the Worker marks the generation failed twice.
    let first = runtime.fail_generation(start.key);
    let second = runtime.fail_generation(start.key);
    // Then: only the first transition emits the Error terminal and the key stays stale.
    assert!(matches!(
        first,
        Some(WorkerResponse::GenerationFinished {
            request_id: 21,
            reason: GenerationStopReason::Error,
            ..
        })
    ));
    assert!(second.is_none());
    assert!(runtime.advance_generation(start.key)?.is_empty());
    Ok(())
}

#[test]
fn compact_summary_serialization_contains_no_trace_tensors()
-> Result<(), Box<dyn std::error::Error>> {
    // Given: one generated compact step.
    let mut runtime = initialized()?;
    let start = runtime.start_generation(1, "cat", &config(1)?)?;
    let events = runtime.advance_generation(start.key)?;
    // When: the token event is serialized.
    let json = serde_json::to_string(&events[0])?;
    // Then: no guided trace tensor payload leaks into streaming generation.
    for forbidden in [
        "embeddings",
        "query",
        "key",
        "value",
        "tensor",
        "run_summary",
    ] {
        assert!(!json.contains(forbidden));
    }
    Ok(())
}
