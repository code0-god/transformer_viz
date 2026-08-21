# ADR 0002: Candle in the browser Worker

- Status: Accepted
- Date: 2026-08-21

## Context

The preferred model implementation uses `candle-core` and `candle-nn` with f32 CPU operations in
WebAssembly. Phase B must prove that Candle can execute in a distinct Worker WASM binary before the
model and trace layers depend on it.

Trunk 0.21.14 documents a Rust `data-type="worker"` asset and a module-worker loader shim. Candle
0.11.0 publishes browser examples using `Device::Cpu`; its default feature set does not enable
native Accelerate, MKL, Metal, or CUDA backends.

## Decision

Use Candle 0.11.0 with default CPU features and compile both the Leptos CSR app and Worker for
`wasm32-unknown-unknown`. The Worker creates `Device::Cpu` and performs matrix multiplication,
reshape, transpose, last-dimension softmax, LayerNorm-equivalent normalization with epsilon 1e-5,
and `gelu_erf`, Candle's exact PyTorch-default GELU operation.

Use direct `wasm-bindgen` and `web-sys` Worker bindings with serde-wasm-bindgen at the typed message
boundary. This is the smallest integration and follows Trunk's maintained worker example directly;
`gloo-worker` would add an abstraction and lifecycle protocol without reducing this spike's code or
risk.

## Consequences

No fallback tensor backend is authorized or needed. Tensor ownership and Candle execution remain in
the Worker binary; the main app receives only serialized result values. Module Worker support is the
browser compatibility floor.
