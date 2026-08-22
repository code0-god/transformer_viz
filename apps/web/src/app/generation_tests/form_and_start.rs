use super::*;

#[test]
fn form_defaults_and_boundary_clamping_are_exact() -> TestResult {
    // Given: defaults and malformed/zero/out-of-range user text.
    let defaults = GenerationForm::default().parse(24, 259)?;
    let clamped = GenerationForm {
        max_new_tokens: "999".to_owned(),
        temperature: "0".to_owned(),
        top_k: "0".to_owned(),
        mode: SamplingMode::Greedy,
        seed: "not-a-u64".to_owned(),
    }
    .parse(24, 259)?;

    // When/Then: defaults are stable and invalid values normalize at the UI boundary.
    assert_eq!(defaults, GenerationConfig::default());
    assert_eq!(clamped.max_new_tokens, 24);
    assert!((clamped.temperature.get() - 0.1).abs() < f32::EPSILON);
    assert_eq!(clamped.top_k.get(), 1);
    assert_eq!(clamped.mode, SamplingMode::Greedy);
    assert_eq!(clamped.seed, 42);
    Ok(())
}

#[test]
fn browser_seed_clamps_to_javascript_safe_integer() -> TestResult {
    let form = GenerationForm {
        seed: u64::MAX.to_string(),
        ..GenerationForm::default()
    };

    let parsed = form.parse(24, 259)?;

    assert_eq!(parsed.seed, crate::app::generation::MAX_BROWSER_SEED);
    Ok(())
}

#[test]
fn local_send_failure_releases_pending_generation() -> TestResult {
    let mut state = AppState::default();
    let request = state.begin_generation("cat", config()?);
    assert!(state.generation.pending.is_some());

    state.request_send_failed(&request, "POST_SENTINEL");

    assert!(state.generation.pending.is_none());
    assert_eq!(state.generation.phase, GenerationPhase::Idle);
    assert_eq!(state.generation.error.as_deref(), Some("POST_SENTINEL"));
    assert_eq!(
        state.status,
        crate::app::state::AppStatus::Error("POST_SENTINEL".to_owned())
    );
    Ok(())
}

#[test]
fn invalid_pending_replacement_preserves_active_history() -> TestResult {
    // Given: active A with one streamed token and pending replacement B.
    let mut state = AppState::default();
    let a = state.begin_generation("the cat", config()?);
    let WorkerRequest::Generate {
        request_id: a_id, ..
    } = a
    else {
        return Err(io::Error::other("expected generate A").into());
    };
    state.apply(started(a_id, 10)?)?;
    state.apply(WorkerResponse::TokenGenerated {
        request_id: a_id,
        run_id: 10,
        step: step(0, b"!")?,
    })?;
    let b = state.begin_generation("", config()?);
    let WorkerRequest::Generate {
        request_id: b_id, ..
    } = b
    else {
        return Err(io::Error::other("expected generate B").into());
    };

    // When: B is rejected before a start.
    state.apply(WorkerResponse::Error {
        request_id: Some(b_id),
        code: WorkerErrorCode::Tokenization,
        message: "empty".to_owned(),
    })?;

    // Then: A remains visible/running and the error is recoverable.
    assert_eq!(
        state.generation.active.as_ref().map(|run| run.run_id),
        Some(10)
    );
    assert_eq!(state.generation.steps.len(), 1);
    assert_eq!(state.generation.phase, GenerationPhase::Running);
    assert_eq!(state.generation.error.as_deref(), Some("empty"));
    Ok(())
}

#[test]
fn accepted_start_clears_previous_replay_identity_and_detail_correlation() -> TestResult {
    // Given: previous replay evidence, non-default coordinates, and an in-flight detail request.
    let mut state = AppState::default();
    state.summary = Some(run_summary()?);
    state.selection.layer = 1;
    state.selection.head = 2;
    state.selection.token = 3;
    state.selection.key = 3;
    let old_detail = state
        .select_layer(0)
        .ok_or_else(|| io::Error::other("old detail"))?;
    let WorkerRequest::InspectBlock {
        request_id: old_detail_id,
        run_id: old_run_id,
        ..
    } = old_detail
    else {
        return Err(io::Error::other("old detail variant").into());
    };
    let request = state.begin_generation("fresh", config()?);
    let WorkerRequest::Generate { request_id, .. } = request else {
        return Err(io::Error::other("generate variant").into());
    };

    // When: only the matching valid replacement reaches Started.
    state.apply(started(request_id, 15)?)?;

    // Then: no previous replay, trace, coordinate, or stale detail response survives the identity change.
    assert!(state.summary.is_none());
    assert!(state.block.is_none());
    assert!(state.attention.is_none());
    assert!(state.token.is_none());
    assert_eq!(
        (
            state.selection.layer,
            state.selection.head,
            state.selection.token,
            state.selection.key
        ),
        (0, 0, 0, 0)
    );
    let WorkerResponse::BlockTrace { trace, .. } = block_response()? else {
        return Err(io::Error::other("block fixture").into());
    };
    state.apply(WorkerResponse::BlockTrace {
        request_id: old_detail_id,
        run_id: old_run_id,
        trace,
    })?;
    assert!(state.block.is_none());
    Ok(())
}
