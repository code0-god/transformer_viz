# Architecture

Transformer Viz is a backend-free static application. Leptos renders the Explorer on the main
thread while a dedicated Rust/WASM Worker owns tokenization, Candle CPU inference, model weights,
and trace capture. Tensor work therefore cannot block browser interaction.

## Workspace boundaries

- `nanogpt-schema`: versioned model configuration, trace, request, and response contracts.
- `nanogpt-tokenizer`: deterministic UTF-8 byte-fallback tokenization.
- `nanogpt-model`: explicit nanoGPT-compatible Transformer and static asset loading.
- `nanogpt-trace`: intermediate tensor capture and operation boundaries.
- `transformer-viz-web`: Leptos CSR shell, Guided/Explore state, trace lookup/addressing, and Worker
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
5. Worker state flows through `TraceLookup` and the shared Guided/Explore focus into Main Canvas,
   Inspector, Architecture Map, and Stage Rail.
6. Guided presents 21 concepts in four groups. Explore addresses the same evidence through the
   architecture hierarchy. The retained 18 detail boundaries remain stage-linked Inspector detail;
   they are not a second curriculum.

## Browser-only and Worker-owned state

Curriculum step, mode, playback position/speed, Inspector tab, selected feature, and Architecture
Map disclosure are browser-only UI state. Previous/Next, group and step buttons, autoplay ticks,
Inspector tabs, feature selectors, mode tabs, and Architecture Map disclosure do not send Worker
requests.

Layer, head, token, and interactive attention-cell changes may request detail for the current run.
Those requests use cached trace replay; they do not rerun tokenization or the full model. Controls
that need trace data remain disabled before a run and while the Worker is active.

Generation is an exact one-credit state machine. A valid start authorizes one initial forward. Each
accepted generated step grants only the matching continuation credit; stale request/run/step
identities are no-ops. Replay reads a retained generation step and cannot grant continuation credit
or rerun sampling.

## Canonical nanoGPT source correspondence

The upstream is [`karpathy/nanoGPT`](https://github.com/karpathy/nanoGPT), pinned to full commit
[`3adf61e154c3fe3fca428ad6bc3818b27a3b8291`](https://github.com/karpathy/nanoGPT/commit/3adf61e154c3fe3fca428ad6bc3818b27a3b8291), exactly as recorded by
`reference/NANOGPT_COMMIT`. The public source is MIT-licensed. The repository-pinned canonical file
is `reference/nanoGPT/model.py`. Its byte-identical public copy is
`apps/web/public/reference/model.py`, exposed to deployed source references as the base-relative
`reference/model.py`. The generated
`apps/web/public/models/edu/source_map.json` is the runtime authority for all source labels, ranges,
and Rust counterparts.

The complete `OperationId` mapping is:

| `OperationId` / source-map key | Python label | Python range in canonical `reference/nanoGPT/model.py` | Rust file | Rust symbol |
|---|---|---:|---|---|
| `Embedding` / `embedding` | `GPT.forward` | 177-179 | `crates/nanogpt-model/src/model.rs` | `Gpt::embed` |
| `AttentionLayerNorm` / `attention_layer_norm` | `Block.forward` | 104-104 | `crates/nanogpt-model/src/layers.rs` | `Block::forward` |
| `QueryKeyValue` / `query_key_value` | `CausalSelfAttention.forward` | 56-59 | `crates/nanogpt-model/src/attention.rs` | `CausalSelfAttention::forward` |
| `Attention` / `attention` | `CausalSelfAttention.forward` | 61-75 | `crates/nanogpt-model/src/attention.rs` | `CausalSelfAttention::forward` |
| `AttentionResidual` / `attention_residual` | `Block.forward` | 104-104 | `crates/nanogpt-model/src/layers.rs` | `Block::forward` |
| `MlpLayerNorm` / `mlp_layer_norm` | `Block.forward` | 105-105 | `crates/nanogpt-model/src/layers.rs` | `Block::forward` |
| `Mlp` / `mlp` | `MLP.forward` | 88-92 | `crates/nanogpt-model/src/layers.rs` | `Mlp::forward` |
| `MlpResidual` / `mlp_residual` | `Block.forward` | 105-105 | `crates/nanogpt-model/src/layers.rs` | `Block::forward` |
| `FinalLayerNorm` / `final_layer_norm` | `GPT.forward` | 180-182 | `crates/nanogpt-model/src/model.rs` | `Gpt::finish_forward` |
| `Logits` / `logits` | `GPT.forward` | 184-190 | `crates/nanogpt-model/src/model.rs` | `Gpt::finish_forward` |

The 18 retained detail boundaries are tensor snapshots within these ten canonical operation
identities: repeated Q/K/V, attention score/mask/probability/value, and MLP intermediate evidence
share their owning `OperationId` and therefore its canonical source range. UI concepts such as
tokenization, temperature, Top-K, generation softmax, sampling, append, and repeat are educational
or generation-policy boundaries outside nanoGPT `model.py`; they deliberately have no invented
`OperationId` or sampling source ID.

## Rendering and scroll boundaries

At 1280px and wider, the application is exactly one dynamic viewport (`100dvb`): Architecture Map,
Main Canvas, and Inspector are three columns, Stage Rail closes the shell, the document does not
scroll, and only named local regions overflow. From 768px through 1279px, Architecture Map is a
closed-by-default keyboard disclosure drawer, Main Canvas and Inspector remain two columns, and
Stage Rail follows below. Below 768px, document vertical scrolling returns, major regions become one
column, Architecture Map remains a drawer, the compact transport is sticky, and reels/matrices own
their horizontal overflow. No layout uses `100vh`.

## Deployment boundary

The deliverable is `apps/web/dist`, produced by Trunk. Application, Worker, glue modules, model
assets, and source-map data use base-relative same-origin URLs. `scripts/build-web.sh` validates both
root and slash-delimited project-subpath builds. No backend, external model download, CDN, or Python
runtime belongs in the deployed application.

## Toolchain constants

- Rust `1.94.0`
- WASM target `wasm32-unknown-unknown`
- Trunk `0.21.14`

These values are mirrored in `rust-toolchain.toml`, bootstrap scripts, and workflows.
