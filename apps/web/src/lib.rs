//! Browser application protocol and Candle spike.

pub mod app;
#[cfg(target_arch = "wasm32")]
pub mod components;
pub mod runtime;
#[doc(hidden)]
pub mod runtime_assets;
pub mod runtime_error;
#[doc(hidden)]
pub mod runtime_timer;
#[doc(hidden)]
pub mod runtime_trace;
pub mod source_map;
pub mod spike;
pub mod visualization;

use thiserror::Error;

/// Errors produced while starting the browser application.
#[derive(Debug, Error)]
pub enum AppError {
    /// The browser environment could not initialize the application.
    #[error("application startup failed: {0}")]
    Startup(String),
}
