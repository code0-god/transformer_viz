//! Browser application state and Worker client.

#[cfg(any(test, target_arch = "wasm32"))]
pub mod architecture;
#[cfg(test)]
mod architecture_tests;
pub mod generation;
#[cfg(any(test, target_arch = "wasm32"))]
#[doc(hidden)]
#[path = "../components/guided/visuals/generation_sampling/sampling_contract.rs"]
pub mod generation_sampling_contract;
#[cfg(any(test, target_arch = "wasm32"))]
#[doc(hidden)]
#[path = "../components/guided/visuals/generation_sampling/projection.rs"]
pub mod generation_sampling_projection;
#[cfg(test)]
mod generation_tests;
#[cfg(test)]
mod inspector_state_tests;
pub mod narrative;
#[cfg(test)]
mod narrative_tests;
pub mod playback;
pub mod selection;
#[cfg(test)]
mod source_precedence_tests;
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
