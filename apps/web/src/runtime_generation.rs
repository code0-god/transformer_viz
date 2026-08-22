//! One-forward autoregressive generation state machine.

use nanogpt_model::{ForwardRequest, NoTrace, sample_final_logits};
use nanogpt_schema::{
    CumulativeProbabilityInterval, FiniteF32, GenerationConfig, GenerationStepSummary,
    GenerationStopReason, LogitCandidate, TokenId, TokenInfo, TopK, TraceMode, WorkerResponse,
};

use crate::runtime::WorkerRuntime;
use crate::runtime_error::RuntimeError;
use crate::runtime_timer::InferenceTimer;

const MAX_NEW_TOKENS: usize = 64;

/// Stale-task guard for one generation lifecycle.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct GenerationKey {
    request_id: u64,
    epoch: u64,
}

impl GenerationKey {
    /// Returns the protocol request correlated with this generation task.
    #[must_use]
    pub const fn request_id(self) -> u64 {
        self.request_id
    }
}

/// Events and task key produced by a valid generation start.
#[derive(Debug)]
pub struct GenerationStart {
    /// Replacement terminal event, when present, followed by the new started event.
    pub responses: Vec<WorkerResponse>,
    /// Key required to advance only this generation lifecycle.
    pub key: GenerationKey,
}

#[derive(Debug)]
pub(crate) struct GenerationRun {
    key: GenerationKey,
    run_id: u64,
    config: GenerationConfig,
    prompt: Vec<TokenInfo>,
    context: Vec<TokenId>,
    steps: Vec<GenerationStepSummary>,
    active: bool,
}

impl WorkerRuntime {
    /// Validates and starts generation, replacing an active valid run atomically.
    ///
    /// # Errors
    /// Returns a typed boundary error without replacing the active run.
    pub fn start_generation(
        &mut self,
        request_id: u64,
        text: &str,
        config: &GenerationConfig,
    ) -> Result<GenerationStart, RuntimeError> {
        if text.is_empty() {
            return Err(RuntimeError::EmptyInput);
        }
        let loaded = self.loaded.as_ref().ok_or(RuntimeError::NotInitialized)?;
        let prompt = loaded.tokenizer.generation_prompt(text)?;
        let config = GenerationConfig {
            max_new_tokens: config.max_new_tokens.min(MAX_NEW_TOKENS),
            temperature: config.temperature,
            top_k: TopK::new(config.top_k.get().min(loaded.config.vocab_size))?,
            mode: config.mode,
            seed: config.seed,
        };
        let key = GenerationKey {
            request_id,
            epoch: self.generation_epoch.saturating_add(1),
        };
        let run_id = self.next_run_id.saturating_add(1);
        let mut responses = Vec::with_capacity(2);
        if let Some(previous) = self.generation.as_ref().filter(|run| run.active) {
            responses.push(finished(previous, GenerationStopReason::Replaced));
        }
        responses.push(WorkerResponse::GenerationStarted { request_id, run_id });
        self.generation_epoch = key.epoch;
        self.next_run_id = run_id;
        self.generation = Some(GenerationRun {
            key,
            run_id,
            config,
            context: prompt.ids(),
            prompt: prompt.tokens,
            steps: Vec::new(),
            active: true,
        });
        Ok(GenerationStart { responses, key })
    }

    /// Runs at most one full-context forward and commits one generated step.
    ///
    /// # Errors
    /// Returns inference, sampling, token-metadata, or finite-schema failures.
    pub fn advance_generation(
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
        let candidates = decision
            .candidates
            .iter()
            .map(|candidate| {
                Ok(LogitCandidate {
                    token_id: candidate.token_id,
                    display: loaded.tokenizer.token_info(candidate.token_id)?.display,
                    logit: FiniteF32::new(candidate.logit)?,
                    probability: FiniteF32::new(candidate.probability)?,
                })
            })
            .collect::<Result<Vec<_>, RuntimeError>>()?;
        let selected_interval = decision
            .interval
            .map(|interval| {
                Ok::<_, RuntimeError>(CumulativeProbabilityInterval {
                    start: FiniteF32::new(interval.start)?,
                    end: FiniteF32::new(interval.end)?,
                })
            })
            .transpose()?;
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
            responses.push(finished(run, reason));
        }
        Ok(responses)
    }

    /// Stops the matching active request at completed-forward granularity.
    #[must_use]
    pub fn stop_generation(&mut self, request_id: u64) -> Option<WorkerResponse> {
        let run = self
            .generation
            .as_mut()
            .filter(|run| run.active && run.key.request_id == request_id)?;
        run.active = false;
        Some(finished(run, GenerationStopReason::UserStopped))
    }

    /// Marks an active generation failed after its Worker task encounters an error.
    #[must_use]
    pub fn fail_generation(&mut self, key: GenerationKey) -> Option<WorkerResponse> {
        let run = self
            .generation
            .as_mut()
            .filter(|run| run.active && run.key == key)?;
        run.active = false;
        Some(finished(run, GenerationStopReason::Error))
    }

    fn finish_active(
        &mut self,
        key: GenerationKey,
        reason: GenerationStopReason,
    ) -> Vec<WorkerResponse> {
        let Some(run) = self
            .generation
            .as_mut()
            .filter(|run| run.active && run.key == key)
        else {
            return Vec::new();
        };
        run.active = false;
        vec![finished(run, reason)]
    }
}

const fn finished(run: &GenerationRun, reason: GenerationStopReason) -> WorkerResponse {
    WorkerResponse::GenerationFinished {
        request_id: run.key.request_id,
        run_id: run.run_id,
        reason,
    }
}
