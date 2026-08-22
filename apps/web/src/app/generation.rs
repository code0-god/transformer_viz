//! Compact generation session state.

#[cfg(any(test, target_arch = "wasm32"))]
pub mod form;
#[cfg(any(test, target_arch = "wasm32"))]
pub(crate) use form::{GenerationForm, MAX_BROWSER_SEED};

use nanogpt_schema::{GenerationConfig, GenerationStepSummary, GenerationStopReason, TokenInfo};

/// User-visible generation lifecycle.
#[derive(Debug, Clone, Copy, Default, PartialEq, Eq)]
pub(crate) enum GenerationPhase {
    #[default]
    Idle,
    Running,
    Finished(GenerationStopReason),
}

#[derive(Debug, Clone)]
pub(crate) struct PendingGeneration {
    pub(crate) request_id: u64,
    pub(crate) prompt: String,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub(crate) struct ActiveGeneration {
    pub(crate) request_id: u64,
    pub(crate) run_id: u64,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub(crate) struct ReplayCorrelation {
    pub(crate) request_id: u64,
    pub(crate) generation_run_id: u64,
    pub(crate) step_index: usize,
}

/// Compact state retained for the visible stream and selected replay.
#[derive(Debug, Clone, Default)]
pub(crate) struct GenerationState {
    pub(crate) pending: Option<PendingGeneration>,
    pub(crate) active: Option<ActiveGeneration>,
    pub(crate) phase: GenerationPhase,
    pub(crate) prompt_text: String,
    pub(crate) prompt_tokens: Vec<TokenInfo>,
    pub(crate) config: Option<GenerationConfig>,
    pub(crate) context_limit: usize,
    pub(crate) steps: Vec<GenerationStepSummary>,
    pub(crate) error: Option<String>,
    pub(crate) selected_step: Option<usize>,
    pub(crate) pending_replay: Option<ReplayCorrelation>,
}

impl GenerationState {
    #[must_use]
    #[cfg(any(test, target_arch = "wasm32"))]
    pub(crate) fn decoded_continuation(&self) -> String {
        let bytes = self
            .steps
            .iter()
            .flat_map(|step| step.generated_token.piece.iter().copied())
            .collect::<Vec<_>>();
        String::from_utf8_lossy(&bytes).into_owned()
    }

    #[must_use]
    #[cfg(target_arch = "wasm32")]
    pub(crate) fn context_used(&self) -> usize {
        self.steps.last().map_or(self.prompt_tokens.len(), |step| {
            step.context_token_ids.len().saturating_add(1)
        })
    }

    #[must_use]
    #[cfg(target_arch = "wasm32")]
    pub(crate) fn total_ms(&self) -> f32 {
        self.steps.iter().map(|step| step.total_ms.get()).sum()
    }
}
