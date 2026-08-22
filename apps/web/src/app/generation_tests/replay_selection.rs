use super::*;

#[test]
fn rapid_replay_accepts_only_newest_and_chains_existing_detail() -> TestResult {
    // Given: two generated tokens and two rapid selections.
    let mut state = AppState::default();
    let request = state.begin_generation("x", config()?);
    let WorkerRequest::Generate { request_id, .. } = request else {
        return Err(io::Error::other("expected generate").into());
    };
    state.apply(started(request_id, 40)?)?;
    for index in 0..2 {
        state.apply(WorkerResponse::TokenGenerated {
            request_id,
            run_id: 40,
            step: step(index, b"x")?,
        })?;
    }
    let first = state
        .inspect_generation_step(0)
        .ok_or_else(|| io::Error::other("first replay"))?;
    let second = state
        .inspect_generation_step(1)
        .ok_or_else(|| io::Error::other("second replay"))?;
    let WorkerRequest::InspectGenerationStep {
        request_id: first_id,
        ..
    } = first
    else {
        return Err(io::Error::other("first variant").into());
    };
    let WorkerRequest::InspectGenerationStep {
        request_id: second_id,
        ..
    } = second
    else {
        return Err(io::Error::other("second variant").into());
    };
    let mut stale_summary = run_summary()?;
    stale_summary.run_id = 80;
    let mut fresh_summary = run_summary()?;
    fresh_summary.run_id = 81;

    // When: the old trace arrives after the newer selection, then the exact newer trace arrives.
    assert!(
        state
            .apply(WorkerResponse::GenerationStepTrace {
                request_id: first_id,
                generation_run_id: 40,
                step_index: 0,
                step: step(0, b"x")?,
                summary: Box::new(stale_summary)
            })?
            .is_empty()
    );
    let followups = state.apply(WorkerResponse::GenerationStepTrace {
        request_id: second_id,
        generation_run_id: 40,
        step_index: 1,
        step: step(1, b"x")?,
        summary: Box::new(fresh_summary),
    })?;

    // Then: only selection 1 binds, history is unchanged, and existing block detail starts once.
    assert_eq!(state.generation.selected_step, Some(1));
    assert_eq!(state.generation.steps.len(), 2);
    assert_eq!(
        state.summary.as_ref().map(|summary| summary.run_id),
        Some(81)
    );
    assert_eq!(
        state.selection.token,
        state
            .summary
            .as_ref()
            .map_or(0, |summary| summary.tokens.len().saturating_sub(1))
    );
    assert_eq!(state.selection.key, state.selection.token);
    assert!(matches!(
        followups.as_slice(),
        [WorkerRequest::InspectBlock { run_id: 81, .. }]
    ));
    Ok(())
}

#[test]
fn selecting_new_step_hides_old_replay_evidence_until_exact_trace_arrives() -> TestResult {
    // Given: step A is fully replay-bound and has requested block detail.
    let mut state = AppState::default();
    let generate = state.begin_generation("x", config()?);
    let WorkerRequest::Generate { request_id, .. } = generate else {
        return Err(io::Error::other("generate variant").into());
    };
    state.apply(started(request_id, 45)?)?;
    for index in 0..2 {
        state.apply(WorkerResponse::TokenGenerated {
            request_id,
            run_id: 45,
            step: step(index, b"x")?,
        })?;
    }
    let replay_a = state
        .inspect_generation_step(0)
        .ok_or_else(|| io::Error::other("replay A"))?;
    let WorkerRequest::InspectGenerationStep {
        request_id: replay_a_id,
        ..
    } = replay_a
    else {
        return Err(io::Error::other("replay A variant").into());
    };
    let mut summary_a = run_summary()?;
    summary_a.run_id = 90;
    let detail_a = state.apply(WorkerResponse::GenerationStepTrace {
        request_id: replay_a_id,
        generation_run_id: 45,
        step_index: 0,
        step: step(0, b"x")?,
        summary: Box::new(summary_a),
    })?;
    assert_eq!(
        state.summary.as_ref().map(|summary| summary.run_id),
        Some(90)
    );

    // When: B is selected before A's block response arrives.
    let replay_b = state
        .inspect_generation_step(1)
        .ok_or_else(|| io::Error::other("replay B"))?;

    // Then: no A evidence remains visible, history remains, and stale A detail/replay stay ignored.
    assert!(state.summary.is_none());
    assert!(state.block.is_none());
    assert!(state.attention.is_none());
    assert!(state.token.is_none());
    assert_eq!(state.generation.steps.len(), 2);
    assert_eq!(
        (
            state.selection.layer,
            state.selection.head,
            state.selection.token,
            state.selection.key
        ),
        (0, 0, 0, 0)
    );
    let WorkerRequest::InspectBlock {
        request_id: detail_a_id,
        run_id: detail_a_run,
        ..
    } = detail_a[0]
    else {
        return Err(io::Error::other("detail A variant").into());
    };
    let WorkerResponse::BlockTrace { trace, .. } = block_response()? else {
        return Err(io::Error::other("block fixture").into());
    };
    state.apply(WorkerResponse::BlockTrace {
        request_id: detail_a_id,
        run_id: detail_a_run,
        trace,
    })?;
    assert!(state.block.is_none());
    assert!(
        state
            .apply(WorkerResponse::GenerationStepTrace {
                request_id: replay_a_id,
                generation_run_id: 45,
                step_index: 0,
                step: step(0, b"x")?,
                summary: Box::new(run_summary()?)
            })?
            .is_empty()
    );
    assert!(state.summary.is_none());
    assert!(matches!(
        replay_b,
        WorkerRequest::InspectGenerationStep { step_index: 1, .. }
    ));
    Ok(())
}
