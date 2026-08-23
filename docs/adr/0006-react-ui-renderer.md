# ADR 0006: Staged React UI renderer migration

- Status: Accepted
- Date: 2026-08-23

## Context

Root Architecture now needs richer SVG geometry, drill-down navigation, responsive panels,
heatmaps, and controlled transitions. Rust remains the source of truth for model inference,
tokenization, sampling, generation, trace capture, and Worker behavior. Rewriting those numerical
paths in TypeScript would create two implementations and break parity guarantees.

An isolated feasibility spike in `spikes/react-root-architecture` proved that Vite, React, and
TypeScript can:

- build a static relative-path SPA,
- consume the canonical educational `config.json`,
- render `Transformer Block × N` from `GptConfig.n_layer`,
- keep `GptConfig` synchronized from Rust through `ts-rs`,
- pass strict TypeScript, Biome, Bun, Vite, and real-Chrome checks.

The spike did not replace the Leptos application or connect the production Worker protocol.

## Decision

Proceed with a staged UI-renderer migration to Vite, React, TypeScript, semantic SVG, and CSS.
Keep the Rust/WASM Worker and every numerical subsystem unchanged.

Use `nanogpt-schema` as the canonical protocol definition. Generate TypeScript bindings with
`ts-rs`; committed bindings must stay synchronized through Rust tests.

Keep Leptos as the shipping UI until the React shell:

1. reproduces the approved Root Architecture,
2. receives real typed Worker messages,
3. matches generation and trace results for the same inputs,
4. passes root and GitHub Pages subpath builds,
5. passes browser readiness and Worker integrity gates.

Only then may Leptos UI code be removed.

## Consequences

UI state, SVG geometry, responsive layout, navigation, panels, and animation may move to
TypeScript. Candle, model loading, tokenizer output, sampling semantics, generation, traces,
weights, and golden parity remain Rust-owned.

The repository temporarily carries two renderers. The spike stays isolated and non-production
until parity gates promote it. No Block drill-down or attention detail begins before Root
Architecture review.
