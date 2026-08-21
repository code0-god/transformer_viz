//! Browser application protocol and Candle spike.

pub mod spike;

use thiserror::Error;

/// Errors produced while starting the browser application.
#[derive(Debug, Error)]
pub enum AppError {
    /// The browser environment could not initialize the application.
    #[error("application startup failed: {0}")]
    Startup(String),
}
