# nanoGPT source reference

- Upstream: <https://github.com/karpathy/nanoGPT>
- Commit: `3adf61e154c3fe3fca428ad6bc3818b27a3b8291`
- Commit date: 2025-11-12
- License: MIT

The repository records nanoGPT as a read-only Git submodule under `reference/nanoGPT`. The pinned
commit is an immutable compatibility reference; it is not linked into the application and is not a
runtime dependency.

Unmodified convenience copies of `model.py` and `LICENSE` are published under
`apps/web/public/reference/` so the source viewer and static deployment use the exact pinned
material. `tools/reference/export_safetensors.py --source-map-only` derives every Python range and
Rust counterpart in the canonical `source_map.json` from symbol markers in that pinned file. The
license is also preserved under `assets/reference/`.
