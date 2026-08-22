//! Exact one-credit generation lifecycle control.

use nanogpt_schema::{
    GenerationConfig, GenerationStepSummary, GenerationStopReason, TokenId, TokenInfo, TopK,
    WorkerResponse,
};

use crate::runtime::WorkerRuntime;
use crate::runtime_error::RuntimeError;

const MAX_NEW_TOKENS: usize = 64;

/// Stale-task guard for one generation lifecycle.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct GenerationKey {
    pub(crate) request_id: u64,
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
    /// Key required for the initially authorized forward only.
    pub key: GenerationKey,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub(crate) enum GenerationAuthorization {
    Initial,
    Continue(usize),
}

#[derive(Debug)]
pub(crate) struct GenerationRun {
    pub(crate) key: GenerationKey,
    pub(crate) run_id: u64,
    pub(crate) config: GenerationConfig,
    pub(crate) prompt: Vec<TokenInfo>,
    pub(crate) context: Vec<TokenId>,
    pub(crate) steps: Vec<GenerationStepSummary>,
    pub(crate) active: bool,
    pub(crate) authorization: Option<GenerationAuthorization>,
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
        responses.push(WorkerResponse::GenerationStarted {
            request_id,
            run_id,
            prompt_tokens: prompt.tokens.clone(),
            config: config.clone(),
            context_limit: loaded.config.block_size,
        });
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
            authorization: Some(GenerationAuthorization::Initial),
        });
        Ok(GenerationStart { responses, key })
    }

    /// Runs the initially authorized first forward at most once.
    pub fn advance_generation(
        &mut self,
        key: GenerationKey,
    ) -> Result<Vec<WorkerResponse>, RuntimeError> {
        let Some(run) = self.generation.as_mut().filter(|run| {
            run.active
                && run.key == key
                && run.authorization == Some(GenerationAuthorization::Initial)
        }) else {
            return Ok(Vec::new());
        };
        run.authorization = None;
        self.advance_authorized(key)
    }

    /// Spends one exact single-use token credit to run the next forward.
    pub fn continue_generation(
        &mut self,
        request_id: u64,
        run_id: u64,
        step_index: usize,
    ) -> Result<Vec<WorkerResponse>, RuntimeError> {
        let Some(run) = self.generation.as_mut().filter(|run| {
            run.active
                && run.key.request_id == request_id
                && run.run_id == run_id
                && run.authorization == Some(GenerationAuthorization::Continue(step_index))
        }) else {
            return Ok(Vec::new());
        };
        let key = run.key;
        run.authorization = None;
        self.advance_authorized(key)
    }

    /// Stops only the exact active request and run.
    #[must_use]
    pub fn stop_generation(&mut self, request_id: u64, run_id: u64) -> Option<WorkerResponse> {
        self.finish_identity(request_id, run_id, GenerationStopReason::UserStopped)
    }

    /// Marks an exact active generation failed.
    #[must_use]
    pub fn fail_generation_identity(
        &mut self,
        request_id: u64,
        run_id: u64,
    ) -> Option<WorkerResponse> {
        self.finish_identity(request_id, run_id, GenerationStopReason::Error)
    }

    /// Marks the generation owning an exact initial key failed.
    #[must_use]
    pub fn fail_generation(&mut self, key: GenerationKey) -> Option<WorkerResponse> {
        let run = self
            .generation
            .as_mut()
            .filter(|run| run.active && run.key == key)?;
        Some(deactivate(run, GenerationStopReason::Error))
    }

    pub(crate) fn finish_active(
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
        vec![deactivate(run, reason)]
    }

    fn finish_identity(
        &mut self,
        request_id: u64,
        run_id: u64,
        reason: GenerationStopReason,
    ) -> Option<WorkerResponse> {
        let run = self
            .generation
            .as_mut()
            .filter(|run| run.active && run.key.request_id == request_id && run.run_id == run_id)?;
        Some(deactivate(run, reason))
    }
}

const fn deactivate(run: &mut GenerationRun, reason: GenerationStopReason) -> WorkerResponse {
    run.active = false;
    run.authorization = None;
    finished(run, reason)
}

pub(crate) const fn finished(run: &GenerationRun, reason: GenerationStopReason) -> WorkerResponse {
    WorkerResponse::GenerationFinished {
        request_id: run.key.request_id,
        run_id: run.run_id,
        reason,
    }
}
