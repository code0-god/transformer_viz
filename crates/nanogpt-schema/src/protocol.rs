use crate::{EncodedTokens, SchemaVersion, TensorData, Trace, TraceMode};
use serde::{Deserialize, Serialize};

/// Request accepted by the inference Worker.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "snake_case", deny_unknown_fields)]
pub enum WorkerRequest {
    /// Load and verify model assets.
    Initialize {
        /// Contract version.
        schema_version: SchemaVersion,
        /// Correlated request.
        request_id: u32,
        /// Base-relative manifest URL.
        manifest_url: String,
    },
    /// Tokenize text without inference.
    Tokenize {
        /// Contract version.
        schema_version: SchemaVersion,
        /// Correlated request.
        request_id: u32,
        /// UTF-8 input.
        text: String,
    },
    /// Run inference and capture selected detail.
    Run {
        /// Contract version.
        schema_version: SchemaVersion,
        /// Correlated request.
        request_id: u32,
        /// UTF-8 prompt.
        prompt: String,
        /// Requested detail.
        trace_mode: TraceMode,
    },
    /// Run the Phase B Candle operation proof.
    RunOperations {
        /// Contract version.
        schema_version: SchemaVersion,
        /// Correlated request.
        request_id: u32,
    },
    /// Cancel active inference.
    Cancel {
        /// Contract version.
        schema_version: SchemaVersion,
        /// Request to cancel.
        request_id: u32,
    },
}

/// Serializable Candle operation smoke-test values.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct OperationResult {
    /// Backend name.
    pub backend: String,
    /// Matrix multiplication.
    pub matmul: TensorData,
    /// Flattened output.
    pub reshape: TensorData,
    /// Transposed output.
    pub transpose: TensorData,
    /// Softmax output.
    pub softmax: TensorData,
    /// `LayerNorm` output.
    pub layer_norm: TensorData,
    /// Exact GELU output.
    pub gelu: TensorData,
}

/// Stable machine-readable Worker failure category.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum WorkerErrorCode {
    /// Unsupported contract.
    UnsupportedVersion,
    /// Invalid message or config.
    InvalidRequest,
    /// Model not loaded.
    NotInitialized,
    /// Asset fetch failed.
    AssetUnavailable,
    /// Integrity check failed.
    ChecksumMismatch,
    /// Tokenization failed.
    Tokenization,
    /// Inference failed.
    Inference,
    /// Request cancelled.
    Cancelled,
}

/// User-readable Worker boundary error.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct WorkerError {
    /// Stable category.
    pub code: WorkerErrorCode,
    /// Correlated request if known.
    pub request_id: Option<u32>,
    /// UI-safe detail.
    pub message: String,
}

/// Response emitted by the inference Worker.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "snake_case", deny_unknown_fields)]
pub enum WorkerResponse {
    /// Worker WASM loaded.
    Ready {
        /// Contract version.
        schema_version: SchemaVersion,
    },
    /// Model assets loaded.
    Initialized {
        /// Contract version.
        schema_version: SchemaVersion,
        /// Correlated request.
        request_id: u32,
    },
    /// Tokenization completed.
    Tokens {
        /// Contract version.
        schema_version: SchemaVersion,
        /// Correlated request.
        request_id: u32,
        /// Encoded sequence.
        encoded: EncodedTokens,
    },
    /// Inference and trace completed.
    Trace {
        /// Contract version.
        schema_version: SchemaVersion,
        /// Correlated request.
        request_id: u32,
        /// Requested trace.
        trace: Box<Trace>,
    },
    /// Candle operation proof completed.
    OperationResult {
        /// Contract version.
        schema_version: SchemaVersion,
        /// Correlated request.
        request_id: u32,
        /// Typed finite tensors.
        result: Box<OperationResult>,
    },
    /// Request failed.
    Error {
        /// Contract version.
        schema_version: SchemaVersion,
        /// Typed error.
        error: WorkerError,
    },
}
