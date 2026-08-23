# ADR 0006: React UI renderer with Rust/WASM Worker

- Status: Accepted and implemented
- Date: 2026-08-23

## Context

Root Architecture, Transformer Block, and Self-Attention need semantic SVG drill-down, responsive
panels, accessible math, and deterministic browser interaction. Rust remains source of truth for
tokenization, Candle inference, sampling, generation, and traces. Implementing numerical paths in
TypeScript would create a second model and break parity guarantees.

A temporary React feasibility project established Vite/SVG viability. Production promotion was
gated on typed real-Worker messages, generation/trace parity, root/subpath builds, CSP, browser
readiness, and Worker integrity.

## Decision

Ship React 19, strict TypeScript, Vite 8, semantic SVG, CSS, and KaTeX on the main thread. Keep all
numerical work in the separate Rust/WASM module Worker.

Use `nanogpt-schema` as canonical protocol definition and generate committed TypeScript DTOs with
`ts-rs`. Validate every Worker response before reducing it into React state. Treat architecture
navigation as browser-only state; never infer missing trace values.

KaTeX accepts only the trusted formula catalog. Each formula has canonical TeX, plain text, and an
accessible label. Prompt/generated text and Worker strings never enter KaTeX.

The release gate proved the production React shell at `/` and `/transformer_viz/` with the real
Worker, generation, replay, Root/Block/Attention navigation, KaTeX MathML, and failure handling.
After that gate, the previous UI renderer and temporary feasibility project were removed.

## Consequences

UI state, SVG geometry, responsive layout, navigation, and formula presentation belong to
TypeScript. Candle, model loading, tokenizer output, sampling semantics, generation credits,
traces, weights, and golden parity remain Rust-owned.

Cargo workspace contains Worker and numerical crates, not the web renderer. Vite is the only
shipping web build. Generated schema freshness, Rust/TypeScript gates, static asset policy, and
real-Chrome checks prevent either side of the boundary from drifting.
