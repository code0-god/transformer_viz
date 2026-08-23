# Architecture

Transformer Viz is a backend-free static application. React renders semantic architecture and
generation UI on the main thread while a dedicated Rust/WASM module Worker owns tokenization,
Candle CPU inference, model weights, sampling, generation, and trace capture. Tensor work cannot
block browser interaction.

## Workspace boundaries

- `apps/web`: React, strict TypeScript, Vite, KaTeX, semantic SVG, CSS, protocol guards, and
  browser-only UI state.
- `apps/worker`: Rust/WASM module Worker entry, bounded asset loading, request routing, generation
  credits, and retained trace replay.
- `nanogpt-schema`: canonical model configuration, trace, request, and response DTOs. `ts-rs`
  generates the committed TypeScript bindings.
- `nanogpt-tokenizer`: deterministic UTF-8 byte-fallback tokenization.
- `nanogpt-model`: explicit nanoGPT-compatible Candle Transformer and sampling.
- `nanogpt-trace`: intermediate tensor capture and operation boundaries.

The web package does not belong to the Cargo workspace and does not implement numerical behavior.
The Worker depends inward on responsibility crates. The pinned `reference/nanoGPT` submodule is
outside the Cargo graph and supplies provenance and golden fixtures only.

## Runtime flow

1. Vite loads the React module and creates the hashed TypeScript module Worker.
2. React sends an absolute same-origin manifest URL through the generated typed protocol.
3. The Worker derives the deployment model directory from its own URL, rejects redirects and URL
   escapes, bounds streamed responses, verifies SHA-256, and constructs the Candle CPU model.
4. Generation tokenizes UTF-8, executes one full-prefix forward, returns compact typed summaries,
   and spends one exact continuation credit per accepted step.
5. Selecting a generated step asks the Worker to reconstruct its retained full-forward trace
   without sampling again.
6. React renders validated metadata/trace data in Root, Transformer Block, and Self-Attention
   surfaces. Unknown payloads and Worker script-load errors become visible error state.

## Browser-only and Worker-owned state

Architecture depth, selected layer/head/operation, form text, and responsive disclosure are
browser-only state. Root/Block/Attention navigation and breadcrumbs do not send Worker requests.
Current values come only from model metadata or a selected trace; unavailable trace values remain
pending rather than being inferred.

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

Trace snapshots such as Q/K/V, attention score/mask/probability/value, and MLP intermediates share
their owning `OperationId` and canonical source range. Tokenization, temperature, Top-K, sampling,
append, and repeat are generation-policy boundaries outside nanoGPT `model.py`; they deliberately
have no invented `OperationId` or sampling source ID.

## Rendering and scroll boundaries

Root, Block, and Attention use deterministic SVG geometry with semantic HTML annotations. Desktop
keeps diagrams and annotations readable without document horizontal overflow. Tablet and mobile
allow named diagram regions to scroll inline while the document flows vertically. Startup,
ready/error state, generation controls, Korean copy, and KaTeX formulas remain unclipped at 390x844.
Breakpoints never change Worker ownership or model state.

## Deployment boundary

The deliverable is `apps/web/dist`, produced by Vite through `scripts/build-web.sh`. Application,
Worker, WASM, KaTeX fonts, model assets, and source records use one configured same-origin base.
Both `/` and `/transformer_viz/` releases pass static CSP policy and real-Chrome Worker checks. The
HTML has one external module script and no inline script. No backend, CDN, external model download,
or Python runtime belongs in the deployed application.

## Notation boundary

[`NOTATION.md`](NOTATION.md) is the single source for operation names, Tensor symbols, symbolic
shapes, current shapes, and accessible formula descriptions. UI notation changes do not alter
Worker protocol, persisted trace identity, numerical parity, or nanoGPT source mapping.

## Toolchain constants

- Rust `1.94.0`
- WASM target `wasm32-unknown-unknown`
- wasm-bindgen CLI `0.2.127`
- Node `22.22.0`
- pnpm `11.22.0`
- Binaryen `123.0.0`

These values are mirrored in toolchain files, package metadata, bootstrap scripts, and workflows.
