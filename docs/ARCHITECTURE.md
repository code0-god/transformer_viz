# Architecture

Transformer Viz is a backend-free static application. Leptos renders the Guided Learning Player on
the main thread while a dedicated Rust/WASM Worker owns tokenizer, Candle CPU inference, model
weights, and trace capture. Tensor work therefore cannot block browser interaction.

## Workspace boundaries

- `nanogpt-schema`: versioned model configuration, trace, request, and response contracts.
- `nanogpt-tokenizer`: deterministic UTF-8 byte-fallback tokenization.
- `nanogpt-model`: explicit nanoGPT-compatible Transformer and static asset loading.
- `nanogpt-trace`: intermediate tensor capture and operation boundaries.
- `transformer-viz-web`: Leptos CSR shell, Guided Player state, trace lookup/addressing, and Worker
  binary. Native tests invoke the same runtime handler compiled into Worker WASM.

Dependencies point inward from the web package to those responsibility crates. The pinned
`reference/nanoGPT` submodule is outside the Cargo graph; it supplies provenance and golden fixtures
only.

## Runtime flow

1. Trunk loads the Leptos CSR application and starts `worker_loader.js` as a module Worker.
2. The application sends a base-relative manifest URL through the typed serde protocol.
3. The Worker resolves config, tokenizer, and safetensors relative to the manifest, fetches them
   from the same origin, verifies SHA-256, and constructs the Candle CPU model.
4. A run tokenizes UTF-8, executes the explicit forward path, returns `RunSummary`, and caches the
   selected-layer input. Follow-up block/head/token requests replay from that cached run.
5. The main thread composes loaded responses through this concrete presentation flow:

   ```text
   Worker Data State
          |
          v
      TraceLookup
          |
          v
   Narrative Stage Selection
      |        |         |          |
      v        v         v          v
   Main Stage Inspector Source Map Stage Rail
   ```

6. The browser presents nine narrative stages: Embedding, Attention LayerNorm, Q/K/V, Attention
   Score, Causal Mask, Softmax, Value + Residual, MLP + Residual, and Prediction. The underlying 18
   operation boundaries remain available as stage-linked Inspector detail.

## Browser-only and Worker-owned state

Narrative stage, playback position/speed, Inspector tab, selected feature, prompt disclosure, and
Model Map disclosure are browser-only UI state. Previous/Next, stage buttons, autoplay ticks,
Inspector tabs, feature selectors, and Model Map disclosure do not send Worker requests.

Layer, head, token, and interactive attention-cell changes may request detail for the current run.
Those requests use cached trace replay; they do not rerun tokenization or the full model. Controls
that need trace data remain disabled before a run and while the Worker is active.

`TraceLookup` resolves snapshots by stable `TensorSnapshot.id`. Operation lookup uses both
`OperationId` and tensor ID because one operation may expose multiple tensors. `TensorAddress`
interprets supported row-major shapes, checks products and selectors, computes the exact flat index,
and returns a borrowed bounded row slice. `guided_math` computes UI evidence such as Q-dot-K,
scaling, mask/softmax, and probability-times-value checks from captured snapshots only. Neither
layer performs or changes model arithmetic.

## Rendering and scroll boundaries

At 1200px and wider, the application is a bounded viewport shell: Model Map is the left rail, Main
Stage is the dominant center, Inspector is the right rail and vertical scroll owner, and Stage Rail
closes the viewport. Tablet uses a compact Model Map disclosure above a Main Stage/Inspector split.
Mobile returns vertical scrolling to the document in source order: Main Stage, Stage Rail,
Inspector, Model Map. Matrices use bounded local two-axis overflow to reveal selected 44px cells;
token reels, tensor tables, source code, and the Stage Rail own their named horizontal overflow.

## Deployment boundary

The deliverable is `apps/web/dist`, produced by Trunk. Application, Worker, glue modules, model
assets, and source-map data use base-relative same-origin URLs. `scripts/build-web.sh` validates both
root and slash-delimited project-subpath builds. No backend, external model download, CDN, or Python
runtime belongs in the deployed application.

## Toolchain constants

- Rust `1.94.0`
- WASM target `wasm32-unknown-unknown`
- Trunk `0.21.14`

These values are mirrored in `rust-toolchain.toml`, bootstrap scripts, and workflows. Native Clippy
and tests are separate from the WASM package check because one Cargo invocation cannot compile all
native-only transitive targets for `wasm32-unknown-unknown`.
