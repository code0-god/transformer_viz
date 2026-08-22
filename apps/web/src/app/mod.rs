//! Browser application state and Worker client.

#[cfg(any(test, target_arch = "wasm32"))]
pub mod architecture;
#[cfg(test)]
mod architecture_tests;
pub mod generation;
#[cfg(test)]
mod generation_tests;
#[cfg(test)]
mod inspector_state_tests;
pub mod narrative;
#[cfg(test)]
mod narrative_tests;
pub mod playback;
pub mod selection;
pub mod state;
mod state_generation;
mod state_response;
#[cfg(test)]
mod state_test_fixtures;
#[cfg(test)]
mod state_tests;
pub mod ui_state;
#[cfg(target_arch = "wasm32")]
pub mod worker_client;
