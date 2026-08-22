//! Checked semantic addresses into row-major trace tensors.

mod error;
mod kinds;

use nanogpt_schema::{FiniteF32, TensorSnapshot};

pub use error::TensorAddressError;

/// One named coordinate shown by the Tensor Inspector.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct TensorAxis {
    /// Stable semantic axis name.
    pub name: &'static str,
    /// Zero-based selected coordinate.
    pub index: usize,
}

/// A checked selected value and bounded row slice borrowed from a snapshot.
#[derive(Debug, Clone, PartialEq)]
pub struct TensorAddress<'a> {
    axes: Vec<TensorAxis>,
    flat_index: usize,
    value: FiniteF32,
    slice_start: usize,
    slice: &'a [FiniteF32],
}

impl<'a> TensorAddress<'a> {
    /// Returns a semantic coordinate by stable axis name.
    #[must_use]
    pub fn axis(&self, name: &str) -> Option<usize> {
        self.axes
            .iter()
            .find(|axis| axis.name == name)
            .map(|axis| axis.index)
    }

    /// Returns all semantic coordinates in display order.
    #[must_use]
    pub fn axes(&self) -> &[TensorAxis] {
        &self.axes
    }

    /// Returns the checked row-major flat index.
    #[must_use]
    pub const fn flat_index(&self) -> usize {
        self.flat_index
    }

    /// Returns the exact selected finite value.
    #[must_use]
    pub const fn value(&self) -> FiniteF32 {
        self.value
    }

    /// Returns the global flat index where the bounded slice begins.
    #[must_use]
    pub const fn slice_start(&self) -> usize {
        self.slice_start
    }

    /// Returns a bounded slice from the selected semantic row.
    #[must_use]
    pub const fn slice(&self) -> &'a [FiniteF32] {
        self.slice
    }

    fn resolve(
        tensor: &'a TensorSnapshot,
        axes: Vec<TensorAxis>,
        row_start: usize,
        row_width: usize,
        local: usize,
        radius: usize,
    ) -> Result<Self, TensorAddressError> {
        validate_values(tensor)?;
        let flat_index = row_start
            .checked_add(local)
            .ok_or_else(|| overflow(tensor))?;
        let value = tensor
            .values
            .get(flat_index)
            .copied()
            .ok_or_else(|| bounds(tensor))?;
        let local_start = local.saturating_sub(radius);
        let local_end = local
            .saturating_add(radius)
            .saturating_add(1)
            .min(row_width);
        let slice_start = row_start
            .checked_add(local_start)
            .ok_or_else(|| overflow(tensor))?;
        let slice_end = row_start
            .checked_add(local_end)
            .ok_or_else(|| overflow(tensor))?;
        let slice = tensor
            .values
            .get(slice_start..slice_end)
            .ok_or_else(|| bounds(tensor))?;
        Ok(Self {
            axes,
            flat_index,
            value,
            slice_start,
            slice,
        })
    }
}

fn require_rank<const N: usize>(tensor: &TensorSnapshot) -> Result<[usize; N], TensorAddressError> {
    tensor
        .shape
        .as_slice()
        .try_into()
        .map_err(|_| TensorAddressError::InvalidRank {
            tensor_id: tensor.id.clone(),
            expected: N,
            shape: tensor.shape.clone(),
        })
}

fn validate_values(tensor: &TensorSnapshot) -> Result<(), TensorAddressError> {
    let expected = tensor
        .shape
        .iter()
        .try_fold(1_usize, |total, dimension| total.checked_mul(*dimension))
        .ok_or_else(|| overflow(tensor))?;
    if expected == tensor.values.len() {
        Ok(())
    } else {
        Err(TensorAddressError::ShapeValueMismatch {
            tensor_id: tensor.id.clone(),
            expected,
            actual: tensor.values.len(),
        })
    }
}

fn clamp(index: usize, width: usize, tensor: &TensorSnapshot) -> Result<usize, TensorAddressError> {
    width
        .checked_sub(1)
        .map(|last| index.min(last))
        .ok_or_else(|| bounds(tensor))
}

fn bounds(tensor: &TensorSnapshot) -> TensorAddressError {
    TensorAddressError::SelectionOutOfBounds {
        tensor_id: tensor.id.clone(),
        shape: tensor.shape.clone(),
    }
}

fn overflow(tensor: &TensorSnapshot) -> TensorAddressError {
    TensorAddressError::ShapeOverflow {
        tensor_id: tensor.id.clone(),
    }
}
