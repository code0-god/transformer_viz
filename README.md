# Transformer Viz

Transformer Viz is a static Rust/WASM teaching application that exposes the intermediate tensors
of a small nanoGPT-compatible Transformer in the browser. Its Leptos app and dedicated Worker share
a versioned serde trace protocol and deterministic educational byte tokenizer.

## Model and scope

The bundled `nanogpt-edu` model is nanoGPT-compatible, not GPT-2 124M and not a general-purpose
language model. It has 2 blocks, 4 attention heads, embedding width 64, context length 24,
vocabulary size 259, bias enabled, and f32 weights. Its byte-fallback tokenizer reserves BOS `0`,
EOS `1`, and UNK `2`, then maps byte `b` to `b + 3`.

The Worker performs Candle CPU inference and returns real Q/K/V, causal scores and probabilities,
residuals, MLP tensors, and full-vocabulary logits. The main thread renders only serialized trace
data. See [the trace schema](docs/TRACE_SCHEMA.md) and [model format](docs/MODEL_FORMAT.md).

## Setup and development

Prerequisites are `rustup`, Cargo, and Git.

```sh
git clone --recurse-submodules https://github.com/zerogod/transformer_viz.git
cd transformer_viz
./scripts/bootstrap.sh
cd apps/web
trunk serve --open
```

The bootstrap command initializes the pinned nanoGPT submodule, Rust **1.94.0**, the
`wasm32-unknown-unknown` target, and Trunk **0.21.14**. The application then runs at
`http://127.0.0.1:8080/`; no backend or Python process is used.

The web application and Worker live in `apps/web`. Schema, tokenizer, model, and trace
responsibilities live in four separate crates under `crates/`. See
[the architecture](docs/ARCHITECTURE.md) and the
[schema/tokenizer decision](docs/adr/0003-schema-and-tokenizer.md).

## Test and release

```sh
./scripts/check.sh
./scripts/build-web.sh /                 # root-hosted release
./scripts/build-web.sh /transformer_viz/ # GitHub Pages project subpath
```

`check.sh` runs rustfmt, Clippy with `-D warnings`, all workspace tests, a root workspace release
build, the WASM package check, asset checksum/copy checks, forbidden dependency checks, and a root
Trunk release. The deployable
artifact is only `apps/web/dist`; serve that directory with any static file server. It contains
HTML, CSS, JavaScript loader glue, WebAssembly, and model assets, with no Python or server program.

## Deployment

`.github/workflows/ci.yml` runs the full gate for pushes and pull requests. The Pages workflow
builds with public URL `/transformer_viz/`, uploads `apps/web/dist`, and deploys it through GitHub
Pages. Repository Pages must use **GitHub Actions** as its source. Runtime Worker, model, and glue
URLs resolve from the document base and remain same-origin for both `/` and the project subpath.

## Measured artifact

Measurements use the committed model and a Trunk 0.21.14 release built on macOS 26.5.2 arm64:

| Item | Measured value |
|---|---:|
| Learned parameters | 118,208 |
| `model.safetensors` | 475,432 bytes |
| Model SHA-256 | `8fd76c662da0d0cb9fe1035cb205b1a071ad95f9e22d116578a0a8bec0754be9` |
| Static `dist` size | 3,201,006 apparent bytes; 3.1 MiB (`du -sh`) |
| Largest native/Python absolute error | `2.86102295e-6` (logits) |
| Parity tolerance | absolute + relative `1e-4` |

For prompt `the cat sat on the`, the deterministic reference continuation is `mat`. The first
three Top-3 token IDs are `[112, 107, 1]` (`m`, `h`, EOS), followed by `[100, 119, 1]` (`a`, `t`,
EOS), then `[119, 100, 35]` (`t`, `a`, space). The expected continuation byte is in Top-3 at every
step; this is a fixture quality check, not a claim of broad language quality.

A single warm Worker run for that prompt reported **0.70 ms** model/trace execution on an Apple M5
Pro using Chrome 151.0.7922.172 on macOS 26.5.2. It excludes asset download and WASM startup and is
an environment-specific observation, not a benchmark. Full per-tensor error measurements and
fixture provenance are in [the parity report](docs/NUMERICAL_PARITY.md).

## Regenerating reference assets

Python is needed only to retrain or regenerate golden files. Follow
[the reference tool instructions](tools/reference/README.md), then run `./scripts/check.sh` to prove
the public model copy, checksums, Rust parity, WASM target, and static release agree.

## Reference implementation

`reference/nanoGPT` is a read-only Git submodule pinned to an immutable upstream commit. It is a
reference for compatibility and golden fixtures, not a runtime dependency. Provenance and license
details are recorded in [reference/NANOGPT_SOURCE.md](reference/NANOGPT_SOURCE.md) and
[THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).

## Limits

- Inputs are limited to 24 tokens including BOS/EOS; byte tokenization makes non-ASCII text use
  multiple tokens.
- CPU f32 inference favors transparency over throughput; only one tiny educational model ships.
- Browser support requires module Workers and WebAssembly. Runtime assets must stay same-origin.
- Source links point to the pinned upstream reference, but inference never calls an external API.

## License

Transformer Viz is licensed under the MIT License. The CC0 corpus/model and MIT nanoGPT reference
retain the terms documented in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
