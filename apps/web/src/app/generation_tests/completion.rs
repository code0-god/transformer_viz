use super::*;

#[test]
fn rejected_visible_generation_clears_stale_history_and_replay() -> TestResult {
    // Given: a completed visible generation with replay evidence and a replacement pending.
    let mut state = AppState::default();
    let request = state.begin_generation("old", config()?);
    let WorkerRequest::Generate { request_id, .. } = request else {
        return Err(io::Error::other("expected generate").into());
    };
    state.apply(started(request_id, 70)?)?;
    state.apply(WorkerResponse::TokenGenerated {
        request_id,
        run_id: 70,
        step: step(0, b"x")?,
    })?;
    state.apply(WorkerResponse::GenerationFinished {
        request_id,
        run_id: 70,
        reason: GenerationStopReason::MaxNewTokens,
    })?;
    state.summary = Some(run_summary()?);
    let replacement = state.begin_generation("", config()?);
    let WorkerRequest::Generate {
        request_id: replacement_id,
        ..
    } = replacement
    else {
        return Err(io::Error::other("expected replacement").into());
    };

    // When: the Worker rejects the visible replacement at the input boundary.
    state.apply(WorkerResponse::Error {
        request_id: Some(replacement_id),
        code: WorkerErrorCode::InvalidRequest,
        message: "입력 문장을 입력해 주세요".to_owned(),
    })?;

    // Then: stale stream and replay evidence cannot remain visible.
    assert!(state.generation.steps.is_empty());
    assert!(state.generation.prompt_tokens.is_empty());
    assert!(state.generation.active.is_none());
    assert_eq!(state.generation.phase, GenerationPhase::Idle);
    assert!(state.summary.is_none());
    assert!(state.block.is_none());
    assert!(state.attention.is_none());
    assert!(state.token.is_none());
    assert_eq!(
        state.generation.error.as_deref(),
        Some("입력 문장을 입력해 주세요")
    );
    Ok(())
}

#[test]
fn stop_targets_active_request_without_allocating_a_new_id() -> TestResult {
    // Given: one pending request promoted to active.
    let mut state = AppState::default();
    let request = state.begin_generation("x", config()?);
    let WorkerRequest::Generate { request_id, .. } = request else {
        return Err(io::Error::other("expected generate").into());
    };
    state.apply(started(request_id, 50)?)?;

    // When: Stop is requested.
    let stop = state
        .stop_generation()
        .ok_or_else(|| io::Error::other("expected stop"))?;

    // Then: the active generation request ID is reused exactly.
    assert_eq!(
        stop,
        WorkerRequest::StopGeneration {
            request_id,
            run_id: 50,
        }
    );
    Ok(())
}
