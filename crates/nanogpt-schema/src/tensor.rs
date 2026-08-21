use crate::SchemaError;
use serde::{Deserialize, Serialize};

/// An f32 guaranteed to have a finite JSON representation.
#[derive(Debug, Clone, Copy, PartialEq, PartialOrd, Serialize, Deserialize)]
#[serde(try_from = "f32", into = "f32")]
pub struct FiniteF32(f32);

impl FiniteF32 {
    /// Creates a finite value.
    ///
    /// # Errors
    /// Returns [`SchemaError::NonFiniteTensorValue`] for NaN or infinity.
    pub const fn new(value: f32) -> Result<Self, SchemaError> {
        if value.is_finite() {
            Ok(Self(value))
        } else {
            Err(SchemaError::NonFiniteTensorValue)
        }
    }
    /// Returns the underlying value.
    #[must_use]
    pub const fn get(self) -> f32 {
        self.0
    }
}
impl TryFrom<f32> for FiniteF32 {
    type Error = SchemaError;
    fn try_from(value: f32) -> Result<Self, Self::Error> {
        Self::new(value)
    }
}
impl From<FiniteF32> for f32 {
    fn from(value: FiniteF32) -> Self {
        value.0
    }
}

/// Row-major tensor values with explicit dimensions.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct TensorData {
    /// Dimensions.
    pub shape: Vec<usize>,
    /// Finite row-major values.
    pub values: Vec<FiniteF32>,
}
impl TensorData {
    /// Creates shape-checked tensor data.
    ///
    /// # Errors
    /// Returns [`SchemaError::TensorLength`] on length mismatch.
    pub fn new(shape: Vec<usize>, values: Vec<FiniteF32>) -> Result<Self, SchemaError> {
        let expected = shape.iter().product();
        if expected != values.len() {
            return Err(SchemaError::TensorLength {
                expected,
                actual: values.len(),
            });
        }
        Ok(Self { shape, values })
    }
}

/// Compact statistics for an omitted tensor.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct TensorSummary {
    /// Educational name.
    pub name: String,
    /// Dimensions.
    pub shape: Vec<usize>,
    /// Minimum.
    pub minimum: FiniteF32,
    /// Maximum.
    pub maximum: FiniteF32,
    /// Arithmetic mean.
    pub mean: FiniteF32,
}

/// Explicit allowed/blocked attention cells.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct AttentionMask {
    /// Query rows.
    pub rows: usize,
    /// Key columns.
    pub columns: usize,
    /// Row-major allowed cells.
    pub allowed: Vec<bool>,
}
impl AttentionMask {
    /// Creates a shape-checked explicit mask.
    ///
    /// # Errors
    /// Returns [`SchemaError::MaskLength`] on length mismatch.
    pub fn new(rows: usize, columns: usize, allowed: Vec<bool>) -> Result<Self, SchemaError> {
        let expected = rows.saturating_mul(columns);
        if expected != allowed.len() {
            return Err(SchemaError::MaskLength {
                expected,
                actual: allowed.len(),
            });
        }
        Ok(Self {
            rows,
            columns,
            allowed,
        })
    }
}
