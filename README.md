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

## Learning tracks

Currently provided learning track:

- **Decoder-only Fundamentals**

Currently bundled runtime model:

- **nanoGPT Educational Model** (`nanogpt-edu`, architecture `nanogpt-decoder-v1`)

The application resolves runtime architecture metadata through a Learning Track registry. The
current profile owns GPT Root, Transformer Block, Self-Attention, guide content, and notation while
the renderer/workspace behavior contains no model-specific teaching copy. A second profile still
requires the current route/node identifier and coverage-mapping seams to be generalized.

### Learning Workspace

Learn is a centered, article-first reading surface. Each Chapter opens with one compact progress
label, title, learning promise, and the first explanatory paragraph. Short Part 0 Chapters omit the
outline; longer GPT, Transformer Block, and Self-Attention guides may expose one compact,
collapsed outline.

Required educational material appears directly where the surrounding
explanation needs it. Content-owned Figure blocks resolve through the active
Learning Track registry and render semantic prose, wide, or full Figures with
captions. Learn has no diagram overlay trigger, close button, backdrop, or zoom
toolbar. Architecture detail links use normal Chapter hash navigation.

Lab remains experiment-first. Architecture, Block, Self-Attention, and the
actual-trace Score Matrix open through the shared focused viewer. Closing the
viewer restores trigger focus without changing Worker state, generation
semantics, route ownership, layer, or head.

Part 0 keeps separate editorial responsibilities:

- 0.2 defines token units, boundaries, and the distinction between a token and token ID.
- 0.3 connects tokens to vocabulary addresses.
- 0.4 compares Word, Character, Subword, and Byte tokenization trade-offs.

Architecture and concept diagrams remain semantic SVG with HTML fallbacks. The actual-trace
Attention Score Matrix remains the only R3F visualization and keeps its exact HTML table fallback.
The workspace does not ship general tensor, Q/K/V, Scale, Mask, Softmax, KV-cache, Encoder-Decoder,
or Cross-Attention visualizations. See
[Model and Learning Profiles](docs/MODEL_AND_LEARNING_PROFILES.md) and
[ADR 0012](docs/adr/0012-inline-learning-figures.md).

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

### Docker

Docker avoids installing the pinned Node, pnpm, Rust, wasm-bindgen, Binaryen, and Chromium
toolchains on the host:

```sh
./bootstrap.sh
```

Open `http://127.0.0.1:5173/`. The container rebuilds the Rust/WASM Worker and Vite production
artifact, then serves it with Python's static HTTP server. Vite's development Worker query URLs and
chunked preview responses are intentionally rejected by the shipping asset policy. Restart Compose
after source changes by rerunning `./bootstrap.sh`. Dependency and Cargo build outputs stay in named
Docker volumes.

Run the production build or canonical gate in the same environment:

```sh
docker compose run --rm web ./scripts/build-web.sh / apps/web/dist
docker compose run --rm web ./scripts/check.sh
./shutdown.sh
```

Docker Desktop blocks Chromium's nested namespace sandbox. Browser gates therefore run Chromium as
the unprivileged `node` user with `--no-sandbox`, while retaining Docker's default seccomp policy
and granting no extra container capabilities. The browser only loads this repository's trusted
localhost artifact; do not reuse the wrapper for untrusted pages.

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
| Uncompressed | 4,116,680 bytes |
| Deterministic per-resource gzip (`-9n`) | 1,960,648 bytes |
| Worker WASM | 1,941,051 bytes |
| Artifact manifest SHA-256 | `4f2ffa19711927e1a5f065529aee1636b9c3a936408910926ea0d613b01f60c6` |

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
