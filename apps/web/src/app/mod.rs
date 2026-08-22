//! Browser application state and Worker client.

pub mod playback;
pub mod selection;
pub mod state;
#[cfg(target_arch = "wasm32")]
pub mod worker_client;
