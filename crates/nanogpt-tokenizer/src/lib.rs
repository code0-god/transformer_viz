//! Deterministic tokenizer for the bundled nanoGPT-compatible model.

use thiserror::Error;

/// Errors produced while tokenizing model input.
#[derive(Debug, Error)]
pub enum TokenizerError {
    /// Input cannot be represented by the configured vocabulary.
    #[error("input is not representable by the configured vocabulary")]
    UnrepresentableInput,
}
