//! Browser application protocol and Candle spike.

pub mod runtime;
#[doc(hidden)]
pub mod runtime_assets;
pub mod runtime_error;
#[doc(hidden)]
pub mod runtime_timer;
#[doc(hidden)]
pub mod runtime_trace;
pub mod spike;

use thiserror::Error;

/// Errors produced while starting the browser application.
#[derive(Debug, Error)]
pub enum AppError {
    /// The browser environment could not initialize the application.
    #[error("application startup failed: {0}")]
    Startup(String),
}
