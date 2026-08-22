# ADR 0003: Versioned trace schema and byte-fallback tokenizer

- Status: Accepted
- Date: 2026-08-22
- Superseded in part: [ADR 0003: Guided Learning Player](0003-guided-learning-player.md) extends the
  schema to `1.1.0`; the tokenizer decision and the historical `1.0.0` contract recorded here remain
  unchanged.

## Context

The browser UI, dedicated Worker, Rust model, and offline Python fixtures need one stable contract.
Trace JSON must never contain NaN or infinity, and attention teaching views must distinguish an
allowed zero score from a causally blocked cell. Tokenization must be deterministic in native and
WASM builds, preserve arbitrary UTF-8, expose original pieces, and stay small enough to audit.

## Decision

At the time of this decision, `nanogpt-schema` owned trace schema version `1.0.0`; run summaries,
block traces, and token traces carry a checked `SchemaVersion`. Worker request and response enums
are explicitly
tagged, reject unknown fields, and use `u64` request/run IDs. Their public variants match the browser
binding directly rather than routing through compatibility aliases.

The public model and trace contracts are `GptConfig`, `TokenInfo`, `RunSummary`, `LayerSummary`,
`AttentionHeadTrace`, `MlpTrace`, `LogitsTrace`, `TensorStats`, `TensorSnapshot`, `MaskSnapshot`,
`OperationId`, `SourceReference`, `BlockTrace`, and `TokenTrace`. `FiniteF32` prevents NaN or infinity
from entering snapshots; `MaskSnapshot` serializes every cell as an explicit `allowed` boolean.
`TraceMode` is exactly off, summary, block, attention-head, or layer/head/token detail.

Use a UTF-8 byte-fallback tokenizer. IDs are fixed as BOS `0`, EOS `1`, UNK `2`, and byte `b` as
`b + 3`, giving vocabulary size 259. Encoding always adds BOS/EOS. Truncation reserves EOS and backs
up to a UTF-8 scalar boundary, so decoded prefixes remain valid strings. Each byte token stores its
ID, visible display, exact original byte, and source span. The compact JSON config contains only the
algorithm, IDs, offset, and maximum length.

The Python reference formula is:

```python
ids = [0, *(byte + 3 for byte in text.encode("utf-8")), 1]
```

The Rust Worker uses the same `nanogpt-tokenizer` API exercised by native integration tests; there
is no JavaScript tokenizer or platform-specific vocabulary.

## Consequences

Byte tokens are less linguistically compact than BPE, but the tiny educational model gets complete
UTF-8 coverage, transparent token pieces, deterministic cross-language IDs, and no added tokenizer
dependency. A future tokenizer requires a new algorithm tag and schema-version compatibility plan.
