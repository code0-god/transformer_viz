//! Generation form, stream, and replay state contracts.

#[cfg(test)]
mod tests {
    use std::{error::Error, io};

    use nanogpt_schema::{
        FiniteF32, GenerationConfig, GenerationStepSummary, GenerationStopReason, SamplingMode,
        Temperature, TokenId, TokenInfo, TokenKind, TopK, WorkerErrorCode, WorkerRequest,
        WorkerResponse,
    };

    use crate::app::{
        generation::{GenerationForm, GenerationPhase},
        state::AppState,
        state_test_fixtures::{block_response, run_summary},
    };

    type TestResult = Result<(), Box<dyn Error>>;

    fn token(id: u32, display: &str, piece: &[u8], kind: TokenKind) -> TokenInfo {
        TokenInfo {
            id: TokenId(id),
            display: display.to_owned(),
            piece: piece.to_vec(),
            byte_start: None,
            byte_end: None,
            kind,
        }
    }

    fn config() -> Result<GenerationConfig, nanogpt_schema::SchemaError> {
        Ok(GenerationConfig {
            max_new_tokens: 8,
            temperature: Temperature::new(1.0)?,
            top_k: TopK::new(20)?,
            mode: SamplingMode::Sample,
            seed: 42,
        })
    }

    fn step(
        index: usize,
        piece: &[u8],
    ) -> Result<GenerationStepSummary, nanogpt_schema::SchemaError> {
        Ok(GenerationStepSummary {
            index,
            context_token_ids: vec![TokenId(0), TokenId(119), TokenId(1)],
            generated_token: token(
                200 + u32::try_from(index).unwrap_or(u32::MAX),
                "raw",
                piece,
                TokenKind::Byte,
            ),
            selected_logit: FiniteF32::new(2.0)?,
            selected_probability: FiniteF32::new(0.5)?,
            candidates: Vec::new(),
            random: None,
            selected_interval: None,
            forward_ms: FiniteF32::new(1.0)?,
            sampling_ms: FiniteF32::new(0.25)?,
            total_ms: FiniteF32::new(1.25)?,
        })
    }

    fn started(
        request_id: u64,
        run_id: u64,
    ) -> Result<WorkerResponse, nanogpt_schema::SchemaError> {
        Ok(WorkerResponse::GenerationStarted {
            request_id,
            run_id,
            prompt_tokens: vec![
                token(0, "<BOS>", &[], TokenKind::Bos),
                token(119, "t", b"t", TokenKind::Byte),
            ],
            config: config()?,
            context_limit: 24,
        })
    }

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
}
