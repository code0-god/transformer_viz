//! Stateful model runtime owned exclusively by the browser Worker.

use std::collections::HashSet;

use candle_core::Tensor;
use nanogpt_model::{ForwardRequest, LayerReplayRequest};
use nanogpt_schema::{FiniteF32, TokenInfo, TraceMode, WorkerRequest, WorkerResponse};

pub use crate::runtime_assets::AssetBundle;
use crate::runtime_assets::{LoadedModel, asset_names, load_assets};
use crate::runtime_error::RuntimeError;
use crate::runtime_generation_control::GenerationRun;
use crate::runtime_timer::InferenceTimer;
use crate::runtime_trace::{TokenSelection, TraceCapture};

const TOP_K: usize = 10;

#[cfg(test)]
#[path = "runtime_replay_tests.rs"]
mod tests;

#[cfg(test)]
#[path = "runtime_generation_tests.rs"]
mod generation_tests;

#[cfg(test)]
#[path = "runtime_generation_replay_tests.rs"]
mod generation_replay_tests;

#[derive(Debug)]
pub(crate) struct CachedRun {
    pub(crate) run_id: u64,
    pub(crate) tokens: Vec<TokenInfo>,
    pub(crate) layer_inputs: Vec<Tensor>,
}

/// Stateful request processor retaining one model and one recent run.
#[derive(Debug, Default)]
pub struct WorkerRuntime {
    pub(super) loaded: Option<LoadedModel>,
    cached: Option<CachedRun>,
    cancelled: HashSet<u64>,
    pub(super) generation: Option<GenerationRun>,
    pub(super) generation_epoch: u64,
    pub(super) next_run_id: u64,
}

impl WorkerRuntime {
    /// Parses, verifies, and loads a complete model asset bundle.
    ///
    /// # Errors
    /// Returns [`RuntimeError`] when JSON, SHA-256, or safetensors validation fails.
    pub fn initialize(&mut self, assets: &AssetBundle) -> Result<WorkerResponse, RuntimeError> {
        let (loaded, metadata) = load_assets(assets)?;
        self.loaded = Some(loaded);
        self.cached = None;
        self.generation = None;
        self.cancelled.clear();
        Ok(WorkerResponse::Ready { model: metadata })
    }

    /// Handles one already-decoded protocol request.
    ///
    /// Asset fetching remains at the browser boundary; `Initialize` must call [`Self::initialize`].
    ///
    /// # Errors
    /// Returns typed user-facing failures for invalid state, input, selectors, or inference.
    pub fn handle(&mut self, request: WorkerRequest) -> Result<WorkerResponse, RuntimeError> {
        match request {
            WorkerRequest::Initialize { .. } => Err(RuntimeError::AssetUnavailable(
                "initialization requires downloaded assets".to_owned(),
            )),
            WorkerRequest::Run { request_id, text } => self.run(request_id, &text),
            WorkerRequest::Generate { .. }
            | WorkerRequest::StopGeneration { .. }
            | WorkerRequest::ContinueGeneration { .. } => Err(RuntimeError::InvalidSelector),
            WorkerRequest::InspectGenerationStep {
                request_id,
                generation_run_id,
                step_index,
            } => self.inspect_generation_step(request_id, generation_run_id, step_index),
            WorkerRequest::InspectBlock {
                request_id,
                run_id,
                layer,
            } => self.inspect_block(request_id, run_id, layer),
            WorkerRequest::InspectAttentionHead {
                request_id,
                run_id,
                layer,
                head,
            } => self.inspect_head(request_id, run_id, layer, head),
            WorkerRequest::InspectToken {
                request_id,
                run_id,
                layer,
                head,
                token,
            } => self.inspect_token(request_id, run_id, layer, head, token),
            WorkerRequest::Cancel { request_id } => {
                self.cancelled.insert(request_id);
                Err(RuntimeError::Cancelled)
            }
        }
    }

    fn run(&mut self, request_id: u64, text: &str) -> Result<WorkerResponse, RuntimeError> {
        if self.cancelled.remove(&request_id) {
            return Err(RuntimeError::Cancelled);
        }
        if text.is_empty() {
            return Err(RuntimeError::EmptyInput);
        }
        let loaded = self.loaded.as_ref().ok_or(RuntimeError::NotInitialized)?;
        let encoded = loaded.tokenizer.encode(text);
        if encoded.truncated {
            return Err(RuntimeError::InputTooLong {
                limit: loaded.config.block_size,
                actual: text.len().saturating_add(2),
            });
        }
        let token_ids = encoded
            .tokens
            .iter()
            .map(|token| token.id)
            .collect::<Vec<_>>();
        let run_id = self.next_run_id.saturating_add(1);
        let timer = InferenceTimer::start();
        let mut capture = TraceCapture::default();
        let output = loaded.model.forward(
            ForwardRequest {
                token_ids: &token_ids,
                top_k: TOP_K,
                trace_mode: TraceMode::Summary,
            },
            &mut capture,
        )?;
        let duration_ms = FiniteF32::new(timer.elapsed_ms())?;
        let layer_inputs = capture.cached_layer_inputs();
        let summary = capture.summary(run_id, encoded.tokens.clone(), &output, duration_ms)?;
        self.commit_cached_run(CachedRun {
            run_id,
            tokens: encoded.tokens,
            layer_inputs,
        });
        Ok(WorkerResponse::RunComplete {
            request_id,
            summary: Box::new(summary),
        })
    }

    fn inspect_block(
        &self,
        request_id: u64,
        run_id: u64,
        layer: usize,
    ) -> Result<WorkerResponse, RuntimeError> {
        self.validate_selector(run_id, layer, None, None)?;
        let (cached, _output, capture) = self.replay(run_id, TraceMode::Block { layer })?;
        Ok(WorkerResponse::BlockTrace {
            request_id,
            run_id: cached.run_id,
            trace: Box::new(capture.block(run_id, layer)?),
        })
    }

    fn inspect_head(
        &self,
        request_id: u64,
        run_id: u64,
        layer: usize,
        head: usize,
    ) -> Result<WorkerResponse, RuntimeError> {
        self.validate_selector(run_id, layer, Some(head), None)?;
        let (cached, _output, capture) =
            self.replay(run_id, TraceMode::AttentionHead { layer, head })?;
        Ok(WorkerResponse::AttentionHeadTrace {
            request_id,
            run_id: cached.run_id,
            trace: Box::new(capture.head(layer, head)?),
        })
    }

    fn inspect_token(
        &self,
        request_id: u64,
        run_id: u64,
        layer: usize,
        head: usize,
        token: usize,
    ) -> Result<WorkerResponse, RuntimeError> {
        self.validate_selector(run_id, layer, Some(head), Some(token))?;
        let (cached, output, capture) =
            self.replay(run_id, TraceMode::Token { layer, head, token })?;
        let selection = TokenSelection {
            run_id,
            layer,
            head,
            token,
            tokens: &cached.tokens,
        };
        Ok(WorkerResponse::TokenTrace {
            request_id,
            run_id: cached.run_id,
            trace: Box::new(capture.token(selection, &output)?),
        })
    }

    fn replay(
        &self,
        run_id: u64,
        mode: TraceMode,
    ) -> Result<(&CachedRun, nanogpt_model::ForwardOutput, TraceCapture), RuntimeError> {
        let loaded = self.loaded.as_ref().ok_or(RuntimeError::NotInitialized)?;
        let cached = self.cached_run(run_id)?;
        let mut capture = TraceCapture::default();
        let layer = trace_layer(mode).ok_or(RuntimeError::InvalidSelector)?;
        let layer_input = cached
            .layer_inputs
            .get(layer)
            .ok_or(RuntimeError::InvalidSelector)?;
        let output = loaded.model.replay_from_layer(
            LayerReplayRequest {
                layer_input,
                layer,
                top_k: TOP_K,
                trace_mode: mode,
            },
            &mut capture,
        )?;
        Ok((cached, output, capture))
    }

    fn validate_selector(
        &self,
        run_id: u64,
        layer: usize,
        head: Option<usize>,
        token: Option<usize>,
    ) -> Result<(), RuntimeError> {
        let loaded = self.loaded.as_ref().ok_or(RuntimeError::NotInitialized)?;
        let cached = self.cached_run(run_id)?;
        if layer >= loaded.config.n_layer
            || head.is_some_and(|value| value >= loaded.config.n_head)
            || token.is_some_and(|value| value >= cached.tokens.len())
        {
            return Err(RuntimeError::InvalidSelector);
        }
        Ok(())
    }

    fn cached_run(&self, run_id: u64) -> Result<&CachedRun, RuntimeError> {
        self.cached
            .as_ref()
            .filter(|cached| cached.run_id == run_id)
            .ok_or(RuntimeError::StaleRun)
    }

    pub(crate) fn commit_cached_run(&mut self, cached: CachedRun) {
        self.next_run_id = cached.run_id;
        self.cached = Some(cached);
    }

    /// Returns model-relative asset names from a parsed manifest.
    ///
    /// # Errors
    /// Returns [`RuntimeError`] for malformed manifest JSON.
    pub fn asset_names(manifest: &str) -> Result<(String, String, String), RuntimeError> {
        asset_names(manifest)
    }
}

/// Converts a runtime failure into the exact Worker error response.
#[must_use]
pub fn error_response(request_id: Option<u64>, error: &RuntimeError) -> WorkerResponse {
    WorkerResponse::Error {
        request_id,
        code: error.code(),
        message: error.to_string(),
    }
}

const fn trace_layer(mode: TraceMode) -> Option<usize> {
    match mode {
        TraceMode::Block { layer }
        | TraceMode::AttentionHead { layer, .. }
        | TraceMode::Token { layer, .. } => Some(layer),
        TraceMode::Off | TraceMode::Summary => None,
    }
}
