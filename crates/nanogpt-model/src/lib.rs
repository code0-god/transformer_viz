//! Explicit nanoGPT-compatible transformer inference.

use thiserror::Error;

/// Errors produced while loading or evaluating a model.
#[derive(Debug, Error)]
pub enum ModelError {
    /// A model asset did not match the expected format.
    #[error("invalid model asset: {0}")]
    InvalidAsset(String),
}
