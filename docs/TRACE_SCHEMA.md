# Trace schema 1.0.0

`nanogpt-schema` is the machine-consumed contract shared by the Leptos app, Worker, native tests,
and model trace capture. Serde enums use a snake-case `type` discriminator and reject unknown
fields. Request and run IDs are unsigned 64-bit integers; layer, head, and token selectors are
zero-based.

## Worker protocol

Requests are `initialize`, `run`, `inspect_block`, `inspect_attention_head`, `inspect_token`, or
`cancel`. Responses are `initializing`, `ready`, `run_complete`, `block_trace`,
`attention_head_trace`, `token_trace`, or `error`. Errors carry an optional request ID, Korean
user-readable message, and one stable code: `unsupported_version`, `invalid_request`,
`not_initialized`, `asset_unavailable`, `checksum_mismatch`, `tokenization`, `inference`, or
`cancelled`.

`run_complete` returns tokens, per-layer statistics, measured execution time, and logits Top-K.
Detailed requests address a cached run ID. This keeps the initial response bounded while allowing
the UI to replay a block, head, or token without transferring every tensor eagerly.

## Tensor and mask representation

`TensorSnapshot` contains a stable ID, label, shape, finite row-major f32 values, and min/max/mean/
population-standard-deviation/L2 statistics. Shape products must equal value counts. `FiniteF32`
rejects NaN and infinity before JSON serialization.

`MaskSnapshot` stores rows, columns, and one row-major boolean per cell; `true` means attention is
allowed. A blocked future position is therefore distinct from a valid score or probability of
zero. Attention detail exposes Q, K, V, raw QK-transpose scores, scaled scores, mask, softmax
probabilities, and Attention-times-V output.

## Source-linked operations

Operations are embedding, attention LayerNorm, QKV projection, attention, attention residual, MLP
LayerNorm, MLP, MLP residual, final LayerNorm, and logits. Each operation snapshot includes a
one-based pinned nanoGPT source range. The generated `source_map.json` also records the Rust file
and symbol used by the UI.

Adding or changing a variant is a schema change: update the schema version, exhaustive Rust
matches, Worker protocol tests, source map, and this document together. Numerical guarantees and
the complete measured tensor list are documented in [NUMERICAL_PARITY.md](NUMERICAL_PARITY.md).
