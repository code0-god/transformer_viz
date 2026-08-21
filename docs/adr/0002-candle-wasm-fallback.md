# ADR 0002: Candle WASM fallback

- Status: Placeholder
- Date: 2026-08-21

## Context

The preferred model implementation uses `candle-core` and `candle-nn` with f32 CPU operations in
WebAssembly. Phase A has not yet run the locked dependency and browser-operation spike required to
prove that path.

## Decision

No fallback is authorized in Phase A. A later phase may amend this ADR only after recording a
minimal reproducible Candle WASM failure against the pinned toolchain. Any fallback must preserve
the explicit nanoGPT operation graph, numerical parity, Worker isolation, and public trace schema.

## Consequences

The workspace remains free of a speculative second tensor backend. The implementation decision is
deferred to measured evidence rather than assumed incompatibility.
