//! Transformer execution trace types.

use thiserror::Error;

/// Errors produced while constructing an execution trace.
#[derive(Debug, Error)]
pub enum TraceError {
    /// A requested trace selector is outside the model configuration.
    #[error("trace selector is outside the model configuration")]
    InvalidSelector,
}
