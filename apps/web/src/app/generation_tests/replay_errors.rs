use super::*;

#[test]
fn stale_same_run_detail_request_cannot_overwrite_newer_selection() -> TestResult {
    // Given: a summary and two block requests for the same replay run.
    let mut state = AppState::default();
    state.summary = Some(run_summary()?);
    let old = state
        .select_layer(0)
        .ok_or_else(|| io::Error::other("old block"))?;
    let new = state
        .select_layer(0)
        .ok_or_else(|| io::Error::other("new block"))?;
    let WorkerRequest::InspectBlock {
        request_id: old_id,
        run_id,
        ..
    } = old
    else {
        return Err(io::Error::other("old variant").into());
    };
    let WorkerRequest::InspectBlock {
        request_id: new_id, ..
    } = new
    else {
        return Err(io::Error::other("new variant").into());
    };
    let WorkerResponse::BlockTrace { trace, .. } = block_response()? else {
        return Err(io::Error::other("fixture block").into());
    };

    // When: the old response races ahead of the newest correlated response.
    state.apply(WorkerResponse::BlockTrace {
        request_id: old_id,
        run_id,
        trace: trace.clone(),
    })?;
    assert!(state.block.is_none());
    let followups = state.apply(WorkerResponse::BlockTrace {
        request_id: new_id,
        run_id,
        trace,
    })?;

    // Then: only the newest detail applies and chains to head detail.
    assert!(state.block.is_some());
    assert!(matches!(
        followups.as_slice(),
        [WorkerRequest::InspectAttentionHead { .. }]
    ));
    Ok(())
}

#[test]
fn replay_and_detail_errors_clear_only_exact_pending_correlation() -> TestResult {
    // Given: a valid stream with one replay request pending.
    let mut state = AppState::default();
    let generate = state.begin_generation("x", config()?);
    let WorkerRequest::Generate { request_id, .. } = generate else {
        return Err(io::Error::other("generate variant").into());
    };
    state.apply(started(request_id, 60)?)?;
    state.apply(WorkerResponse::TokenGenerated {
        request_id,
        run_id: 60,
        step: step(0, b"x")?,
    })?;
    let replay = state
        .inspect_generation_step(0)
        .ok_or_else(|| io::Error::other("replay request"))?;
    let WorkerRequest::InspectGenerationStep {
        request_id: replay_id,
        ..
    } = replay
    else {
        return Err(io::Error::other("replay variant").into());
    };

    // When: an unknown stale error and then the exact replay error arrive.
    state.apply(WorkerResponse::Error {
        request_id: Some(replay_id + 100),
        code: WorkerErrorCode::Inference,
        message: "stale".to_owned(),
    })?;
    assert!(state.generation.error.is_none());
    assert!(state.generation.pending_replay.is_some());
    state.apply(WorkerResponse::Error {
        request_id: Some(replay_id),
        code: WorkerErrorCode::Inference,
        message: "replay mismatch".to_owned(),
    })?;

    // Then: only the exact replay correlation clears and history remains recoverable.
    assert!(state.generation.pending_replay.is_none());
    assert_eq!(state.generation.error.as_deref(), Some("replay mismatch"));
    assert_eq!(state.generation.steps.len(), 1);

    // Given/When: a fresh exact replay succeeds, then its current block detail fails.
    let replay = state
        .inspect_generation_step(0)
        .ok_or_else(|| io::Error::other("retry replay"))?;
    let WorkerRequest::InspectGenerationStep {
        request_id: replay_id,
        ..
    } = replay
    else {
        return Err(io::Error::other("retry variant").into());
    };
    let mut summary = run_summary()?;
    summary.run_id = 91;
    let details = state.apply(WorkerResponse::GenerationStepTrace {
        request_id: replay_id,
        generation_run_id: 60,
        step_index: 0,
        step: step(0, b"x")?,
        summary: Box::new(summary),
    })?;
    assert!(state.generation.error.is_none());
    let WorkerRequest::InspectBlock {
        request_id: detail_id,
        ..
    } = details[0]
    else {
        return Err(io::Error::other("block detail variant").into());
    };
    state.apply(WorkerResponse::Error {
        request_id: Some(detail_id),
        code: WorkerErrorCode::Inference,
        message: "detail failed".to_owned(),
    })?;

    // Then: exact detail pending state clears without deleting replay summary or generation history.
    assert_eq!(state.generation.error.as_deref(), Some("detail failed"));
    assert!(state.summary.is_some());
    assert_eq!(state.generation.steps.len(), 1);
    assert!(state.select_layer(0).is_some());
    assert!(state.generation.error.is_none());
    assert_eq!(state.generation.steps.len(), 1);
    Ok(())
}
