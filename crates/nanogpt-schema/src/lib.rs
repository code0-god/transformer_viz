//! Shared boundary types for the application and inference worker.

use thiserror::Error;

/// Errors produced while decoding a worker message.
#[derive(Debug, Error)]
pub enum MessageError {
    /// The message uses a protocol version this build does not support.
    #[error("unsupported protocol version: {0}")]
    UnsupportedVersion(u32),
}
