# ADR 0003: Guided Learning Player

- Status: Superseded by ADR 0006
- Date: 2026-08-22
- Numbering note: this deliberate duplicate remains `0003` because the user required the exact
  filename `docs/adr/0003-guided-learning-player.md`; references should include the ADR title or
  filename to distinguish it from `0003-schema-and-tokenizer.md`.

## Context

The original interface exposed model instrumentation as many equal-weight regions and an independent
18-operation playback surface. It was accurate but required learners to infer the teaching sequence,
keep several panels synchronized mentally, and decode implementation boundaries before understanding
the forward pass. An earlier nine-stage description of this player is superseded by this current
21-step curriculum; the 18 operation boundaries remain evidence, not curriculum stages.

The model, Worker, tokenizer, static deployment, pinned nanoGPT source, and numerical parity were
already correct and must remain unchanged. The redesign therefore needed a browser-side learning
structure over real captured tensors rather than another execution path or pre-authored replay.

## Decision

Replace the instrumentation dashboard with a Guided Learning Player centered on one Main Stage.
The canonical curriculum has exactly 21 ordered steps in four groups:

1. **Input representation (3):** Tokenization, Token Embedding, Position Embedding.
2. **Transformer Block (9):** LayerNorm, Q/K/V, Attention Score, Causal Mask, Softmax, Value
   Aggregation, Residual, MLP, Block Output.
3. **Prediction (3):** Final LayerNorm, LM Head, Logits.
4. **Generation (6):** Temperature, Top-K, Sampling, Generated Token, Append to Context, Repeat.

Keep curriculum selection, previous/next, playback, speed, Inspector tab, feature selection, and
Model Map disclosure as browser-only state. Main Stage carries the current concept, formula,
visualization, and real values. The grouped Stage Rail is the only primary narrative transport.
Inspector provides Explanation, Tensor, and pinned Source tabs; the 18 operation boundaries remain
available as stage-linked evidence rather than an alternative curriculum.

Derive Model Map architecture from `ModelMetadata.config`. Extend schema 1.1.0 only enough to expose
already-computed evidence: `EmbeddingTrace` on `RunSummary.embeddings`,
`RunSummary.final_layer_norm`, and loaded `GptConfig` on `ModelMetadata.config`. Resolve snapshots by
stable ID through `TraceLookup`, and use checked `TensorAddress`/`guided_math` helpers for display
coordinates and arithmetic evidence.

Model arithmetic, weights, tokenizer, inference order, cache/replay semantics, operation snapshots,
and tolerance remain unchanged.

## Consequences

Learners follow one explicit 21-step, four-group path while retaining exact tensors and source proof
on demand. Main Stage has visual priority; Inspector and Model Map remain supporting regions.
Desktop uses a bounded viewport with Inspector-owned vertical scroll, tablet uses a compact Model
Map plus Stage/Inspector split, and mobile follows stage-first source order with local matrix and
rail horizontal overflow.

Stage/detail/feature/disclosure actions cannot rerun the Worker. Layer, head, token, and interactive
cell choices preserve the existing cached trace request semantics. The minimal schema extension is a
breaking versioned contract change, but it transfers no new model computation and leaves numerical
golden parity intact.
