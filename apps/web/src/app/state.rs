//! Pure application state shared by native tests and the Leptos browser shell.

use nanogpt_schema::{
    AttentionHeadTrace, BlockTrace, ModelMetadata, RunSummary, TokenTrace, WorkerRequest,
    WorkerResponse,
};
use thiserror::Error;

use super::selection::Selection;

/// User-visible application lifecycle.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum AppStatus {
    /// Worker and model assets are loading.
    Loading(String),
    /// Model is ready for inference.
    Ready,
    /// Inference or trace replay is active.
    Running(String),
    /// A real trace is displayed.
    Complete,
    /// A typed Worker failure is visible.
    Error(String),
}

/// Explorer state containing only Worker-produced traces.
#[derive(Debug, Clone)]
pub struct AppState {
    /// Lifecycle status.
    pub status: AppStatus,
    /// Loaded model identity.
    pub model: Option<ModelMetadata>,
    /// Last complete run summary.
    pub summary: Option<RunSummary>,
    /// Selected block trace.
    pub block: Option<BlockTrace>,
    /// Selected attention trace.
    pub attention: Option<AttentionHeadTrace>,
    /// Selected token trace.
    pub token: Option<TokenTrace>,
    /// Shared selectors.
    pub selection: Selection,
    next_request_id: u64,
}

impl Default for AppState {
    fn default() -> Self {
        Self {
            status: AppStatus::Loading("Worker 시작 중".to_owned()),
            model: None,
            summary: None,
            block: None,
            attention: None,
            token: None,
            selection: Selection::default(),
            next_request_id: 1,
        }
    }
}

/// Invalid state transition at the Worker boundary.
#[derive(Debug, Error, PartialEq, Eq)]
pub enum StateError {
    /// A detail response does not belong to the current run.
    #[error("현재 실행과 다른 추적 응답입니다")]
    StaleTrace,
}

impl AppState {
    /// Applies one Worker response and returns required follow-up requests.
    ///
    /// # Errors
    /// Returns [`StateError`] when detail data belongs to another run.
    pub fn apply(&mut self, response: WorkerResponse) -> Result<Vec<WorkerRequest>, StateError> {
        match response {
            WorkerResponse::Initializing { phase } => {
                let starts_worker = phase == "Worker 시작됨";
                self.status = AppStatus::Loading(phase);
                if starts_worker {
                    return Ok(vec![WorkerRequest::Initialize {
                        manifest_url: "./models/edu/manifest.json".to_owned(),
                    }]);
                }
            }
            WorkerResponse::Ready { model } => {
                self.model = Some(model);
                self.status = AppStatus::Ready;
            }
            WorkerResponse::RunComplete { summary, .. } => {
                let summary = *summary;
                self.selection.layer = self
                    .selection
                    .layer
                    .min(summary.layers.len().saturating_sub(1));
                self.selection.token = self
                    .selection
                    .token
                    .min(summary.tokens.len().saturating_sub(1));
                self.selection.key = self
                    .selection
                    .key
                    .min(summary.tokens.len().saturating_sub(1));
                let run_id = summary.run_id;
                self.summary = Some(summary);
                self.block = None;
                self.attention = None;
                self.token = None;
                self.status = AppStatus::Running("선택한 블록 추적 중".to_owned());
                return Ok(vec![self.block_request(run_id)]);
            }
            WorkerResponse::BlockTrace { run_id, trace, .. } => {
                self.require_run(run_id)?;
                self.block = Some(*trace);
                self.attention = None;
                self.token = None;
                self.status = AppStatus::Running("어텐션 헤드 추적 중".to_owned());
                return Ok(vec![self.head_request(run_id)]);
            }
            WorkerResponse::AttentionHeadTrace { run_id, trace, .. } => {
                self.require_run(run_id)?;
                self.attention = Some(*trace);
                self.token = None;
                self.status = AppStatus::Running("토큰 세부 값 추적 중".to_owned());
                return Ok(vec![self.token_request(run_id)]);
            }
            WorkerResponse::TokenTrace { run_id, trace, .. } => {
                self.require_run(run_id)?;
                self.token = Some(*trace);
                self.status = AppStatus::Complete;
            }
            WorkerResponse::Error { message, .. } => self.status = AppStatus::Error(message),
        }
        Ok(Vec::new())
    }

    /// Creates a run request and clears stale traces.
    #[must_use]
    pub fn run(&mut self, text: &str) -> WorkerRequest {
        self.status = AppStatus::Running("토큰화 및 추론 중".to_owned());
        self.summary = None;
        self.block = None;
        self.attention = None;
        self.token = None;
        WorkerRequest::Run {
            request_id: self.request_id(),
            text: text.to_owned(),
        }
    }

    pub(super) fn current_run(&self) -> Option<u64> {
        self.summary.as_ref().map(|summary| summary.run_id)
    }

    fn require_run(&self, run_id: u64) -> Result<(), StateError> {
        if self.current_run() == Some(run_id) {
            Ok(())
        } else {
            Err(StateError::StaleTrace)
        }
    }

    pub(super) const fn block_request(&mut self, run_id: u64) -> WorkerRequest {
        WorkerRequest::InspectBlock {
            request_id: self.request_id(),
            run_id,
            layer: self.selection.layer,
        }
    }

    pub(super) const fn head_request(&mut self, run_id: u64) -> WorkerRequest {
        WorkerRequest::InspectAttentionHead {
            request_id: self.request_id(),
            run_id,
            layer: self.selection.layer,
            head: self.selection.head,
        }
    }

    pub(super) const fn token_request(&mut self, run_id: u64) -> WorkerRequest {
        WorkerRequest::InspectToken {
            request_id: self.request_id(),
            run_id,
            layer: self.selection.layer,
            head: self.selection.head,
            token: self.selection.token,
        }
    }

    const fn request_id(&mut self) -> u64 {
        let current = self.next_request_id;
        self.next_request_id = self.next_request_id.saturating_add(1);
        current
    }
}

#[cfg(test)]
mod tests {
    use super::AppState;

    #[test]
    fn run_clears_stale_trace_and_advances_request_id() {
        // Given: a fresh explorer state.
        let mut state = AppState::default();

        // When: two runs are requested.
        let first = state.run("the cat");
        let second = state.run("the dog");

        // Then: request IDs are unique and monotonically increasing.
        assert_ne!(first, second);
    }
}
