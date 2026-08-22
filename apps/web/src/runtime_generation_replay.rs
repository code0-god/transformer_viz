//! Full-context trace replay for one stored generation step.

use nanogpt_model::ForwardRequest;
use nanogpt_schema::{FiniteF32, TraceMode, WorkerResponse};

use crate::runtime::{CachedRun, WorkerRuntime};
use crate::runtime_error::RuntimeError;
use crate::runtime_timer::InferenceTimer;
use crate::runtime_trace::TraceCapture;

const ABSOLUTE_TOLERANCE: f32 = 1e-4;
const RELATIVE_TOLERANCE: f32 = 1e-4;

impl WorkerRuntime {
    /// Reconstructs one historical pre-selection context as a fresh inspectable trace.
    ///
    /// # Errors
    /// Returns a typed stale-run, selector, inference, or replay-parity failure.
    pub fn inspect_generation_step(
        &mut self,
        request_id: u64,
        generation_run_id: u64,
        step_index: usize,
    ) -> Result<WorkerResponse, RuntimeError> {
        let step = self.generation_step(generation_run_id, step_index)?;
        let run_id = self.next_run_id.saturating_add(1);
        let (summary, layer_inputs) = {
            let loaded = self.loaded.as_ref().ok_or(RuntimeError::NotInitialized)?;
            let tokens = step
                .context_token_ids
                .iter()
                .copied()
                .map(|token_id| loaded.tokenizer.token_info(token_id))
                .collect::<Result<Vec<_>, _>>()?;
            let timer = InferenceTimer::start();
            let mut capture = TraceCapture::default();
            let output = loaded.model.forward(
                ForwardRequest {
                    token_ids: &step.context_token_ids,
                    top_k: step.candidates.len().max(1),
                    trace_mode: TraceMode::Summary,
                },
                &mut capture,
            )?;
            compare_candidates(&output.top_k, &step.candidates)?;
            let duration_ms = FiniteF32::new(timer.elapsed_ms())?;
            let layer_inputs = capture.cached_layer_inputs();
            let summary = capture.summary(run_id, tokens, &output, duration_ms)?;
            (summary, layer_inputs)
        };
        self.commit_cached_run(CachedRun {
            run_id,
            tokens: summary.tokens.clone(),
            layer_inputs,
        });
        Ok(WorkerResponse::GenerationStepTrace {
            request_id,
            generation_run_id,
            step_index,
            step,
            summary: Box::new(summary),
        })
    }
}

fn compare_candidates(
    replayed: &[nanogpt_model::TopKCandidate],
    historical: &[nanogpt_schema::LogitCandidate],
) -> Result<(), RuntimeError> {
    if replayed.len() != historical.len()
        || replayed
            .iter()
            .zip(historical)
            .any(|(replayed, historical)| {
                replayed.token_id != historical.token_id
                    || (replayed.logit - historical.logit.get()).abs()
                        > RELATIVE_TOLERANCE
                            .mul_add(historical.logit.get().abs(), ABSOLUTE_TOLERANCE)
            })
    {
        return Err(RuntimeError::GenerationReplayMismatch);
    }
    Ok(())
}
