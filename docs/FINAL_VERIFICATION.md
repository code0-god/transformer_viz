# Final verification: React/Vite UI with Rust/WASM Worker

Run acceptance from repository root with Node 22.22.0 active. No single green build substitutes for
the real-browser checks in `scripts/check.sh`.

## Deliverable contract

- React/TypeScript/Vite is the only shipping UI.
- Rust/WASM module Worker exclusively owns tokenization, Candle inference, generation, sampling,
  and trace reconstruction.
- Generated `ts-rs` DTOs and runtime guards enforce the typed boundary.
- Root Architecture, Transformer Block, Self-Attention, Prompt/Generate/Stop, decoded
  continuation, and selected-step replay use real model state.
- `/` and `/transformer_viz/` releases contain only same-origin static runtime assets.
- KaTeX renders only trusted catalog formulas and emits MathML; prompt/runtime strings remain text.
- Previous UI renderer/build files and temporary feasibility project are absent.

## Canonical command

```sh
./scripts/bootstrap.sh
./scripts/check.sh
```

`check.sh` covers:

1. exact Node/pnpm/wasm-bindgen/Binaryen versions and frozen dependencies,
2. generated TypeScript binding freshness,
3. Biome, TypeScript, and Vitest,
4. rustfmt, native/WASM strict Clippy, workspace tests, release build, and Worker target check,
5. canonical model/reference copies, checksums, source pin, and golden parity,
6. root and project-subpath Vite builds,
7. compiled Worker manifest trust anchor,
8. CSP and same-origin JS/CSS/WASM/KaTeX font/model/reference policy,
9. real-Chrome readiness and Worker script-load/redirect/bounded-response failures,
10. real generation, replay transport, Root/Block/Attention navigation, notation, responsive
    layout, and no document overflow.

## Focused commands

```sh
pnpm --dir apps/web lint
pnpm --dir apps/web typecheck
pnpm --dir apps/web test

cargo fmt --all -- --check
cargo clippy --workspace --all-targets --all-features -- -D warnings
cargo clippy --target wasm32-unknown-unknown -p transformer-viz-worker --all-features -- -D warnings
cargo test --workspace
cargo test -p nanogpt-model --test golden_parity
cargo build --workspace --release
cargo check --target wasm32-unknown-unknown -p transformer-viz-worker

./scripts/build-web.sh / /tmp/transformer-viz-root
./scripts/build-web.sh /transformer_viz/ /tmp/transformer-viz-subpath
```

`build-web.sh` itself runs binding freshness, Worker build/optimization, TypeScript gates, canonical
asset checks, static policy, and real-Chrome readiness.

## Manual browser acceptance

Use the built artifact through Chrome, not a mock:

1. Wait for Model Ready.
2. Generate from a prompt and observe streamed continuation.
3. Stop an active generation and start another.
4. Select a generated step and verify replay does not generate another token.
5. Drill Root → Transformer Block → Self-Attention.
6. Select layer, head, Score MatMul, Causal Mask, and Value MatMul; return through breadcrumbs and
   verify selections/prompt persist.
7. Confirm formulas expose KaTeX/MathML while prompt/output remain literal.
8. Repeat at desktop and 390x844 with no horizontal document overflow or clipped error detail.
9. Confirm a blocked module Worker shows an alert and leaves Generate disabled.

## Numerical and provenance acceptance

- Golden prompt: `the cat sat on the`.
- Elementwise contract: `abs(error) <= 1e-4 + 1e-4 * abs(Python)`.
- Token IDs, masks, future-zero cells, shapes, and Top-K IDs match exactly.
- Canonical nanoGPT commit equals `reference/NANOGPT_COMMIT`.
- Model/reference copies and SHA-256 manifests verify byte-for-byte.

Measured tensor errors and fixture hashes live in [NUMERICAL_PARITY.md](NUMERICAL_PARITY.md).

## Release receipt

Before handoff, record:

- `git status --short`,
- root artifact uncompressed and deterministic per-resource gzip sizes,
- Worker WASM size,
- exact commands and exit codes,
- screenshots for Root, Block, Attention desktop/mobile,
- any validator that could not run and why.

Do not commit `apps/web/dist`, temporary browser profiles, or generated evidence directories.
