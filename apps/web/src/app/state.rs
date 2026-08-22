//! Pure application state shared by native tests and the Leptos browser shell.

use nanogpt_schema::{
    AttentionHeadTrace, BlockTrace, ModelMetadata, RunSummary, TokenTrace, WorkerRequest,
};
use thiserror::Error;

use super::{generation::GenerationState, selection::Selection, ui_state::ExplorerUiState};

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
    /// Last complete replay summary.
    pub summary: Option<RunSummary>,
    /// Selected block trace.
    pub block: Option<BlockTrace>,
    /// Selected attention-head trace.
    pub attention: Option<AttentionHeadTrace>,
    /// Selected token trace.
    pub token: Option<TokenTrace>,
    /// Shared numeric selectors.
    pub selection: Selection,
    /// Browser-only explorer state.
    pub ui: ExplorerUiState,
    pub(crate) generation: GenerationState,
    next_request_id: u64,
    pub(super) pending_block_request: Option<u64>,
    pub(super) pending_head_request: Option<u64>,
    pub(super) pending_token_request: Option<u64>,
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
            ui: ExplorerUiState::default(),
            generation: GenerationState::default(),
            next_request_id: 1,
            pending_block_request: None,
            pending_head_request: None,
            pending_token_request: None,
        }
    }
}

/// Invalid state transition at the Worker boundary.
#[derive(Debug, Error, PartialEq, Eq)]
pub enum StateError {
    /// A correlated detail response belongs to another replay run.
    #[error("현재 실행과 다른 추적 응답입니다")]
    StaleTrace,
}

impl AppState {
    /// Creates a legacy run request for internal compatibility.
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

    pub(super) fn require_run(&self, run_id: u64) -> Result<(), StateError> {
        if self.current_run() == Some(run_id) {
            Ok(())
        } else {
            Err(StateError::StaleTrace)
        }
    }

    pub(super) fn block_request(&mut self, run_id: u64) -> WorkerRequest {
        let request_id = self.request_id();
        self.pending_block_request = Some(request_id);
        self.generation.error = None;
        WorkerRequest::InspectBlock {
            request_id,
            run_id,
            layer: self.selection.layer,
        }
    }

    pub(super) fn head_request(&mut self, run_id: u64) -> WorkerRequest {
        let request_id = self.request_id();
        self.pending_head_request = Some(request_id);
        self.generation.error = None;
        WorkerRequest::InspectAttentionHead {
            request_id,
            run_id,
            layer: self.selection.layer,
            head: self.selection.head,
        }
    }

    pub(super) fn token_request(&mut self, run_id: u64) -> WorkerRequest {
        let request_id = self.request_id();
        self.pending_token_request = Some(request_id);
        self.generation.error = None;
        WorkerRequest::InspectToken {
            request_id,
            run_id,
            layer: self.selection.layer,
            head: self.selection.head,
            token: self.selection.token,
        }
    }

    pub(super) const fn request_id(&mut self) -> u64 {
        let current = self.next_request_id;
        self.next_request_id = self.next_request_id.saturating_add(1);
        current
    }
}
