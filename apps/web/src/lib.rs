//! Browser application protocol and Candle spike.

pub mod app;
#[cfg(target_arch = "wasm32")]
pub mod components;
pub mod guided_math;
mod guided_math_types;
pub mod runtime;
#[doc(hidden)]
pub mod runtime_assets;
pub mod runtime_error;
#[doc(hidden)]
pub mod runtime_generation;
#[doc(hidden)]
pub mod runtime_timer;
#[doc(hidden)]
pub mod runtime_trace;
#[doc(hidden)]
pub mod runtime_trace_support;
pub mod source_map;
pub mod spike;
pub mod tensor_address;
pub mod trace_lookup;
pub mod visualization;

#[cfg(test)]
#[path = "tensor_address_tests.rs"]
mod tensor_address_tests;
#[cfg(test)]
#[path = "trace_lookup_tests.rs"]
mod trace_lookup_tests;

use thiserror::Error;

/// Errors produced while starting the browser application.
#[derive(Debug, Error)]
pub enum AppError {
    /// The browser environment could not initialize the application.
    #[error("application startup failed: {0}")]
    Startup(String),
}
