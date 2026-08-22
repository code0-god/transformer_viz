# Architecture

Transformer Viz is a backend-free static application. UI rendering and inference are split so
tensor work cannot block the browser's main thread.

## Workspace boundaries

- `nanogpt-schema`: serialized request, response, and model configuration contracts.
- `nanogpt-tokenizer`: deterministic browser-side tokenization.
- `nanogpt-model`: nanoGPT-compatible model and asset loading.
- `nanogpt-trace`: intermediate tensor and execution trace contracts.
- `transformer-viz-web`: Leptos CSR application and Worker binary. Both deserialize the versioned
  `nanogpt-schema` protocol; native tests invoke the same handler compiled into Worker WASM.

Dependencies point inward from the web application to the four responsibility crates. The pinned
`reference/nanoGPT` submodule remains outside the Cargo graph and is used only to establish
provenance and generate golden fixtures.

## Runtime flow

1. Trunk loads the Leptos CSR app and starts `worker_loader.js` as a module Worker.
2. The app sends a base-relative manifest URL through the typed serde protocol.
3. The Worker resolves config, tokenizer, and safetensors names relative to that manifest, fetches
   them from the same origin, verifies SHA-256, and constructs the Candle CPU model.
4. A run tokenizes UTF-8, executes the explicit nanoGPT forward path, and caches the selected-layer
   input. Follow-up block/head/token requests replay from that cache rather than the UI rerunning
   inference.
5. The app renders finite snapshots, explicit causal masks, source mappings, and 18 real operation
   boundaries. Model tensors never move to the main thread except as requested trace values.

## Deployment boundary

The deliverable is `apps/web/dist`, produced by Trunk. Model assets and Worker modules use
base-relative, same-origin URLs. `scripts/build-web.sh` validates root or slash-delimited subpath
builds and rejects server/build scripts in the artifact. No backend, external model download, or
Python runtime belongs in the deployed application.

## Toolchain constants

- Rust: `1.94.0`
- WASM target: `wasm32-unknown-unknown`
- Trunk: `0.21.14`

These constants are mirrored in `rust-toolchain.toml`, `scripts/bootstrap.sh`, and both workflows.
Clippy runs over the native workspace; the web package has a separate WASM check because one Cargo
invocation cannot compile native-only transitive targets as `wasm32-unknown-unknown`.
