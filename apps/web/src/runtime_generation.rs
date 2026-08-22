//! One-forward autoregressive generation state machine.

use nanogpt_model::{ForwardRequest, NoTrace, SamplingDecision, sample_final_logits};
use nanogpt_schema::{
    CumulativeProbabilityInterval, FiniteF32, GenerationStepSummary, GenerationStopReason,
    LogitCandidate, TraceMode, WorkerResponse,
};
use nanogpt_tokenizer::Tokenizer;

use crate::runtime::WorkerRuntime;
use crate::runtime_error::RuntimeError;
use crate::runtime_generation_control::{GenerationAuthorization, finished};
use crate::runtime_timer::InferenceTimer;

pub use crate::runtime_generation_control::{GenerationKey, GenerationStart};

impl WorkerRuntime {
    pub(crate) fn advance_authorized(
        &mut self,
        key: GenerationKey,
    ) -> Result<Vec<WorkerResponse>, RuntimeError> {
        let Some(run) = self
            .generation
            .as_ref()
            .filter(|run| run.active && run.key == key)
        else {
            return Ok(Vec::new());
        };
        if run.steps.len() >= run.config.max_new_tokens {
            return Ok(self.finish_active(key, GenerationStopReason::MaxNewTokens));
        }
        let loaded = self.loaded.as_ref().ok_or(RuntimeError::NotInitialized)?;
        if run.context.len() >= loaded.config.block_size {
            return Ok(self.finish_active(key, GenerationStopReason::ContextLimit));
        }
        debug_assert!(run.context.len() >= run.prompt.len());
        let context = run.context.clone();
        let config = run.config.clone();
        let index = run.steps.len();
        let total_timer = InferenceTimer::start();
        let forward_timer = InferenceTimer::start();
        let output = loaded.model.forward(
            ForwardRequest {
                token_ids: &context,
                top_k: 1,
                trace_mode: TraceMode::Off,
            },
            &mut NoTrace,
        )?;
        let forward_ms = forward_timer.elapsed_ms();
        let final_logits = output
            .logits
            .narrow(1, context.len().saturating_sub(1), 1)?
            .flatten_all()?
            .to_vec1::<f32>()?;
        let sampling_timer = InferenceTimer::start();
        let decision = sample_final_logits(&final_logits, &config, index as u64)?;
        let sampling_ms = sampling_timer.elapsed_ms();
        let generated_token = loaded.tokenizer.token_info(decision.selected.token_id)?;
        let (candidates, selected_interval) = sampling_summary(&loaded.tokenizer, &decision)?;
        let step = GenerationStepSummary {
            index,
            context_token_ids: context,
            generated_token,
            selected_logit: FiniteF32::new(decision.selected.logit)?,
            selected_probability: FiniteF32::new(decision.selected.probability)?,
            candidates,
            random: decision.random.map(FiniteF32::new).transpose()?,
            selected_interval,
            forward_ms: FiniteF32::new(forward_ms)?,
            sampling_ms: FiniteF32::new(sampling_ms)?,
            total_ms: FiniteF32::new(total_timer.elapsed_ms())?,
        };
        let eos_id = loaded.tokenizer.config().eos_id;
        let block_size = loaded.config.block_size;
        let run = self
            .generation
            .as_mut()
            .filter(|run| run.active && run.key == key)
            .ok_or(RuntimeError::Cancelled)?;
        run.context.push(step.generated_token.id);
        run.steps.push(step.clone());
        let terminal = if step.generated_token.id == eos_id {
            Some(GenerationStopReason::EndOfSequence)
        } else if run.steps.len() >= run.config.max_new_tokens {
            Some(GenerationStopReason::MaxNewTokens)
        } else if run.context.len() >= block_size {
            Some(GenerationStopReason::ContextLimit)
        } else {
            None
        };
        let mut responses = vec![WorkerResponse::TokenGenerated {
            request_id: key.request_id,
            run_id: run.run_id,
            step,
        }];
        if let Some(reason) = terminal {
            run.active = false;
            run.authorization = None;
            responses.push(finished(run, reason));
        } else {
            run.authorization = Some(GenerationAuthorization::Continue(
                run.steps.len().saturating_sub(1),
            ));
        }
        Ok(responses)
    }

    pub(crate) fn generation_step(
        &self,
        generation_run_id: u64,
        step_index: usize,
    ) -> Result<GenerationStepSummary, RuntimeError> {
        let run = self
            .generation
            .as_ref()
            .filter(|run| run.run_id == generation_run_id)
            .ok_or(RuntimeError::StaleRun)?;
        run.steps
            .get(step_index)
            .cloned()
            .ok_or(RuntimeError::InvalidSelector)
    }

    #[cfg(test)]
    pub(crate) fn corrupt_first_generation_candidate(&mut self) -> Result<(), RuntimeError> {
        let candidate = self
            .generation
            .as_mut()
            .and_then(|run| run.steps.first_mut())
            .and_then(|step| step.candidates.first_mut())
            .ok_or(RuntimeError::InvalidSelector)?;
        candidate.logit = FiniteF32::new(candidate.logit.get() + 1.0)?;
        Ok(())
    }
}

fn sampling_summary(
    tokenizer: &Tokenizer,
    decision: &SamplingDecision,
) -> Result<(Vec<LogitCandidate>, Option<CumulativeProbabilityInterval>), RuntimeError> {
    let candidates = decision
        .candidates
        .iter()
        .map(|candidate| {
            Ok(LogitCandidate {
                token_id: candidate.token_id,
                display: tokenizer.token_info(candidate.token_id)?.display,
                logit: FiniteF32::new(candidate.logit)?,
                probability: FiniteF32::new(candidate.probability)?,
            })
        })
        .collect::<Result<Vec<_>, RuntimeError>>()?;
    let interval = decision
        .interval
        .map(|interval| {
            Ok::<_, RuntimeError>(CumulativeProbabilityInterval {
                start: FiniteF32::new(interval.start)?,
                end: FiniteF32::new(interval.end)?,
            })
        })
        .transpose()?;
    Ok((candidates, interval))
}
