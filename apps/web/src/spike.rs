//! Typed Worker protocol and the Phase B Candle CPU operation graph.

use candle_core::{D, Device, Tensor};
use serde::{Deserialize, Serialize};
use thiserror::Error;

const LAYER_NORM_EPSILON: f64 = 1e-5;

/// A request accepted by the inference Worker.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "snake_case")]
pub enum WorkerRequest {
    /// Run the deterministic Candle operation spike.
    Run {
        /// Correlates the response with this request.
        request_id: u32,
    },
}

/// A response emitted by the inference Worker.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "snake_case")]
pub enum WorkerResponse {
    /// The Worker loaded its distinct WASM binary and can receive requests.
    Ready,
    /// Candle completed the requested operation graph.
    Result {
        /// Correlates this response with its request.
        request_id: u32,
        /// Typed tensors produced by Candle.
        result: Box<SpikeResult>,
    },
    /// The Worker rejected a request or Candle failed.
    Error {
        /// Human-readable boundary error.
        message: String,
    },
}

/// Values returned from the Candle CPU spike.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct SpikeResult {
    /// Backend used by Candle.
    pub backend: String,
    /// Two by two matrix multiplication.
    pub matmul: TensorData,
    /// Matrix multiplication reshaped to one dimension.
    pub reshape: TensorData,
    /// Matrix multiplication with its axes transposed.
    pub transpose: TensorData,
    /// Last-dimension softmax of the matrix multiplication.
    pub softmax: TensorData,
    /// LayerNorm-equivalent output using epsilon 1e-5.
    pub layer_norm: TensorData,
    /// Exact PyTorch-default GELU output.
    pub gelu: TensorData,
}

/// Serializable f32 tensor data.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct TensorData {
    /// Row-major tensor shape.
    pub shape: Vec<usize>,
    /// Row-major tensor values.
    pub values: Vec<f32>,
}

/// Errors from the deterministic Candle operation graph.
#[derive(Debug, Error)]
pub enum SpikeError {
    /// Candle could not evaluate an operation or materialize its result.
    #[error("Candle CPU operation failed: {0}")]
    Candle(#[from] candle_core::Error),
}

impl TensorData {
    fn from_tensor(tensor: &Tensor) -> Result<Self, SpikeError> {
        Ok(Self {
            shape: tensor.dims().to_vec(),
            values: tensor.contiguous()?.flatten_all()?.to_vec1::<f32>()?,
        })
    }
}

/// Runs the Phase B operation graph entirely on Candle's CPU device.
///
/// # Errors
/// Returns [`SpikeError`] if Candle cannot evaluate or copy an operation result.
pub fn run_candle_spike(request: WorkerRequest) -> Result<WorkerResponse, SpikeError> {
    let WorkerRequest::Run { request_id } = request;
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

    let gelu_input = Tensor::new(&[-1_f32, 0.0, 1.0, 2.0], &device)?;
    let gelu = gelu_input.gelu_erf()?;

    Ok(WorkerResponse::Result {
        request_id,
        result: Box::new(SpikeResult {
            backend: "Candle CPU".to_owned(),
            matmul: TensorData::from_tensor(&matmul)?,
            reshape: TensorData::from_tensor(&reshape)?,
            transpose: TensorData::from_tensor(&transpose)?,
            softmax: TensorData::from_tensor(&softmax)?,
            layer_norm: TensorData::from_tensor(&layer_norm)?,
            gelu: TensorData::from_tensor(&gelu)?,
        }),
    })
}
