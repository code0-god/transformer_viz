# ADR 0003: Guided Learning Player

- Status: Accepted
- Date: 2026-08-22
- Numbering note: this deliberate duplicate remains `0003` because the user required the exact
  filename `docs/adr/0003-guided-learning-player.md`; references should include the ADR title or
  filename to distinguish it from `0003-schema-and-tokenizer.md`.

## Context

The original interface exposed model instrumentation as many equal-weight regions and an independent
18-operation playback surface. It was accurate but required learners to infer the teaching sequence,
keep several panels synchronized mentally, and decode implementation boundaries before understanding
the forward pass.

The model, Worker, tokenizer, static deployment, pinned nanoGPT source, and numerical parity were
already correct and must remain unchanged. The redesign therefore needed a browser-side learning
structure over real captured tensors rather than another execution path or pre-authored replay.

## Decision

Replace the instrumentation dashboard with a Guided Learning Player centered on one Main Stage.
Group the existing 18 operation boundaries into nine narrative stages:

1. Embedding
2. Attention LayerNorm
3. Q/K/V
4. Attention Score
5. Causal Mask
6. Softmax
7. Value + Residual
8. MLP + Residual
9. Prediction

Keep stage selection, previous/next, playback, speed, Inspector tab, feature selection, and Model Map
disclosure as browser-only state. Main Stage carries the current concept, formula, visualization,
and real values. Stage Rail is the only primary narrative transport. Inspector provides Explanation,
Tensor, and pinned Source tabs; the 18 operation boundaries remain available in a collapsed
stage-linked detail disclosure.

Derive Model Map architecture from `ModelMetadata.config`. Extend schema 1.1.0 only enough to expose
already-computed evidence: `EmbeddingTrace` on `RunSummary.embeddings`,
`RunSummary.final_layer_norm`, and loaded `GptConfig` on `ModelMetadata.config`. Resolve snapshots by
stable ID through `TraceLookup`, and use checked `TensorAddress`/`guided_math` helpers for display
coordinates and arithmetic evidence.

Model arithmetic, weights, tokenizer, inference order, cache/replay semantics, operation snapshots,
and tolerance remain unchanged.

## Consequences

Learners follow one explicit nine-concept path while retaining exact tensors and source proof on
demand. Main Stage has visual priority; Inspector and Model Map remain supporting regions. Desktop
uses a bounded viewport with Inspector-owned vertical scroll, tablet uses a compact Model Map plus
Stage/Inspector split, and mobile follows stage-first source order with local matrix and rail
horizontal overflow.

Stage/detail/feature/disclosure actions cannot rerun the Worker. Layer, head, token, and interactive
cell choices preserve the existing cached trace request semantics. The minimal schema extension is a
breaking versioned contract change, but it transfers no new model computation and leaves numerical
golden parity intact.
