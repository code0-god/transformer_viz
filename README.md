# Transformer Viz

Transformer Viz는 작은 nanoGPT-compatible Transformer의 실제 forward trace와 토큰 생성을
브라우저에서 21단계로 탐색하는 Guided + Explore 학습 도구입니다. It is a backend-free Rust/WASM
teaching app: Leptos renders the interface while a dedicated Rust Web Worker performs Candle CPU
inference and returns versioned, serialized tensor evidence.

![Transformer Viz Guided Learning Player showing the Attention Score stage](docs/images/guided-player.png)

## Guided + Explore 사용법 / How to use it

1. 상태가 **준비 완료**가 될 때까지 기다립니다 / wait for **Ready**.
2. **이어쓰기 생성**의 Prompt에 시작 문맥을 입력하고 Max new tokens, Temperature, Top-K,
   Mode, Seed를 설정합니다.
3. **Generate**로 생성을 시작하고 필요하면 **Stop**으로 중단합니다. Decoded continuation과
   prompt/generated raw-token reels, context usage, typed stop reason이 Worker stream대로 갱신됩니다.
4. 생성된 token 버튼을 선택해 그 token을 만든 저장 문맥의 full-forward trace를 sampling 없이
   replay합니다. 선택은 과거 token을 다시 뽑지 않습니다.
5. Guided의 Temperature → Top-K → Sampling → Generated Token → Append → Repeat를 따라가거나
   Explore의 Architecture Map에서 같은 sampling/Transformer 경로를 자유롭게 선택합니다.
6. Context Bar와 Inspector의 **설명 / Tensor / Source**에서 실제 값과 고정 nanoGPT 소스를
   비교합니다.

Legacy **문장 실행** (`WorkerRequest::Run`)은 한 문장의 inspectable forward trace를 만드는
별도 경계입니다. **이어쓰기 생성** prompt는 EOS 없는 생성 문맥이며, token별 continuation과
replay lifecycle을 사용합니다; 두 입력/실행 의미를 서로 대신 쓰지 않습니다.

The canonical curriculum has exactly 21 steps in four groups:

1. **Input representation (3)** - Tokenization, Token Embedding, Position Embedding.
2. **Transformer Block (9)** - LayerNorm, Q/K/V, Attention Score, Causal Mask, Softmax, Value
   Aggregation, Residual, MLP, Block Output.
3. **Prediction (3)** - Final LayerNorm, LM Head, Logits.
4. **Generation (6)** - Temperature, Top-K, Sampling, Generated Token, Append to Context, Repeat.

Guided transport and Explore architecture navigation share one focus and the same Main Canvas,
Inspector, and source correspondence. Stage movement, playback, mode/Inspector tabs, feature
selection, and the responsive Architecture Map drawer are browser-only actions. Layer/head/token/
attention-cell changes request cached detail for the current run; they do not rerun the full model.

Generation has exact continuation boundaries: Generate authorizes one initial full-context forward,
and each accepted generated step grants one matching single-use continuation credit. Every token is
computed by another full-prefix forward (there is no KV cache). Selecting an earlier generated token
performs one traced full-context replay without sampling again and cannot grant continuation credit.

## Model and scope

The bundled `nanogpt-edu` model is nanoGPT-compatible, **not GPT-2 124M and not a general-purpose
language model**. It has 2 blocks, 4 attention heads, embedding width 64, context length 24,
vocabulary size 259, bias enabled, and f32 weights. Its deterministic byte-fallback tokenizer
reserves BOS `0`, EOS `1`, and UNK `2`, then maps byte `b` to `b + 3`.

The Worker returns real embeddings, LayerNorm, Q/K/V, causal scores and probabilities, value
aggregation, residuals, MLP tensors, final normalization, and full-vocabulary logits. The main
thread renders only serialized trace data. The generated
`apps/web/public/models/edu/source_map.json` is authoritative for the ten canonical nanoGPT
`OperationId` source ranges and Rust counterparts; generation sampling never invents source IDs.
See [the trace schema](docs/TRACE_SCHEMA.md), [architecture](docs/ARCHITECTURE.md), and
[model format](docs/MODEL_FORMAT.md).

## Setup and development

Prerequisites are `rustup`, Cargo, Git, Python 3, and a real Google Chrome or Chromium
executable. Python 3 and Chrome/Chromium are required by the canonical release and `check.sh`
gates, not by the deployed static app. Browser verification searches, in order, the executable path
in `CHROME`, macOS Google Chrome at
`/Applications/Google Chrome.app/Contents/MacOS/Google Chrome`, then `google-chrome`, `chromium`,
and `chromium-browser` on `PATH`. Set `CHROME` to the executable path when automatic discovery is
not suitable.

```sh
git clone --recurse-submodules https://github.com/code0-god/transformer_viz.git
cd transformer_viz
./scripts/bootstrap.sh
cd apps/web
trunk serve --open
```

Bootstrap initializes the pinned nanoGPT submodule, Rust **1.94.0**, the
`wasm32-unknown-unknown` target, and Trunk **0.21.14**. The app then runs at
`http://127.0.0.1:8080/`; no backend or Python process is used.

The web application and Worker live in `apps/web`. Schema, tokenizer, model, and trace
responsibilities are separate crates under `crates/`. Guided Player and generation decisions are
recorded in [ADR 0003](docs/adr/0003-guided-learning-player.md) and
[ADR 0005](docs/adr/0005-autoregressive-generation.md); the schema/tokenizer ADR remains at
[docs/adr/0003-schema-and-tokenizer.md](docs/adr/0003-schema-and-tokenizer.md).

## Test and release

```sh
./scripts/check.sh
./scripts/build-web.sh /                 # root-hosted release
./scripts/build-web.sh /transformer_viz/ # GitHub Pages project subpath
```

`check.sh` runs rustfmt, native and WASM-target strict Clippy, workspace tests, a workspace release
build, the WASM package check, asset integrity/copy checks, forbidden dependency checks, and root +
project-subpath Trunk releases with real-Chrome Worker readiness. The only deployable artifact is
`apps/web/dist`: static HTML, CSS, JavaScript loader
glue, WebAssembly, same-origin model assets, and the pinned read-only
`reference/model.py`/`reference/LICENSE` source records. No Python or server program runs in the
artifact; `reference/model.py` is shipped solely for source correspondence.

## Static deployment

`.github/workflows/ci.yml` runs the repository gate for pushes and pull requests. The Pages workflow
builds with public URL `/transformer_viz/`, uploads `apps/web/dist`, and deploys through GitHub
Pages. Repository Pages must use **GitHub Actions** as its source.

Application, Worker, model, tokenizer, source/license, and glue URLs resolve from the document base.
Root hosting and project-subpath hosting therefore preserve the same browser Worker flow and
same-origin asset policy. The static entry point uses a same-origin CSP that permits the module
Worker, WASM compilation, and model fetches, plus `strict-origin-when-cross-origin` referrers; hosts
that can set response headers must use the matching policy documented in
[ADR 0004](docs/adr/0004-reproducible-static-deployment.md). Browser support requires module Workers
and WebAssembly.

Only the root entry point (`/`) and configured deployment-prefix entry point (such as
`/transformer_viz/`) are supported. Arbitrary nested deep links are unsupported on the static host:
GitHub Pages does not rewrite them to `index.html`.

Responsive boundaries are exact: desktop starts at 1280px with one `100dvb` no-document-scroll
three-column shell; tablet is 768-1279px with an Architecture Map drawer and two-column Canvas +
Inspector; mobile is below 768px with document scrolling, one-column regions, the drawer, sticky
compact transport, and local horizontal reels.

## Measured artifact

Measurements use a fresh, final-ish root release (`./scripts/build-web.sh / /tmp/transformer-viz-release-root`)
built with Trunk 0.21.14 on macOS 26.5.2 arm64. **Uncompressed** is the sum of emitted regular-file
sizes. **Compressed** models static transfer: `scripts/measure-static-transfer.py` sorts relative
regular-file paths, gzip-compresses each file independently at level 9 with an empty filename and
`mtime=0`, then sums the byte lengths. This is equivalent to per-resource `gzip -9 -n -c` accounting
without tar path or timestamp metadata:

```sh
python3 scripts/measure-static-transfer.py /tmp/transformer-viz-release-root
```

| Item | Measured value |
|---|---:|
| Learned parameters | 118,208 |
| `model.safetensors` | 475,432 bytes |
| Model SHA-256 | `8fd76c662da0d0cb9fe1035cb205b1a071ad95f9e22d116578a0a8bec0754be9` |
| Static `dist` size | 4,001,546 bytes uncompressed; 1,461,818 bytes deterministic per-resource gzip |
| Largest native/Python absolute error | `2.86102295e-6` (logits) |
| Parity tolerance | absolute + relative `1e-4` |

For the full-forward golden/parity fixture prompt `the cat sat on the`, the deterministic reference continuation is `mat`. The first
three Top-3 token IDs are `[112, 107, 1]` (`m`, `h`, EOS), followed by `[100, 119, 1]` (`a`, `t`,
EOS), then `[119, 100, 35]` (`t`, `a`, space). The expected continuation byte is in Top-3 at every
step; this is a fixture quality check, not a broad language-quality claim.

A single warm Worker run for that prompt reported **0.70 ms** model/trace execution on an Apple M5
Pro using Chrome 151.0.7922.172 on macOS 26.5.2. It excludes asset download and WASM startup and is
an environment-specific observation, not a benchmark. Full tensor errors and fixture provenance are
in [the numerical parity report](docs/NUMERICAL_PARITY.md).

## Reference assets and implementation

Optional reference-tool Python packages are needed only to statically analyze those tools, retrain,
or regenerate golden files; they are installed from `tools/reference/requirements.txt` in an
isolated `uv` environment and do not change the canonical release/check or deployed-app
prerequisites above. Follow [tools/reference/README.md](tools/reference/README.md), then run
`./scripts/check.sh` to prove model copies, checksums, Rust parity, WASM target, and static release
agree.

`reference/nanoGPT` is a read-only Git submodule pinned to an immutable upstream commit. It is a
compatibility and golden-fixture reference, not a runtime dependency. The release copies
`reference/model.py` and `reference/LICENSE` byte-for-byte from its canonical `model.py` and
`LICENSE`; `reference/SHA256SUMS` verifies both deployed files. Provenance and license details are in
[reference/NANOGPT_SOURCE.md](reference/NANOGPT_SOURCE.md) and
[THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).

## Limits

- Inputs are limited to 24 tokens including BOS/EOS; non-ASCII text uses multiple byte tokens.
- CPU f32 inference favors transparency over throughput; only one tiny educational model ships.
- Runtime assets must stay same-origin; inference never calls an external API.
- Source links point to pinned upstream code and license records.

## License

Transformer Viz is licensed under the MIT License. The CC0 corpus/model and MIT nanoGPT reference
retain the terms documented in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
