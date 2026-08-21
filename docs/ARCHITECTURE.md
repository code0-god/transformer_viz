# Architecture

Transformer Viz is a backend-free static application. The final system will split UI rendering
from inference so tensor work cannot block the browser's main thread.

## Workspace boundaries

- `nanogpt-schema`: serialized request, response, and model configuration contracts.
- `nanogpt-tokenizer`: deterministic browser-side tokenization.
- `nanogpt-model`: nanoGPT-compatible model and asset loading.
- `nanogpt-trace`: intermediate tensor and execution trace contracts.
- `transformer-viz-web`: Leptos CSR application and Worker binary. Both deserialize the versioned
  `nanogpt-schema` protocol; native tests invoke the same handler compiled into Worker WASM.

Dependencies will point inward from the web application to the four responsibility crates. The
pinned `reference/nanoGPT` submodule remains outside the Cargo graph and is used only to establish
provenance and generate later golden fixtures.

## Deployment boundary

The deliverable is a static directory produced by Trunk. Model assets and Worker modules will use
base-relative, same-origin URLs. No backend, external model download, or Python runtime belongs in
the deployed application.

## Toolchain constants

- Rust: `1.94.0`
- WASM target: `wasm32-unknown-unknown`
- Trunk: `0.21.14`

These constants are mirrored in `rust-toolchain.toml` and `scripts/bootstrap.sh`.
