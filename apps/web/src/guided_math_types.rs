//! Typed evidence and failures returned by guided numerical reconstruction.

use crate::trace_lookup::TraceLookupError;
use thiserror::Error;

/// A selected Q/K score reconstructed from per-feature products.
#[derive(Debug, Clone, PartialEq)]
pub struct ScoreEvidence {
    /// Products `q_i * k_i` in feature order.
    pub contributions: Vec<f32>,
    /// Sum of all feature products.
    pub dot: f32,
    /// Captured unscaled score.
    pub raw: f32,
    /// Absolute reconstruction error for the unscaled score.
    pub raw_error: f32,
    /// Captured score after division by `sqrt(D)`.
    pub scaled: f32,
    /// Absolute error between captured and reconstructed scaled scores.
    pub scaled_error: f32,
    /// Whether the actual causal mask allows this cell.
    pub allowed: bool,
}

/// One complete probability row and its causal proof.
#[derive(Debug, Clone, PartialEq)]
pub struct ProbabilityEvidence {
    /// All key probabilities in order.
    pub values: Vec<f32>,
    /// Sum across every key.
    pub sum: f32,
    /// Probabilities at keys later than the selected query.
    pub future: Vec<f32>,
}

/// Full `P[q,k] * V[k,d]` reconstruction for one query.
#[derive(Debug, Clone, PartialEq)]
pub struct ValueEvidence {
    /// Row-major key-by-feature contribution matrix.
    pub contributions: Vec<f32>,
    /// Sum over keys for each output feature.
    pub feature_sums: Vec<f32>,
    /// Captured attended output row.
    pub captured: Vec<f32>,
    /// Maximum absolute difference across output features.
    pub output_error: f32,
    /// Number of key rows in the contribution matrix.
    pub keys: usize,
    /// Number of value features in each row.
    pub features: usize,
}

/// Shape or selector failures while reconstructing guided mathematics.
#[derive(Debug, Clone, PartialEq, Eq, Error)]
pub enum GuidedMathError {
    /// A tensor does not satisfy its required checked shape.
    #[error(transparent)]
    Tensor(#[from] TraceLookupError),
    /// Two real trace dimensions violate a required cross-tensor invariant.
    #[error("{context} dimension mismatch: expected {expected}, found {actual}")]
    DimensionMismatch {
        /// Name of the invariant being checked.
        context: &'static str,
        /// Required dimension.
        expected: usize,
        /// Captured dimension.
        actual: usize,
    },
    /// The explicit mask and selected matrix do not agree in size.
    #[error("attention mask selector is outside {rows} x {cols}")]
    MaskSelection {
        /// Query row count.
        rows: usize,
        /// Key column count.
        cols: usize,
    },
}
