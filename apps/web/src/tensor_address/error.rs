use thiserror::Error;

/// Invalid tensor shape or semantic selector.
#[derive(Debug, Clone, PartialEq, Eq, Error)]
pub enum TensorAddressError {
    /// The tensor rank does not match the selected address kind.
    #[error("tensor '{tensor_id}' requires rank {expected}, found shape {shape:?}")]
    InvalidRank {
        /// Stable tensor ID.
        tensor_id: String,
        /// Required rank.
        expected: usize,
        /// Captured shape.
        shape: Vec<usize>,
    },
    /// Shape dimensions do not describe the captured value count.
    #[error("tensor '{tensor_id}' shape expects {expected} values, found {actual}")]
    ShapeValueMismatch {
        /// Stable tensor ID.
        tensor_id: String,
        /// Product of captured dimensions.
        expected: usize,
        /// Captured value count.
        actual: usize,
    },
    /// A non-feature selector is outside the captured tensor.
    #[error("tensor '{tensor_id}' selector is outside shape {shape:?}")]
    SelectionOutOfBounds {
        /// Stable tensor ID.
        tensor_id: String,
        /// Captured shape.
        shape: Vec<usize>,
    },
    /// Shape arithmetic cannot be represented by `usize`.
    #[error("tensor '{tensor_id}' shape overflows address space")]
    ShapeOverflow {
        /// Stable tensor ID.
        tensor_id: String,
    },
}
