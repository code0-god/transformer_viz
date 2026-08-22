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

fn full_stream(
    runtime: &mut WorkerRuntime,
    start: &crate::runtime_generation::GenerationStart,
) -> Result<Vec<nanogpt_schema::GenerationStepSummary>, RuntimeError> {
    let mut events = runtime.advance_generation(start.key)?;
    let mut steps = Vec::new();
    loop {
        let terminal = events
            .iter()
            .any(|event| matches!(event, WorkerResponse::GenerationFinished { .. }));
        let credit = events.iter().find_map(|event| match event {
            WorkerResponse::TokenGenerated {
                request_id,
                run_id,
                step,
            } => {
                steps.push(step.clone());
                Some((*request_id, *run_id, step.index))
            }
            _ => None,
        });
        if terminal {
            return Ok(steps);
        }
        let (request_id, run_id, step_index) = credit.ok_or(RuntimeError::InvalidSelector)?;
        events = runtime.continue_generation(request_id, run_id, step_index)?;
    }
}

#[test]
fn started_one_step_and_full_stream_append_context_deterministically() -> Result<(), RuntimeError> {
    // Given: two initialized runtimes with the same prompt and config.
    let mut first = initialized()?;
    let mut second = initialized()?;
    let expected_config = config(3)?;
    let first_start = first.start_generation(7, "cat", &expected_config)?;
    let second_start = second.start_generation(7, "cat", &expected_config)?;
    assert!(matches!(
        first_start.responses.as_slice(),
        [WorkerResponse::GenerationStarted {
            request_id: 7,
            prompt_tokens,
            config,
            context_limit: 24,
            ..
        }] if prompt_tokens.iter().map(|token| token.id).collect::<Vec<_>>() == [
            nanogpt_schema::TokenId(0),
            nanogpt_schema::TokenId(102),
            nanogpt_schema::TokenId(100),
            nanogpt_schema::TokenId(119),
        ] && config == &expected_config
    ));

    // When: both streams advance to completion through exact one-credit requests.
    let first_steps = full_stream(&mut first, &first_start)?;
    let second_steps = full_stream(&mut second, &second_start)?;

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
fn exact_continue_credit_is_single_use_contiguous_and_terminal_safe() -> Result<(), RuntimeError> {
    // Given: one active run after its initially authorized forward.
    let mut runtime = initialized()?;
    let start = runtime.start_generation(30, "cat", &config(3)?)?;
    let first = runtime.advance_generation(start.key)?;
    let (run_id, first_index) = match first.as_slice() {
        [WorkerResponse::TokenGenerated { run_id, step, .. }] => (*run_id, step.index),
        _ => return Err(RuntimeError::InvalidSelector),
    };

    // When/Then: stale identities and future indices cannot spend the credit.
    assert!(
        runtime
            .continue_generation(29, run_id, first_index)?
            .is_empty()
    );
    assert!(
        runtime
            .continue_generation(30, run_id + 1, first_index)?
            .is_empty()
    );
    assert!(
        runtime
            .continue_generation(30, run_id, first_index + 1)?
            .is_empty()
    );

    // The exact credit advances once; its duplicate is stale after the next step commits.
    let second = runtime.continue_generation(30, run_id, first_index)?;
    assert!(matches!(
        second.as_slice(),
        [WorkerResponse::TokenGenerated { step, .. }] if step.index == 1
    ));
    assert!(
        runtime
            .continue_generation(30, run_id, first_index)?
            .is_empty()
    );

    // The final exact credit emits token then terminal; all post-terminal credits no-op.
    let terminal = runtime.continue_generation(30, run_id, 1)?;
    assert!(matches!(
        terminal.as_slice(),
        [
            WorkerResponse::TokenGenerated { step, .. },
            WorkerResponse::GenerationFinished {
                reason: GenerationStopReason::MaxNewTokens,
                ..
            }
        ] if step.index == 2
    ));
    assert!(runtime.continue_generation(30, run_id, 2)?.is_empty());
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
    assert!(runtime.stop_generation(10, 999).is_none());
    assert!(matches!(
        runtime.continue_generation(10, 1, 0)?.as_slice(),
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
    assert!(runtime.stop_generation(10, 1).is_none());
    assert!(matches!(
        runtime.advance_generation(b.key)?.as_slice(),
        [WorkerResponse::TokenGenerated { .. }]
    ));
    assert!(matches!(
        runtime.stop_generation(12, 2),
        Some(WorkerResponse::GenerationFinished {
            reason: GenerationStopReason::UserStopped,
            ..
        })
    ));
    assert!(runtime.stop_generation(12, 2).is_none());
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
