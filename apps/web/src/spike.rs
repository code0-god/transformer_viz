//! Exact shared Worker protocol handler and retained Candle CPU operation proof.

use candle_core::{D, Device, Tensor};
use nanogpt_schema::{
    EmbeddingTrace, FiniteF32, GptConfig, LayerSummary, LogitsTrace, ModelMetadata, OperationId,
    RunSummary, SchemaVersion, TensorSnapshot, TokenizerConfig, WorkerErrorCode,
};
pub use nanogpt_schema::{WorkerRequest, WorkerResponse};
use nanogpt_tokenizer::{Tokenizer, TokenizerError};
use thiserror::Error;

const LAYER_NORM_EPSILON: f64 = 1e-5;
const WORKER_TOKEN_LIMIT: usize = 24;

/// Retained values from the Phase B Candle operation proof.
#[derive(Debug, Clone, PartialEq)]
pub struct SpikeResult {
    /// Tensor backend name.
    pub backend: String,
    /// Matrix multiplication result.
    pub matmul: TensorSnapshot,
    /// Flattened matrix result.
    pub reshape: TensorSnapshot,
    /// Transposed matrix result.
    pub transpose: TensorSnapshot,
    /// Last-axis softmax result.
    pub softmax: TensorSnapshot,
    /// Layer normalization result.
    pub layer_norm: TensorSnapshot,
    /// Exact GELU result.
    pub gelu: TensorSnapshot,
}

/// Errors from deterministic Worker request handling.
#[derive(Debug, Error)]
pub enum SpikeError {
    /// Candle could not evaluate or materialize an operation.
    #[error("Candle CPU operation failed: {0}")]
    Candle(#[from] candle_core::Error),
    /// A tensor result violated the shared trace contract.
    #[error("operation result violated the trace schema: {0}")]
    Schema(#[from] nanogpt_schema::SchemaError),
    /// Tokenizer configuration or decoding failed.
    #[error("tokenization failed: {0}")]
    Tokenizer(#[from] TokenizerError),
    /// Generated source correspondence is invalid.
    #[error("source map is invalid: {0}")]
    SourceMap(#[from] crate::source_map::SourceMapError),
    /// This phase does not have a cached model trace for inspection.
    #[error("inspection is not available before model initialization")]
    UnsupportedInspection,
}

fn tensor_snapshot(name: &str, tensor: &Tensor) -> Result<TensorSnapshot, SpikeError> {
    let raw = tensor.contiguous()?.flatten_all()?.to_vec1::<f32>()?;
    let values = raw
        .into_iter()
        .map(FiniteF32::new)
        .collect::<Result<Vec<_>, _>>()?;
    Ok(TensorSnapshot::new(
        name.to_owned(),
        tensor.dims().to_vec(),
        values,
    )?)
}

/// Runs the retained Phase B operation graph entirely on Candle's CPU device.
///
/// # Errors
/// Returns [`SpikeError`] when Candle or finite snapshot conversion fails.
pub fn run_candle_spike() -> Result<SpikeResult, SpikeError> {
    let device = Device::Cpu;
    let left = Tensor::new(&[[1_f32, 2.0], [3.0, 4.0]], &device)?;
    let right = Tensor::new(&[[5_f32, 6.0], [7.0, 8.0]], &device)?;
    let matmul = left.matmul(&right)?;
    let reshape = matmul.reshape(4)?;
    let transpose = matmul.transpose(0, 1)?;
    let softmax = candle_nn::ops::softmax(&matmul, D::Minus1)?;
    let mean = matmul.mean_keepdim(D::Minus1)?;
    let centered = matmul.broadcast_sub(&mean)?;
    let variance = centered.sqr()?.mean_keepdim(D::Minus1)?;
    let denominator = variance.affine(1.0, LAYER_NORM_EPSILON)?.sqrt()?;
    let layer_norm = centered.broadcast_div(&denominator)?;
    let gelu = Tensor::new(&[-1_f32, 0.0, 1.0, 2.0], &device)?.gelu_erf()?;

    Ok(SpikeResult {
        backend: "Candle CPU".to_owned(),
        matmul: tensor_snapshot("matmul", &matmul)?,
        reshape: tensor_snapshot("reshape", &reshape)?,
        transpose: tensor_snapshot("transpose", &transpose)?,
        softmax: tensor_snapshot("softmax", &softmax)?,
        layer_norm: tensor_snapshot("layer_norm", &layer_norm)?,
        gelu: tensor_snapshot("gelu", &gelu)?,
    })
}

/// Handles an exact binding request using code shared by native tests and Worker WASM.
///
/// # Errors
/// Returns [`SpikeError`] when tokenization or the retained Candle graph fails.
pub fn handle_worker_request(request: WorkerRequest) -> Result<WorkerResponse, SpikeError> {
    match request {
        WorkerRequest::Initialize { .. } => Ok(WorkerResponse::Initializing {
            phase: "model assets".to_owned(),
        }),
        WorkerRequest::Run { request_id, text } => {
            let tokenizer = Tokenizer::new(TokenizerConfig::byte_fallback(WORKER_TOKEN_LIMIT))?;
            let tokens = tokenizer.encode(&text).tokens;
            let spike = run_candle_spike()?;
            let source = crate::source_map::source_reference(OperationId::Attention)?;
            let embedding_source = crate::source_map::source_reference(OperationId::Embedding)?;
            let summary = RunSummary {
                schema_version: SchemaVersion::current(),
                run_id: request_id,
                tokens,
                layers: vec![LayerSummary {
                    layer: 0,
                    input: spike.matmul.stats.clone(),
                    attention: spike.softmax.stats.clone(),
                    mlp: spike.gelu.stats.clone(),
                    output: spike.layer_norm.stats.clone(),
                }],
                duration_ms: FiniteF32::new(0.0)?,
                embeddings: EmbeddingTrace {
                    token: spike.matmul.clone(),
                    position: spike.reshape.clone(),
                    sum: spike.transpose.clone(),
                    source: embedding_source,
                },
                final_layer_norm: spike.layer_norm,
                logits: LogitsTrace {
                    logits: spike.gelu,
                    top_k: Vec::new(),
                    source,
                },
            };
            Ok(WorkerResponse::RunComplete {
                request_id,
                summary: Box::new(summary),
            })
        }
        WorkerRequest::Generate { .. }
        | WorkerRequest::StopGeneration { .. }
        | WorkerRequest::ContinueGeneration { .. }
        | WorkerRequest::InspectGenerationStep { .. }
        | WorkerRequest::InspectBlock { .. }
        | WorkerRequest::InspectAttentionHead { .. }
        | WorkerRequest::InspectToken { .. }
        | WorkerRequest::Cancel { .. } => Err(SpikeError::UnsupportedInspection),
    }
}

/// Converts an execution failure to the exact user-facing error response.
#[must_use]
pub fn worker_error(error: &SpikeError) -> WorkerResponse {
    WorkerResponse::Error {
        request_id: None,
        code: match error {
            SpikeError::Tokenizer(_) => WorkerErrorCode::Tokenization,
            SpikeError::Candle(_) | SpikeError::Schema(_) | SpikeError::SourceMap(_) => {
                WorkerErrorCode::Inference
            }
            SpikeError::UnsupportedInspection => WorkerErrorCode::NotInitialized,
        },
        message: error.to_string(),
    }
}

/// Metadata for the retained pre-model Worker proof.
#[must_use]
pub fn spike_model_metadata() -> ModelMetadata {
    ModelMetadata {
        name: "Candle CPU operation proof".to_owned(),
        corpus: "deterministic Phase B fixtures".to_owned(),
        nanogpt_commit: include_str!("../../../reference/NANOGPT_COMMIT")
            .trim()
            .to_owned(),
        parameter_count: 0,
        config: GptConfig {
            block_size: WORKER_TOKEN_LIMIT,
            vocab_size: 259,
            n_layer: 1,
            n_head: 1,
            n_embd: 2,
            bias: true,
        },
    }
}
