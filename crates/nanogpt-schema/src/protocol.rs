use crate::{
    AttentionHeadTrace, BlockTrace, GenerationConfig, GenerationStepSummary, GenerationStopReason,
    ModelMetadata, RunSummary, TokenTrace,
};
use serde::{Deserialize, Serialize};

/// Request accepted by the inference Worker.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "snake_case", deny_unknown_fields)]
pub enum WorkerRequest {
    /// Load and verify model assets.
    Initialize {
        /// Base-relative model manifest URL.
        manifest_url: String,
    },
    /// Run inference for UTF-8 text.
    Run {
        /// Correlates the response with this request.
        request_id: u64,
        /// UTF-8 prompt text.
        text: String,
    },
    /// Start streaming autoregressive generation.
    Generate {
        /// Correlates every stream event with this request.
        request_id: u64,
        /// UTF-8 prompt text.
        text: String,
        /// Deterministic generation controls.
        config: GenerationConfig,
    },
    /// Stop an active generation request.
    StopGeneration {
        /// Active generation request to stop.
        request_id: u64,
        /// Exact active generation run to stop.
        run_id: u64,
    },
    /// Authorize one next forward after accepting a streamed token.
    ContinueGeneration {
        /// Active generation request to advance.
        request_id: u64,
        /// Exact active generation run to advance.
        run_id: u64,
        /// Accepted token index granting this single-use credit.
        step_index: usize,
    },
    /// Replay one stored generation step with a full summary trace.
    InspectGenerationStep {
        /// Correlates the response with this request.
        request_id: u64,
        /// Streamed generation run to inspect.
        generation_run_id: u64,
        /// Zero-based generated-token index.
        step_index: usize,
    },
    /// Inspect one cached Transformer block.
    InspectBlock {
        /// Correlates the response with this request.
        request_id: u64,
        /// Completed run to inspect.
        run_id: u64,
        /// Zero-based layer index.
        layer: usize,
    },
    /// Inspect one cached causal-attention head.
    InspectAttentionHead {
        /// Correlates the response with this request.
        request_id: u64,
        /// Completed run to inspect.
        run_id: u64,
        /// Zero-based layer index.
        layer: usize,
        /// Zero-based head index.
        head: usize,
    },
    /// Inspect one token within a cached attention head.
    InspectToken {
        /// Correlates the response with this request.
        request_id: u64,
        /// Completed run to inspect.
        run_id: u64,
        /// Zero-based layer index.
        layer: usize,
        /// Zero-based head index.
        head: usize,
        /// Zero-based token position.
        token: usize,
    },
    /// Cancel an active request.
    Cancel {
        /// Request to cancel.
        request_id: u64,
    },
}

/// Stable machine-readable Worker failure category.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum WorkerErrorCode {
    /// Unsupported serialized contract.
    UnsupportedVersion,
    /// Invalid message or selector.
    InvalidRequest,
    /// Model assets have not loaded.
    NotInitialized,
    /// Asset fetch failed.
    AssetUnavailable,
    /// Asset integrity check failed.
    ChecksumMismatch,
    /// Tokenization failed.
    Tokenization,
    /// Inference failed.
    Inference,
    /// Request was cancelled.
    Cancelled,
}

/// Response emitted by the inference Worker.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "snake_case", deny_unknown_fields)]
pub enum WorkerResponse {
    /// Model initialization is advancing through a user-visible phase.
    Initializing {
        /// Human-readable loading phase.
        phase: String,
    },
    /// Model assets loaded and the Worker can run inference.
    Ready {
        /// Loaded model identity and provenance.
        model: ModelMetadata,
    },
    /// A valid generation became active.
    GenerationStarted {
        /// Correlated generation request.
        request_id: u64,
        /// Stable generation run ID.
        run_id: u64,
        /// Exact tokenized prompt accepted by the runtime.
        prompt_tokens: Vec<crate::TokenInfo>,
        /// Runtime-applied generation controls after clamping.
        config: GenerationConfig,
        /// Loaded model context limit.
        context_limit: usize,
    },
    /// One generated token was committed to the stream.
    TokenGenerated {
        /// Correlated generation request.
        request_id: u64,
        /// Stable generation run ID.
        run_id: u64,
        /// Compact committed step data.
        step: GenerationStepSummary,
    },
    /// A generation stream reached a terminal state.
    GenerationFinished {
        /// Correlated generation request.
        request_id: u64,
        /// Stable generation run ID.
        run_id: u64,
        /// Stable terminal reason.
        reason: GenerationStopReason,
    },
    /// A stored generation step was replayed as a fresh inspectable trace.
    GenerationStepTrace {
        /// Correlated replay request.
        request_id: u64,
        /// Streamed generation run containing the historical step.
        generation_run_id: u64,
        /// Zero-based historical step index.
        step_index: usize,
        /// Unchanged historical token-selection summary.
        step: GenerationStepSummary,
        /// Fresh full-context trace with its own inspectable run ID.
        summary: Box<RunSummary>,
    },
    /// Inference completed and can be inspected by run ID.
    RunComplete {
        /// Correlated request.
        request_id: u64,
        /// Run summary and stable run ID.
        summary: Box<RunSummary>,
    },
    /// One cached block inspection completed.
    BlockTrace {
        /// Correlated request.
        request_id: u64,
        /// Inspected run.
        run_id: u64,
        /// Detailed block trace.
        trace: Box<BlockTrace>,
    },
    /// One cached attention-head inspection completed.
    AttentionHeadTrace {
        /// Correlated request.
        request_id: u64,
        /// Inspected run.
        run_id: u64,
        /// Detailed head trace.
        trace: Box<AttentionHeadTrace>,
    },
    /// One cached token inspection completed.
    TokenTrace {
        /// Correlated request.
        request_id: u64,
        /// Inspected run.
        run_id: u64,
        /// Detailed token trace.
        trace: Box<TokenTrace>,
    },
    /// Request decoding or execution failed.
    Error {
        /// Correlated request when available.
        request_id: Option<u64>,
        /// Stable failure category.
        code: WorkerErrorCode,
        /// User-readable detail safe to show in the UI.
        message: String,
    },
}
