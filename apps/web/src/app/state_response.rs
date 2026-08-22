//! Correlated Worker-response application.

use nanogpt_schema::{
    AttentionHeadTrace, BlockTrace, RunSummary, TokenKind, TokenTrace, WorkerRequest,
    WorkerResponse,
};

use super::{
    state::{AppState, AppStatus, StateError},
    ui_state::ExplorerUiState,
};

impl AppState {
    /// Applies one Worker response and returns required follow-up requests.
    ///
    /// # Errors
    /// Returns [`StateError`] when correlated detail data belongs to another run.
    pub fn apply(&mut self, response: WorkerResponse) -> Result<Vec<WorkerRequest>, StateError> {
        match response {
            WorkerResponse::Initializing { phase } => return Ok(self.apply_initializing(phase)),
            WorkerResponse::Ready { model } => {
                self.model = Some(model);
                self.status = AppStatus::Ready;
            }
            WorkerResponse::RunComplete { summary, .. } => {
                return Ok(self.apply_run_complete(*summary));
            }
            WorkerResponse::BlockTrace {
                request_id,
                run_id,
                trace,
            } => {
                return self.apply_block(request_id, run_id, *trace);
            }
            WorkerResponse::AttentionHeadTrace {
                request_id,
                run_id,
                trace,
            } => {
                return self.apply_head(request_id, run_id, *trace);
            }
            WorkerResponse::TokenTrace {
                request_id,
                run_id,
                trace,
            } => {
                return self.apply_token(request_id, run_id, *trace);
            }
            WorkerResponse::GenerationStarted {
                request_id,
                run_id,
                prompt_tokens,
                config,
                context_limit,
            } => {
                self.generation_started(request_id, run_id, prompt_tokens, config, context_limit);
            }
            WorkerResponse::TokenGenerated {
                request_id,
                run_id,
                step,
            } => {
                return Ok(self
                    .token_generated(request_id, run_id, step)
                    .into_iter()
                    .collect());
            }
            WorkerResponse::GenerationFinished {
                request_id,
                run_id,
                reason,
            } => {
                self.generation_finished(request_id, run_id, reason);
            }
            WorkerResponse::GenerationStepTrace {
                request_id,
                generation_run_id,
                step_index,
                step,
                summary,
            } => {
                if !self.apply_generation_trace(
                    request_id,
                    generation_run_id,
                    step_index,
                    &step,
                    *summary,
                ) {
                    return Ok(Vec::new());
                }
                let run_id = self.current_run().ok_or(StateError::StaleTrace)?;
                return Ok(vec![self.block_request(run_id)]);
            }
            WorkerResponse::Error {
                request_id,
                message,
                ..
            } => {
                if request_id.is_some_and(|id| self.apply_generation_error(id, &message)) {
                    return Ok(Vec::new());
                }
                if request_id.is_none() {
                    self.status = AppStatus::Error(message);
                }
            }
        }
        Ok(Vec::new())
    }

    fn apply_initializing(&mut self, phase: String) -> Vec<WorkerRequest> {
        let starts_worker = phase == "Worker 시작됨";
        self.status = AppStatus::Loading(phase);
        if starts_worker {
            vec![WorkerRequest::Initialize {
                manifest_url: "./models/edu/manifest.json".to_owned(),
            }]
        } else {
            Vec::new()
        }
    }

    fn apply_run_complete(&mut self, summary: RunSummary) -> Vec<WorkerRequest> {
        self.selection.layer = 0;
        self.selection.head = 0;
        let default_token = summary
            .tokens
            .iter()
            .rposition(|token| token.kind == TokenKind::Byte)
            .unwrap_or_else(|| summary.tokens.len().saturating_sub(1));
        self.selection.token = default_token;
        self.selection.key = default_token;
        let run_id = summary.run_id;
        let can_inspect = !summary.layers.is_empty() && !summary.tokens.is_empty();
        self.summary = Some(summary);
        self.block = None;
        self.attention = None;
        self.token = None;
        self.ui = ExplorerUiState::default();
        if can_inspect {
            self.status = AppStatus::Running("선택한 블록 추적 중".to_owned());
            vec![self.block_request(run_id)]
        } else {
            self.ui.prompt_expanded = false;
            self.status = AppStatus::Complete;
            Vec::new()
        }
    }

    fn apply_block(
        &mut self,
        request_id: u64,
        run_id: u64,
        trace: BlockTrace,
    ) -> Result<Vec<WorkerRequest>, StateError> {
        if self.pending_block_request != Some(request_id) {
            return Ok(Vec::new());
        }
        self.require_run(run_id)?;
        self.pending_block_request = None;
        self.block = Some(trace);
        self.attention = None;
        self.token = None;
        self.status = AppStatus::Running("어텐션 헤드 추적 중".to_owned());
        Ok(vec![self.head_request(run_id)])
    }

    fn apply_head(
        &mut self,
        request_id: u64,
        run_id: u64,
        trace: AttentionHeadTrace,
    ) -> Result<Vec<WorkerRequest>, StateError> {
        if self.pending_head_request != Some(request_id) {
            return Ok(Vec::new());
        }
        self.require_run(run_id)?;
        self.pending_head_request = None;
        self.attention = Some(trace);
        self.token = None;
        self.status = AppStatus::Running("토큰 세부 값 추적 중".to_owned());
        Ok(vec![self.token_request(run_id)])
    }

    fn apply_token(
        &mut self,
        request_id: u64,
        run_id: u64,
        trace: TokenTrace,
    ) -> Result<Vec<WorkerRequest>, StateError> {
        if self.pending_token_request != Some(request_id) {
            return Ok(Vec::new());
        }
        self.require_run(run_id)?;
        self.pending_token_request = None;
        self.token = Some(trace);
        self.ui.prompt_expanded = false;
        self.status = AppStatus::Complete;
        Ok(Vec::new())
    }
}
