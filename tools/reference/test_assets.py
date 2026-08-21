#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.12,<3.14"
# dependencies = ["numpy==2.3.2", "packaging==25.0", "pytest==8.4.1", "safetensors==0.6.2"]
# ///

# ─── How to run ───
# 1. Install uv: curl -LsSf https://astral.sh/uv/install.sh | sh
# 2. Run: uv run --python 3.12 tools/reference/test_assets.py
# ──────────────────

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import pytest
from safetensors import safe_open

ROOT = Path(__file__).resolve().parents[2]
MODEL = ROOT / "assets/models/edu"
PUBLIC = ROOT / "apps/web/public/models/edu"
GOLDEN = ROOT / "assets/golden/edu"


def test_assets_match_checksums_when_bundle_is_generated() -> None:
    # Given: the generated canonical and public bundles.
    entries = [line.split(maxsplit=1) for line in (MODEL / "SHA256SUMS").read_text().splitlines()]
    # When: each recorded digest is recomputed.
    actual = [(hashlib.sha256((MODEL / name).read_bytes()).hexdigest(), name) for _, name in entries]
    # Then: digests and public bytes match exactly.
    assert actual == [(digest, name) for digest, name in entries]
    assert all((MODEL / name).read_bytes() == (PUBLIC / name).read_bytes() for _, name in entries)


def test_weights_have_one_tied_embedding_when_exported() -> None:
    # Given: the canonical model safetensors.
    with safe_open(MODEL / "model.safetensors", framework="np") as tensors:
        keys = set(tensors.keys())
        dtypes = {tensors.get_tensor(name).dtype.name for name in keys}
    # When: physical tensor keys are inspected.
    # Then: one f32 wte exists and no duplicated language-model head is stored.
    assert "transformer.wte.weight" in keys
    assert "lm_head.weight" not in keys
    assert dtypes == {"float32"}


def test_golden_quality_contract_when_metadata_is_loaded() -> None:
    # Given: machine-consumed golden metadata.
    metadata = json.loads((GOLDEN / "metadata.json").read_text())
    expected = [byte + 3 for byte in b"mat"]
    # When: the quality rankings and provenance are read.
    rankings = metadata["top3_token_ids_by_step"]
    # Then: each expected token is Top-3 and checksums bind fixtures to model inputs.
    assert all(token in top for token, top in zip(expected, rankings, strict=True))
    assert metadata["trace_sha256"] == hashlib.sha256((GOLDEN / "trace.safetensors").read_bytes()).hexdigest()
    assert metadata["model_sha256"] == hashlib.sha256((MODEL / "model.safetensors").read_bytes()).hexdigest()
    assert metadata["prompt_token_ids"] == [0, *(byte + 3 for byte in b"the cat sat on the"), 1]
    assert {
        "embedding",
        "layer.0.query",
        "layer.0.key",
        "layer.0.value",
        "layer.0.raw_scores",
        "layer.0.scaled_scores",
        "layer.0.mask",
        "layer.0.probabilities",
        "layer.0.attention_output",
        "layer.0.attention_residual",
        "layer.0.mlp_hidden",
        "layer.0.mlp_activated",
        "layer.0.mlp_output",
        "layer.0.output",
        "final_layer_norm",
        "logits",
        "representative.head",
        "representative.token",
    }.issubset(metadata["tensor_names"])


if __name__ == "__main__":
    raise SystemExit(pytest.main([__file__, "-q"]))
