# Transformer Viz

Transformer Viz is a backend-free teaching application for a tiny nanoGPT-compatible Transformer.
React renders three explorable architecture surfaces while a dedicated Rust/WASM module Worker owns
tokenization, Candle CPU inference, generation, sampling, and trace capture:

- Root Architecture
- Transformer Block Detail
- Self-Attention Detail

Prompt, Generate, Stop, decoded continuation, generated-step selection, and trace replay all use
the real Worker. Architecture navigation changes browser UI state only; it never infers missing
values or reruns the model.

## Runtime boundary

The main thread contains React 19, strict TypeScript, semantic SVG, CSS, and KaTeX. It receives only
validated, versioned Worker responses generated from the canonical Rust schema through `ts-rs`.
TypeScript does not implement model math, tokenization, sampling, generation, or trace
reconstruction.

The Worker:

1. validates same-origin model URLs and bounded response sizes,
2. verifies the canonical manifest and asset checksums,
3. loads config, tokenizer, and safetensors,
4. runs the explicit Candle f32 Transformer,
5. streams compact generation summaries, and
6. reconstructs a selected generation step without sampling it again.

Each generated token uses another full-prefix forward. This educational model does not use a KV
cache.

## Model and scope

The bundled `nanogpt-edu` model is not GPT-2 124M or a general-purpose language model. It has:

- 2 Transformer Blocks
- 4 attention heads
- embedding width 64
- context length 24
- vocabulary size 259
- f32 weights and batch size 1

The deterministic byte-fallback tokenizer reserves BOS `0`, EOS `1`, and UNK `2`, then maps byte
`b` to `b + 3`. Runtime assets stay same-origin. No backend, external inference API, CDN, WebGPU,
or TypeScript numerical fallback ships.

## Development

Prerequisites:

- Rust 1.94.0 through `rustup`
- Node 22.22.0 (`.node-version`)
- pnpm 11.22.0
- Python 3
- Google Chrome or Chromium for release gates

Bootstrap installs/checks the WASM target, wasm-bindgen CLI 0.2.127, frozen pnpm dependencies, and
Binaryen 123.0.0:

```sh
git clone --recurse-submodules https://github.com/code0-god/transformer_viz.git
cd transformer_viz
./scripts/bootstrap.sh
pnpm dev
```

Vite serves the app at `http://127.0.0.1:5173/`. Computation still runs in the real module Worker.

## Repository boundaries

- `apps/web`: React/TypeScript/Vite UI, CSS, KaTeX, generated TypeScript bindings, public assets.
- `apps/worker`: Rust/WASM Worker entry and runtime orchestration.
- `crates/nanogpt-schema`: canonical typed request/response and trace DTOs.
- `crates/nanogpt-tokenizer`: deterministic byte-fallback tokenizer.
- `crates/nanogpt-model`: nanoGPT-compatible Candle model and sampling.
- `crates/nanogpt-trace`: intermediate tensor evidence.
- `reference/nanoGPT`: pinned read-only upstream source used for provenance and golden fixtures.

See [architecture](docs/ARCHITECTURE.md), [design](docs/DESIGN.md),
[notation](docs/NOTATION.md), [trace schema](docs/TRACE_SCHEMA.md), and
[model format](docs/MODEL_FORMAT.md).

## Verification

Run the canonical repository gate with the pinned Node version active:

```sh
./scripts/check.sh
```

It verifies:

- frozen JavaScript dependencies and generated binding freshness,
- Biome, TypeScript, and Vitest,
- rustfmt, strict native/WASM Clippy, Rust tests, and release compilation,
- golden numerical parity and canonical model/reference checksums,
- root and `/transformer_viz/` Vite releases,
- CSP and same-origin JS/CSS/WASM/font/model assets,
- real-Chrome Worker readiness, failure handling, generation, architecture navigation, KaTeX
  semantics, responsive layout, and integrity rejection paths.

Build one deployable artifact directly:

```sh
./scripts/build-web.sh / apps/web/dist
./scripts/build-web.sh /transformer_viz/ apps/web/dist
```

The second form is the GitHub Pages project-path release. `apps/web/dist` contains static HTML,
hashed JavaScript/CSS/Worker/WASM/font assets, canonical model files, and pinned read-only
`reference/model.py`/`reference/LICENSE` records. No Python or server runtime executes in the
deployed application.

## Static deployment policy

The root entry and configured slash-delimited deployment prefix are supported. Arbitrary deep
links are unsupported unless the host rewrites them to that entry.

Production HTML contains one external Vite module script and no inline script. The canonical CSP
allows only same-origin scripts, styles, fonts, workers, connections, and runtime assets, with
`'wasm-unsafe-eval'` solely for WebAssembly compilation. KaTeX fonts are emitted as same-origin
hashed assets.

GitHub Actions pins Node, pnpm, Rust, wasm-bindgen, Binaryen, and Action revisions. The Pages
workflow publishes only `apps/web/dist`.

## Measured root artifact

The final root release built with `./scripts/build-web.sh / /tmp/transformer-viz-release-root`
contains 76 regular files:

| Measurement | Value |
|---|---:|
| Uncompressed | 4,117,775 bytes |
| Deterministic per-resource gzip (`-9n`) | 1,960,797 bytes |
| Worker WASM | 1,941,054 bytes |
| Artifact manifest SHA-256 | `33c52eed5877277041da6cdcf0a16c81da9b52e430e0b67cceb0e991c41372c1` |

Reproduce with `python3 scripts/measure-static-transfer.py /tmp/transformer-viz-release-root`.

## Numerical parity and provenance

The golden fixture prompt is `the cat sat on the`. Native Candle output is compared elementwise to
the pinned nanoGPT Python fixture using absolute-plus-relative tolerance `1e-4`; IDs, masks,
future-zero cells, shapes, and Top-K identities are exact. The largest recorded absolute error is
`2.86102295e-6` for logits.

See [numerical parity](docs/NUMERICAL_PARITY.md) and
[nanoGPT source provenance](reference/NANOGPT_SOURCE.md).

## License

Transformer Viz is MIT-licensed. nanoGPT, model/corpus, React, KaTeX, and build-tool notices are in
[THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
