# Python golden reference

These tools train and export the tiny educational model from the pinned nanoGPT `model.py`. They
use Python 3.12 through `uv`; the browser and Rust runtime do not require Python.

The corpus is original CC0 text. Training is deterministic on CPU: Python, NumPy, and PyTorch use
seed `20260821`, one CPU thread, deterministic algorithms, and dropout `0`. The completion format
places EOS after each sentence prefix, matching the Rust tokenizer's inference representation.

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

Architecture: block size 24, 2 layers, 4 heads, embedding width 64, vocabulary 259, f32 CPU.
The safetensors file uses PyTorch/Candle `[out, in]` linear weights and stores
`transformer.wte.weight` once; `lm_head.weight` is intentionally absent because logits are tied.
