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
import subprocess
from pathlib import Path

import numpy as np
import pytest
from safetensors import safe_open

ROOT = Path(__file__).resolve().parents[2]
MODEL = ROOT / "assets/models/edu"
PUBLIC = ROOT / "apps/web/public/models/edu"
GOLDEN = ROOT / "assets/golden/edu"
CORPUS = ROOT / "assets/corpus/edu_corpus.txt"
REFERENCE = ROOT / "reference/nanoGPT"
PINNED_COMMIT = "3adf61e154c3fe3fca428ad6bc3818b27a3b8291"
MODEL_PY_SHA256 = "7c01703240dbec5d554527dc666e35b3df8391d0b117fddc07afcf325a21d11c"


def test_manifest_and_corpus_use_canonical_contract_when_loaded() -> None:
    # Given: the generated manifest and corpus inputs.
    manifest = json.loads((MODEL / "manifest.json").read_text())
    required = {
        "schema_version",
        "model_id",
        "display_name",
        "architecture",
        "dtype",
        "weights_file",
        "weights_sha256",
        "weights_size_bytes",
        "config_file",
        "config_sha256",
        "config_size_bytes",
        "tokenizer_file",
        "tokenizer_sha256",
        "tokenizer_size_bytes",
        "nanogpt_commit",
        "parameter_count",
        "max_sequence_length",
        "license",
    }
    # When: the canonical boundary fields and source path are inspected.
    # Then: no nested compatibility shape remains and provenance uses the binding corpus path.
    assert set(manifest) == required
    assert manifest["schema_version"] == "1.1.0"
    assert manifest["model_id"] == "nanogpt-edu"
    assert manifest["display_name"] == "nanoGPT Educational Model"
    assert manifest["architecture"] == "nanogpt-decoder-v1"
    for kind in ("weights", "config", "tokenizer"):
        asset = MODEL / manifest[f"{kind}_file"]
        assert (
            manifest[f"{kind}_sha256"] == hashlib.sha256(asset.read_bytes()).hexdigest()
        )
        assert manifest[f"{kind}_size_bytes"] == asset.stat().st_size
    assert manifest["config_file"] == "config.json"
    assert manifest["tokenizer_file"] == "tokenizer.json"
    manifest_digest = hashlib.sha256((MODEL / "manifest.json").read_bytes()).hexdigest()
    worker_source = (ROOT / "apps/worker/src/asset_policy.rs").read_text()
    assert manifest_digest in worker_source
    assert CORPUS.is_file()
    assert not (ROOT / "assets/corpus/edu.txt").exists()


def test_assets_match_checksums_when_bundle_is_generated() -> None:
    # Given: the generated canonical and public bundles.
    entries = [
        line.split(maxsplit=1)
        for line in (MODEL / "SHA256SUMS").read_text().splitlines()
    ]
    # When: each recorded digest is recomputed.
    actual = [
        (hashlib.sha256((MODEL / name).read_bytes()).hexdigest(), name)
        for _, name in entries
    ]
    # Then: digests and public bytes match exactly.
    assert actual == [(digest, name) for digest, name in entries]
    assert all(
        (MODEL / name).read_bytes() == (PUBLIC / name).read_bytes()
        for _, name in entries
    )


def test_pinned_reference_source_and_public_copies_are_exact() -> None:
    head = subprocess.run(
        ["git", "-C", str(REFERENCE), "rev-parse", "HEAD"],
        check=True,
        capture_output=True,
        text=True,
    ).stdout.strip()
    assert head == PINNED_COMMIT
    assert (ROOT / "reference/NANOGPT_COMMIT").read_text().strip() == PINNED_COMMIT
    for diff_mode in ("diff", "diff --cached"):
        assert (
            subprocess.run(
                [
                    "git",
                    "-C",
                    str(REFERENCE),
                    *diff_mode.split(),
                    "--quiet",
                    "--",
                    "model.py",
                ],
                check=False,
            ).returncode
            == 0
        )
    canonical = (REFERENCE / "model.py").read_bytes()
    assert hashlib.sha256(canonical).hexdigest() == MODEL_PY_SHA256
    assert canonical == (ROOT / "apps/web/public/reference/model.py").read_bytes()
    license_bytes = (REFERENCE / "LICENSE").read_bytes()
    assert license_bytes == (ROOT / "apps/web/public/reference/LICENSE").read_bytes()
    assert license_bytes == (ROOT / "assets/reference/nanoGPT-LICENSE.txt").read_bytes()


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
    assert (
        metadata["trace_sha256"]
        == hashlib.sha256((GOLDEN / "trace.safetensors").read_bytes()).hexdigest()
    )
    assert (
        metadata["model_sha256"]
        == hashlib.sha256((MODEL / "model.safetensors").read_bytes()).hexdigest()
    )
    assert (
        metadata["config_sha256"]
        == hashlib.sha256((MODEL / "config.json").read_bytes()).hexdigest()
    )
    assert (
        metadata["tokenizer_sha256"]
        == hashlib.sha256((MODEL / "tokenizer.json").read_bytes()).hexdigest()
    )
    assert (
        metadata["source_map_sha256"]
        == hashlib.sha256((MODEL / "source_map.json").read_bytes()).hexdigest()
    )
    assert metadata["corpus_sha256"] == hashlib.sha256(CORPUS.read_bytes()).hexdigest()
    assert metadata["nanogpt_commit"] == PINNED_COMMIT
    assert metadata["reference_model_sha256"] == MODEL_PY_SHA256
    assert metadata["corpus_file"] == "assets/corpus/edu_corpus.txt"
    assert metadata["prompt_token_ids"] == [
        0,
        *(byte + 3 for byte in b"the cat sat on the"),
        1,
    ]
    with safe_open(MODEL / "model.safetensors", framework="np") as weights:
        weight_names = weights.keys()
        assert metadata["parameter_count"] == sum(
            weights.get_tensor(name).size for name in weight_names
        )
    with safe_open(GOLDEN / "trace.safetensors", framework="np") as trace:
        assert metadata["tensor_count"] == len(trace.keys())
        assert metadata["tensor_names"] == sorted(trace.keys())
    assert {
        "token_embeddings",
        "position_embeddings",
        "embedding_sum",
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
        "last_token_logits",
        "top_k_ids",
        "representative.head",
        "representative.token",
    }.issubset(metadata["tensor_names"])


def test_golden_embeddings_and_last_token_are_exact_projections_when_loaded() -> None:
    # Given: independently named embedding and final-token tensors from Python nanoGPT.
    with safe_open(GOLDEN / "trace.safetensors", framework="np") as tensors:
        token_embeddings = tensors.get_tensor("token_embeddings")
        position_embeddings = tensors.get_tensor("position_embeddings")
        embedding_sum = tensors.get_tensor("embedding_sum")
        logits = tensors.get_tensor("logits")
        last_token_logits = tensors.get_tensor("last_token_logits")
        top_k_ids = tensors.get_tensor("top_k_ids")
    # When: the canonical projections are recomputed from their source tensors.
    expected_top3 = np.argsort(last_token_logits[0])[-3:][::-1]
    # Then: the stored boundaries preserve exact embedding and final-token relationships.
    np.testing.assert_allclose(
        embedding_sum, token_embeddings + position_embeddings, rtol=0.0, atol=0.0
    )
    np.testing.assert_allclose(last_token_logits, logits[:, -1], rtol=0.0, atol=0.0)
    np.testing.assert_array_equal(top_k_ids, expected_top3)


if __name__ == "__main__":
    raise SystemExit(pytest.main([__file__, "-q"]))
