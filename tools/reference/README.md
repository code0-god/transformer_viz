# Python golden reference

These tools train and export the tiny educational model from the pinned nanoGPT `model.py`. They
use Python 3.12 through `uv`; the browser, release artifact, and Rust runtime do not require Python.
Initialize `reference/nanoGPT` with `git submodule update --init --recursive` before running them.

The corpus at `assets/corpus/edu_corpus.txt` is original CC0 text. Training is deterministic on
CPU: Python, NumPy, and PyTorch use seed `20260821`, one CPU thread, deterministic algorithms, and
dropout `0`. The completion format places EOS after each sentence prefix, matching the Rust
tokenizer's inference representation.

## Rebuild from clean generated outputs

```sh
rm -rf assets/models/edu assets/golden/edu apps/web/public/models/edu tools/reference/.work
uv run --python 3.12 tools/reference/build_tokenizer.py
uv run --python 3.12 tools/reference/train_edu.py
uv run --python 3.12 tools/reference/export_safetensors.py
uv run --python 3.12 tools/reference/generate_golden.py
uv run --python 3.12 tools/reference/test_assets.py
```

`requirements.txt` records the same exact dependency versions as the scripts' PEP 723 metadata.
The canonical bundle is `assets/models/edu`; the byte-identical static copy is
`apps/web/public/models/edu`. Golden tensors and provenance live in `assets/golden/edu`.

After regeneration, run:

```sh
./scripts/check.sh
```

The gate verifies every `SHA256SUMS` entry, canonical/public byte equality, native golden parity,
the WASM package, and the static release. Review model, trace, and `du -ah apps/web/dist` sizes;
generated files are intentionally committed so deployment never trains or downloads a model.

Architecture: block size 24, 2 layers, 4 heads, embedding width 64, vocabulary 259, f32 CPU.
The safetensors file uses PyTorch/Candle `[out, in]` linear weights and stores
`transformer.wte.weight` once; `lm_head.weight` is intentionally absent because logits are tied.

The original corpus is CC0-1.0. The pinned nanoGPT source and unmodified `model.py`/license copies
remain MIT and reference-only; see `THIRD_PARTY_NOTICES.md`. The trained asset is limited to 118,208
parameters and 24 tokens and exists only for deterministic educational traces. Regeneration may
change learned bytes and golden values, so checksum, Top-3 quality, and Rust parity failures must be
resolved together rather than updating one output in isolation.
