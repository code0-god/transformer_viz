# Trace schema 1.1.0

`nanogpt-schema` is the machine-consumed contract shared by the React application, Worker, native
tests, and trace capture. Serde structs reject unknown fields. Tagged Worker enums use a snake-case
`type` discriminator. Request/run IDs are unsigned 64-bit integers; layer, head, token, query, and
key selectors are zero-based. `SchemaVersion` accepts exactly `1.1.0`; incompatible versions fail
at deserialization rather than being interpreted loosely.

## Worker protocol

Requests are `initialize`, `run`, `generate`, `stop_generation`, `continue_generation`,
`inspect_generation_step`, `inspect_block`, `inspect_attention_head`, `inspect_token`, and `cancel`.
Responses are `initializing`, `ready`, `generation_started`, `token_generated`,
`generation_finished`, `generation_step_trace`, `run_complete`, `block_trace`,
`attention_head_trace`, `token_trace`, and `error`.

Errors carry an optional request ID, Korean user-readable message, and one stable code:
`unsupported_version`, `invalid_request`, `not_initialized`, `asset_unavailable`,
`checksum_mismatch`, `tokenization`, `inference`, or `cancelled`.

`Ready.model` is `ModelMetadata`, including the loaded `GptConfig` as `ModelMetadata.config`:
`block_size`, `vocab_size`, `n_layer`, `n_head`, `n_embd`, and `bias`. Root, Block, and Attention
architecture controls derive from these values and do not hard-code model dimensions.

`generate` authorizes one initial full-prefix forward. A matching accepted `token_generated` step
allows the UI to send one exact `continue_generation` credit identified by request ID, run ID, and
preceding step index. Duplicate, stale, future, or terminal credits are no-ops. Every accepted token
uses another full-prefix forward; there is no KV cache. `inspect_generation_step` performs one traced
full-prefix replay from retained context, preserves the historical sampled token, does not sample
again, and cannot create continuation credit.

## Run summary additions in 1.1.0

`RunSummary` contains:

- `schema_version`, `run_id`, encoded `tokens`, per-layer `layers`, and measured `duration_ms`;
- `embeddings: EmbeddingTrace`;
- `final_layer_norm: TensorSnapshot`;
- `logits: LogitsTrace`.

`EmbeddingTrace` groups four fields:

- `token`: token embedding lookup output;
- `position`: position embedding lookup output;
- `sum`: the element-wise token-plus-position embedding;
- `source`: the canonical source reference.

These snapshots expose tensors the model already computed. The schema extension does not add an
operation or change arithmetic. Detailed block/head/token requests still address a cached run ID,
keeping the initial response bounded while allowing replay without rerunning full inference.

## Tensor and mask representation

`TensorSnapshot` contains a stable ID, label, shape, finite row-major f32 values, and
min/max/mean/population-standard-deviation/L2 statistics. Shape products must equal value counts;
overflow, malformed rank, empty data, NaN, and infinity are typed errors. Row-major means the
rightmost axis varies fastest. For shape `[d0,d1,...,dn]`, a coordinate is flattened by repeatedly
multiplying the accumulated index by the next dimension and adding that axis coordinate.

`MaskSnapshot` stores rows, columns, and one row-major boolean per cell. `true` means attention is
allowed. A future position is therefore distinct from a valid score or probability of zero.
Attention detail contains Q, K, V, raw QK-transpose scores, scaled scores, mask, softmax
probabilities, and Attention-times-V output.

## Source-linked operations

Operations are embedding, attention LayerNorm, QKV projection, attention, attention residual, MLP
LayerNorm, MLP, MLP residual, final LayerNorm, and logits. Each operation snapshot includes a
one-based pinned nanoGPT source range. The generated
`apps/web/public/models/edu/source_map.json` is authoritative for exactly these ten `OperationId`
entries and records each Rust file and symbol. Temperature, Top-K, generation softmax, sampling,
append, and repeat are generation-policy concepts and never invent serialized operation or source
IDs.

Adding or changing a serialized variant requires a schema version decision, exhaustive Rust match
updates, Worker protocol tests, source-map review, and this document. Numerical guarantees and the
measured tensor inventory remain in [NUMERICAL_PARITY.md](NUMERICAL_PARITY.md).
