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

/// Finite summary statistics for a tensor.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct TensorStats {
    /// Minimum value.
    pub minimum: FiniteF32,
    /// Maximum value.
    pub maximum: FiniteF32,
    /// Arithmetic mean.
    pub mean: FiniteF32,
}

/// Named row-major tensor values with dimensions and summary statistics.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct TensorSnapshot {
    /// Educational tensor name.
    pub name: String,
    /// Tensor dimensions.
    pub shape: Vec<usize>,
    /// Finite row-major values.
    pub values: Vec<FiniteF32>,
    /// Finite summary statistics.
    pub stats: TensorStats,
}

impl TensorSnapshot {
    /// Creates shape-checked tensor data.
    ///
    /// # Errors
    /// Returns [`SchemaError::TensorLength`] on length mismatch.
    pub fn new(
        name: String,
        shape: Vec<usize>,
        values: Vec<FiniteF32>,
    ) -> Result<Self, SchemaError> {
        let expected = shape.iter().product();
        if expected != values.len() {
            return Err(SchemaError::TensorLength {
                expected,
                actual: values.len(),
            });
        }
        let Some(first) = values.first().copied() else {
            return Err(SchemaError::EmptyTensor);
        };
        let mut minimum = first.get();
        let mut maximum = first.get();
        let mut mean = 0.0_f32;
        let mut count = 0.0_f32;
        for value in &values {
            let value = value.get();
            minimum = minimum.min(value);
            maximum = maximum.max(value);
            count += 1.0;
            mean += (value - mean) / count;
        }
        let stats = TensorStats {
            minimum: FiniteF32::new(minimum)?,
            maximum: FiniteF32::new(maximum)?,
            mean: FiniteF32::new(mean)?,
        };
        Ok(Self {
            name,
            shape,
            values,
            stats,
        })
    }
}

/// Explicit allowed/blocked attention cells.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct MaskSnapshot {
    /// Query row count.
    pub rows: usize,
    /// Key column count.
    pub columns: usize,
    /// Row-major cells; `true` means attention is allowed.
    pub allowed: Vec<bool>,
}

impl MaskSnapshot {
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
