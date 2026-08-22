//! App-state transitions for generation streaming and replay.

use nanogpt_schema::{
    GenerationConfig, GenerationStepSummary, GenerationStopReason, RunSummary, TokenInfo,
    WorkerRequest,
};

#[cfg(any(test, target_arch = "wasm32"))]
use super::generation::PendingGeneration;
use super::{
    generation::{ActiveGeneration, GenerationPhase, ReplayCorrelation},
    selection::Selection,
    state::{AppState, AppStatus},
};

impl AppState {
    #[cfg(any(test, target_arch = "wasm32"))]
    #[must_use]
    pub(crate) fn begin_generation(
        &mut self,
        text: &str,
        config: GenerationConfig,
    ) -> WorkerRequest {
        let request_id = self.request_id();
        self.generation.pending = Some(PendingGeneration {
            request_id,
            prompt: text.to_owned(),
        });
        self.generation.error = None;
        WorkerRequest::Generate {
            request_id,
            text: text.to_owned(),
            config,
        }
    }

    #[cfg(any(test, target_arch = "wasm32"))]
    #[must_use]
    pub(crate) fn stop_generation(&self) -> Option<WorkerRequest> {
        let active = self.generation.active?;
        matches!(self.generation.phase, GenerationPhase::Running).then_some(
            WorkerRequest::StopGeneration {
                request_id: active.request_id,
                run_id: active.run_id,
            },
        )
    }

    #[cfg(any(test, target_arch = "wasm32"))]
    #[must_use]
    pub(crate) fn inspect_generation_step(&mut self, step_index: usize) -> Option<WorkerRequest> {
        let active = self.generation.active?;
        self.generation.steps.get(step_index)?;
        let request_id = self.request_id();
        self.generation.selected_step = Some(step_index);
        self.generation.error = None;
        self.status = AppStatus::Running("선택한 생성 단계를 불러오는 중".to_owned());
        self.generation.pending_replay = Some(ReplayCorrelation {
            request_id,
            generation_run_id: active.run_id,
            step_index,
        });
        self.clear_replay_evidence();
        Some(WorkerRequest::InspectGenerationStep {
            request_id,
            generation_run_id: active.run_id,
            step_index,
        })
    }

    pub(super) fn generation_started(
        &mut self,
        request_id: u64,
        run_id: u64,
        prompt_tokens: Vec<TokenInfo>,
        config: GenerationConfig,
        context_limit: usize,
    ) {
        let Some(pending) = self
            .generation
            .pending
            .as_ref()
            .filter(|pending| pending.request_id == request_id)
        else {
            return;
        };
        self.generation.prompt_text.clone_from(&pending.prompt);
        self.generation.pending = None;
        self.generation.active = Some(ActiveGeneration { request_id, run_id });
        self.generation.phase = GenerationPhase::Running;
        self.generation.prompt_tokens = prompt_tokens;
        self.generation.config = Some(config);
        self.generation.context_limit = context_limit;
        self.generation.steps.clear();
        self.generation.error = None;
        self.generation.selected_step = None;
        self.generation.pending_replay = None;
        self.clear_replay_evidence();
        self.status = AppStatus::Running("토큰 생성 중".to_owned());
    }

    pub(super) fn token_generated(
        &mut self,
        request_id: u64,
        run_id: u64,
        step: GenerationStepSummary,
    ) -> Option<WorkerRequest> {
        let exact = self.generation.active == Some(ActiveGeneration { request_id, run_id });
        if !exact
            || self.generation.phase != GenerationPhase::Running
            || step.index != self.generation.steps.len()
        {
            return None;
        }
        let step_index = step.index;
        self.generation.steps.push(step);
        Some(WorkerRequest::ContinueGeneration {
            request_id,
            run_id,
            step_index,
        })
    }

    pub(super) fn generation_finished(
        &mut self,
        request_id: u64,
        run_id: u64,
        reason: GenerationStopReason,
    ) {
        if self.generation.active != Some(ActiveGeneration { request_id, run_id }) {
            return;
        }
        self.generation.phase = GenerationPhase::Finished(reason);
        self.status = AppStatus::Complete;
    }

    pub(super) fn apply_generation_error(&mut self, request_id: u64, message: &str) -> bool {
        if self
            .generation
            .pending
            .as_ref()
            .is_some_and(|pending| pending.request_id == request_id)
        {
            self.generation.pending = None;
            self.generation.error = Some(message.to_owned());
            if self.generation.active.is_none() {
                self.generation.phase = GenerationPhase::Idle;
            }
            return true;
        }
        if self
            .generation
            .active
            .is_some_and(|active| active.request_id == request_id)
        {
            self.generation.error = Some(message.to_owned());
            return true;
        }
        if self
            .generation
            .pending_replay
            .is_some_and(|pending| pending.request_id == request_id)
        {
            self.generation.pending_replay = None;
            self.generation.error = Some(message.to_owned());
            self.status = AppStatus::Error(message.to_owned());
            return true;
        }
        let detail_matches = self.pending_block_request == Some(request_id)
            || self.pending_head_request == Some(request_id)
            || self.pending_token_request == Some(request_id);
        if detail_matches {
            if self.pending_block_request == Some(request_id) {
                self.pending_block_request = None;
            }
            if self.pending_head_request == Some(request_id) {
                self.pending_head_request = None;
            }
            if self.pending_token_request == Some(request_id) {
                self.pending_token_request = None;
            }
            self.generation.error = Some(message.to_owned());
            self.status = AppStatus::Error(message.to_owned());
            return true;
        }
        false
    }

    pub(super) fn apply_generation_trace(
        &mut self,
        request_id: u64,
        generation_run_id: u64,
        step_index: usize,
        step: &GenerationStepSummary,
        summary: RunSummary,
    ) -> bool {
        let correlation = ReplayCorrelation {
            request_id,
            generation_run_id,
            step_index,
        };
        if self.generation.pending_replay != Some(correlation)
            || self.generation.steps.get(step_index) != Some(step)
        {
            return false;
        }
        self.generation.pending_replay = None;
        self.generation.error = None;
        self.generation.selected_step = Some(step_index);
        self.selection.token = summary.tokens.len().saturating_sub(1);
        self.selection.key = self.selection.token;
        self.summary = Some(summary);
        self.status = AppStatus::Running("선택한 생성 단계를 재생 중".to_owned());
        true
    }

    fn clear_replay_evidence(&mut self) {
        self.summary = None;
        self.block = None;
        self.attention = None;
        self.token = None;
        self.selection = Selection::default();
        self.pending_block_request = None;
        self.pending_head_request = None;
        self.pending_token_request = None;
    }
}
