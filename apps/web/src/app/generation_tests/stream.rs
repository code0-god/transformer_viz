use super::*;

#[test]
fn stream_requires_latest_ids_and_contiguous_indices() -> TestResult {
    // Given: matching active request/run.
    let mut state = AppState::default();
    let request = state.begin_generation("the cat", config()?);
    let WorkerRequest::Generate { request_id, .. } = request else {
        return Err(io::Error::other("expected generate").into());
    };
    state.apply(started(request_id, 20)?)?;

    // When: stale, out-of-order, valid, duplicate, then valid events arrive.
    for (event_request, event_run, index) in [
        (request_id - 1, 20, 0),
        (request_id, 99, 0),
        (request_id, 20, 1),
        (request_id, 20, 0),
        (request_id, 20, 0),
        (request_id, 20, 1),
    ] {
        state.apply(WorkerResponse::TokenGenerated {
            request_id: event_request,
            run_id: event_run,
            step: step(index, &[b'a' + u8::try_from(index).unwrap_or(u8::MAX)])?,
        })?;
    }
    state.apply(WorkerResponse::GenerationFinished {
        request_id,
        run_id: 20,
        reason: GenerationStopReason::MaxNewTokens,
    })?;

    // Then: only contiguous exact chunks commit, in order, with typed terminal state.
    assert_eq!(
        state
            .generation
            .steps
            .iter()
            .map(|item| item.index)
            .collect::<Vec<_>>(),
        [0, 1]
    );
    assert_eq!(state.generation.decoded_continuation(), "ab");
    assert_eq!(
        state.generation.phase,
        GenerationPhase::Finished(GenerationStopReason::MaxNewTokens)
    );
    Ok(())
}

#[test]
fn only_exact_contiguous_token_response_returns_one_continue_credit() -> TestResult {
    // Given: one active generation awaiting its first token.
    let mut state = AppState::default();
    let request = state.begin_generation("x", config()?);
    let WorkerRequest::Generate { request_id, .. } = request else {
        return Err(io::Error::other("expected generate").into());
    };
    state.apply(started(request_id, 25)?)?;

    // When/Then: stale request/run and future responses produce no credit.
    for (event_request, event_run, index) in [
        (request_id + 1, 25, 0),
        (request_id, 26, 0),
        (request_id, 25, 1),
    ] {
        assert!(
            state
                .apply(WorkerResponse::TokenGenerated {
                    request_id: event_request,
                    run_id: event_run,
                    step: step(index, b"x")?,
                })?
                .is_empty()
        );
    }

    // An exact contiguous response commits once and returns its exact one-credit request.
    assert_eq!(
        state.apply(WorkerResponse::TokenGenerated {
            request_id,
            run_id: 25,
            step: step(0, b"x")?,
        })?,
        vec![WorkerRequest::ContinueGeneration {
            request_id,
            run_id: 25,
            step_index: 0,
        }]
    );
    assert!(
        state
            .apply(WorkerResponse::TokenGenerated {
                request_id,
                run_id: 25,
                step: step(0, b"x")?,
            })?
            .is_empty()
    );

    // Terminal and Error responses never create additional continuation credit.
    assert!(
        state
            .apply(WorkerResponse::GenerationFinished {
                request_id,
                run_id: 25,
                reason: GenerationStopReason::UserStopped,
            })?
            .is_empty()
    );
    assert!(
        state
            .apply(WorkerResponse::Error {
                request_id: Some(request_id),
                code: WorkerErrorCode::Inference,
                message: "failed".to_owned(),
            })?
            .is_empty()
    );
    Ok(())
}

#[test]
fn decoded_continuation_concatenates_piece_bytes_once() -> TestResult {
    // Given: a UTF-8 scalar split across two generated token pieces.
    let mut state = AppState::default();
    let request = state.begin_generation("x", config()?);
    let WorkerRequest::Generate { request_id, .. } = request else {
        return Err(io::Error::other("expected generate").into());
    };
    state.apply(started(request_id, 30)?)?;

    // When: both byte pieces stream.
    state.apply(WorkerResponse::TokenGenerated {
        request_id,
        run_id: 30,
        step: step(0, &[0xC3])?,
    })?;
    state.apply(WorkerResponse::TokenGenerated {
        request_id,
        run_id: 30,
        step: step(1, &[0xA9])?,
    })?;

    // Then: one lossy decode after concatenation preserves the scalar.
    assert_eq!(state.generation.decoded_continuation(), "é");
    assert_eq!(state.generation.prompt_tokens.len(), 2);
    assert_eq!(state.generation.steps.len(), 2);
    Ok(())
}
