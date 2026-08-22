# Trace schema 1.1.0

`nanogpt-schema` is the machine-consumed contract shared by the Leptos application, Worker, native
tests, and trace capture. Serde structs reject unknown fields. Tagged Worker enums use a snake-case
`type` discriminator. Request/run IDs are unsigned 64-bit integers; layer, head, token, query, and
key selectors are zero-based. `SchemaVersion` accepts exactly `1.1.0`; incompatible versions fail
at deserialization rather than being interpreted loosely.

## Worker protocol

Requests are `initialize`, `run`, `inspect_block`, `inspect_attention_head`, `inspect_token`, and
`cancel`. Responses are `initializing`, `ready`, `run_complete`, `block_trace`,
`attention_head_trace`, `token_trace`, and `error`.

Errors carry an optional request ID, Korean user-readable message, and one stable code:
`unsupported_version`, `invalid_request`, `not_initialized`, `asset_unavailable`,
`checksum_mismatch`, `tokenization`, `inference`, or `cancelled`.

`Ready.model` is `ModelMetadata`, including the loaded `GptConfig` as `ModelMetadata.config`:
`block_size`, `vocab_size`, `n_layer`, `n_head`, `n_embd`, and `bias`. Guided Player architecture
controls derive from these values and do not hard-code model dimensions.

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

## Stable ID lookup

Browser consumers use `TraceLookup` to resolve tensors by `TensorSnapshot.id`, never by a display
label or `BlockTrace.operations` array position. Operation lookup takes both `OperationId` and ID
because one operation can expose multiple snapshots. Lookup can combine the currently available
summary, block, selected-head, and token responses while retaining borrowed references; it does not
clone large tensor vectors. Missing trace kinds, unknown IDs, invalid shapes, and out-of-range
selectors remain typed visible empty states.

## TensorAddress rules

`TensorAddress` validates shape/value agreement, resolves semantic axes, computes a checked
row-major flat index, returns the exact selected `FiniteF32`, and borrows a bounded slice from the
same semantic row. Feature selectors clamp to the final valid feature; batch/token/query/key bounds
do not silently clamp.

Supported interpretations are:

- rank-1 vector: `[feature]`;
- token-feature tensor: `[B,T,C]`, displayed at batch axis `0`;
- selected captured head: `[1,1,T,D]`, displayed with captured head axis `0`;
- selected score/probability matrix: `[1,1,T,T]`, addressed by query and key with captured head axis
  `0`.

The head axis in selected-head snapshots is intentionally `0`: the response already contains only
the requested model head. The actual model head remains `AttentionHeadTrace.head` and
`AppState.selection.head`; it must not be used as an index into the captured singleton head axis.
This distinction prevents selecting model head 3 from incorrectly indexing a `[1,1,T,D]` capture.

Slices stay within one semantic row. `slice_start` is the global row-major offset of the first
returned value, while each displayed local index is added to that offset. Matrix slices remain in
the selected query row and vary over key.

## Source-linked operations

Operations are embedding, attention LayerNorm, QKV projection, attention, attention residual, MLP
LayerNorm, MLP, MLP residual, final LayerNorm, and logits. Each operation snapshot includes a
one-based pinned nanoGPT source range. Generated `source_map.json` also records the Rust file and
symbol used by Source Inspector.

Adding or changing a serialized variant requires a schema version decision, exhaustive Rust match
updates, Worker protocol tests, source-map review, and this document. Numerical guarantees and the
measured tensor inventory remain in [NUMERICAL_PARITY.md](NUMERICAL_PARITY.md).
