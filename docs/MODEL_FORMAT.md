# Educational model format

The canonical bundle is `assets/models/edu`; `apps/web/public/models/edu` must be byte-identical.
At release time Trunk copies it to `dist/models/edu`. All manifest filenames are relative to the
manifest location so root and GitHub Pages subpath deployments use the same bundle.

## Manifest and configuration

`manifest.json` uses schema `1.0.0`, model ID `nanogpt-edu`, architecture
`nanogpt-compatible`, dtype `f32`, license `CC0-1.0`, and pinned nanoGPT commit
`3adf61e154c3fe3fca428ad6bc3818b27a3b8291`. It binds the config, tokenizer, and weight filenames,
the exact weight SHA-256, parameter count 118,208, and maximum sequence length 24.

`config.json` uses upstream nanoGPT names:

| Field | Value |
|---|---:|
| `block_size` | 24 |
| `vocab_size` | 259 |
| `n_layer` | 2 |
| `n_head` | 4 |
| `n_embd` | 64 |
| `bias` | true |

The tokenizer is `byte_fallback_v1`: BOS 0, EOS 1, UNK 2, and byte IDs offset by 3. Encoding adds
BOS/EOS and truncates at a valid UTF-8 boundary while reserving EOS.

## Safetensors layout

`model.safetensors` is 475,432 bytes and contains f32 tensors using Candle/PyTorch linear layout
`[out, in]`. Names follow nanoGPT's `transformer.wte`, `transformer.wpe`, repeated
`transformer.h.N` blocks, and `transformer.ln_f`. Combined attention projection output is ordered
Q, K, V. The LM head is tied to `transformer.wte.weight`; no duplicate `lm_head.weight` is stored.
The Worker verifies SHA-256 before parsing and rejects dimensions inconsistent with config or
tokenizer limits.

This is a tiny trained teaching asset, not an upstream nanoGPT checkpoint and not GPT-2 124M.
Training corpus and license are in `assets/corpus`; generation commands and pinned Python
dependencies are in [the reference tools guide](../tools/reference/README.md).
