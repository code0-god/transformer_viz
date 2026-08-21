//! Shared Worker protocol handlers and the Phase B Candle CPU operation graph.

use candle_core::{D, Device, Tensor};
use nanogpt_schema::{
    FiniteF32, OperationResult, SchemaVersion, TensorData, TokenizerConfig, WorkerError,
    WorkerErrorCode,
};
pub use nanogpt_schema::{WorkerRequest, WorkerResponse};
use nanogpt_tokenizer::{Tokenizer, TokenizerError};
use thiserror::Error;

const LAYER_NORM_EPSILON: f64 = 1e-5;
const WORKER_TOKEN_LIMIT: usize = 24;

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
    /// This phase does not execute the requested model operation yet.
    #[error("request is not available before model initialization")]
    UnsupportedRequest,
}

fn tensor_data(tensor: &Tensor) -> Result<TensorData, SpikeError> {
    let values = tensor
        .contiguous()?
        .flatten_all()?
        .to_vec1::<f32>()?
        .into_iter()
        .map(FiniteF32::new)
        .collect::<Result<Vec<_>, _>>()?;
    Ok(TensorData::new(tensor.dims().to_vec(), values)?)
}

/// Handles a typed request using code shared by native tests and Worker WASM.
///
/// # Errors
/// Returns [`SpikeError`] when tokenization or the Candle operation graph fails.
pub fn handle_worker_request(request: WorkerRequest) -> Result<WorkerResponse, SpikeError> {
    match request {
        WorkerRequest::Tokenize {
            request_id, text, ..
        } => {
            let tokenizer = Tokenizer::new(TokenizerConfig::byte_fallback(WORKER_TOKEN_LIMIT))?;
            Ok(WorkerResponse::Tokens {
                schema_version: SchemaVersion::current(),
                request_id,
                encoded: tokenizer.encode(&text),
            })
        }
        WorkerRequest::RunOperations { request_id, .. } => run_candle_spike(request_id),
        WorkerRequest::Initialize { .. }
        | WorkerRequest::Run { .. }
        | WorkerRequest::Cancel { .. } => Err(SpikeError::UnsupportedRequest),
    }
}

/// Converts an execution failure to a typed user-facing response.
#[must_use]
pub fn worker_error(error: &SpikeError) -> WorkerResponse {
    WorkerResponse::Error {
        schema_version: SchemaVersion::current(),
        error: WorkerError {
            code: match error {
                SpikeError::Tokenizer(_) => WorkerErrorCode::Tokenization,
                SpikeError::Candle(_) | SpikeError::Schema(_) => WorkerErrorCode::Inference,
                SpikeError::UnsupportedRequest => WorkerErrorCode::NotInitialized,
            },
            request_id: None,
            message: error.to_string(),
        },
    }
}

fn run_candle_spike(request_id: u32) -> Result<WorkerResponse, SpikeError> {
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

    Ok(WorkerResponse::OperationResult {
        schema_version: SchemaVersion::current(),
        request_id,
        result: Box::new(OperationResult {
            backend: "Candle CPU".to_owned(),
            matmul: tensor_data(&matmul)?,
            reshape: tensor_data(&reshape)?,
            transpose: tensor_data(&transpose)?,
            softmax: tensor_data(&softmax)?,
            layer_norm: tensor_data(&layer_norm)?,
            gelu: tensor_data(&gelu)?,
        }),
    })
}
