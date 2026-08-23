//! Platform monotonic inference timer.

#[cfg(not(target_arch = "wasm32"))]
use std::time::Instant;
#[cfg(target_arch = "wasm32")]
use wasm_bindgen::JsCast as _;
#[cfg(target_arch = "wasm32")]
use web_sys::DedicatedWorkerGlobalScope;

/// Timer backed by `performance.now()` in the Worker and `Instant` in native tests.
#[cfg(not(target_arch = "wasm32"))]
#[derive(Debug)]
pub struct InferenceTimer(Instant);

#[cfg(not(target_arch = "wasm32"))]
impl InferenceTimer {
    /// Starts a monotonic measurement.
    #[must_use]
    pub fn start() -> Self {
        Self(Instant::now())
    }

    /// Returns elapsed milliseconds as finite-compatible f32.
    #[must_use]
    pub fn elapsed_ms(&self) -> f32 {
        self.0.elapsed().as_secs_f32() * 1_000.0
    }
}

/// Timer backed by `performance.now()` in the Worker and `Instant` in native tests.
#[cfg(target_arch = "wasm32")]
#[derive(Debug)]
pub struct InferenceTimer(f64);

#[cfg(target_arch = "wasm32")]
impl InferenceTimer {
    /// Starts a monotonic measurement.
    #[must_use]
    pub fn start() -> Self {
        Self(browser_now())
    }

    /// Returns elapsed milliseconds as finite-compatible f32.
    #[must_use]
    pub fn elapsed_ms(&self) -> f32 {
        js_sys::Math::fround(browser_now() - self.0)
    }
}

#[cfg(target_arch = "wasm32")]
fn browser_now() -> f64 {
    let scope = js_sys::global().unchecked_into::<DedicatedWorkerGlobalScope>();
    scope
        .performance()
        .map_or_else(js_sys::Date::now, |performance| performance.now())
}
