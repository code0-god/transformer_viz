#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.12,<3.14"
# dependencies = ["numpy==2.3.2", "packaging==25.0", "safetensors==0.6.2", "torch==2.8.0"]
# ///

# ─── How to run ───
# 1. Install uv: curl -LsSf https://astral.sh/uv/install.sh | sh
# 2. Run: uv run tools/reference/export_safetensors.py
# ──────────────────

from __future__ import annotations

import json
import shutil
import sys
from pathlib import Path

import torch
from edu_common import (
    CHECKPOINT_PATH,
    CORPUS_PATH,
    MODEL_DIR,
    PUBLIC_DIR,
    REFERENCE_COMMIT_PATH,
    EduConfig,
    ToolError,
    load_reference,
    make_model,
    parameter_count,
    sha256,
)
from safetensors.torch import save_file


def main() -> None:
    model = make_model(load_reference())
    checkpoint = torch.load(CHECKPOINT_PATH, map_location="cpu", weights_only=True)
    model.load_state_dict(checkpoint["model"])
    tensors = {
        name: value.detach().to(dtype=torch.float32).contiguous().clone()
        for name, value in model.state_dict().items()
        if name != "lm_head.weight"
    }
    weights = MODEL_DIR / "model.safetensors"
    save_file(tensors, weights)
    if weights.stat().st_size > 8 * 1024 * 1024:
        raise ToolError(detail="model.safetensors exceeds 8 MiB")
    config = EduConfig()
    model_config = {
        "bias": config.bias,
        "block_size": config.block_size,
        "n_embd": config.n_embd,
        "n_head": config.n_head,
        "n_layer": config.n_layer,
        "vocab_size": config.vocab_size,
    }
    write_json(MODEL_DIR / "config.json", model_config)
    write_source_map()
    tokenizer = MODEL_DIR / "tokenizer.json"
    manifest = {
        "architecture": "nanogpt-compatible",
        "config_file": "config.json",
        "config_sha256": sha256(MODEL_DIR / "config.json"),
        "config_size_bytes": (MODEL_DIR / "config.json").stat().st_size,
        "display_name": "nanoGPT Educational Model",
        "dtype": "f32",
        "license": "CC0-1.0",
        "max_sequence_length": config.block_size,
        "model_id": "nanogpt-edu",
        "nanogpt_commit": REFERENCE_COMMIT_PATH.read_text(encoding="utf-8").strip(),
        "parameter_count": parameter_count(model),
        "schema_version": "1.1.0",
        "tokenizer_file": tokenizer.name,
        "tokenizer_sha256": sha256(tokenizer),
        "tokenizer_size_bytes": tokenizer.stat().st_size,
        "weights_file": weights.name,
        "weights_sha256": sha256(weights),
        "weights_size_bytes": weights.stat().st_size,
    }
    write_json(MODEL_DIR / "manifest.json", manifest)
    write_checksums(MODEL_DIR)
    PUBLIC_DIR.mkdir(parents=True, exist_ok=True)
    for path in MODEL_DIR.iterdir():
        if path.is_file():
            shutil.copy2(path, PUBLIC_DIR / path.name)
    print(
        f"weights={weights.stat().st_size} sha256={sha256(weights)} corpus={sha256(CORPUS_PATH)}"
    )


def write_json(path, value) -> None:
    path.write_text(
        json.dumps(value, indent=2, sort_keys=True) + "\n", encoding="utf-8"
    )


def write_source_map() -> None:
    source_map_path = MODEL_DIR / "source_map.json"
    write_json(source_map_path, build_source_map())
    PUBLIC_DIR.mkdir(parents=True, exist_ok=True)
    shutil.copy2(source_map_path, PUBLIC_DIR / source_map_path.name)


def write_checksums(directory: Path) -> None:
    names = [
        "config.json",
        "manifest.json",
        "model.safetensors",
        "source_map.json",
        "tokenizer.json",
    ]
    checksums = "".join(f"{sha256(directory / name)}  {name}\n" for name in names)
    (directory / "SHA256SUMS").write_text(checksums, encoding="utf-8")


def refresh_source_map_only() -> None:
    write_source_map()
    write_checksums(MODEL_DIR)
    write_checksums(PUBLIC_DIR)
    metadata_path = MODEL_DIR.parents[1] / "golden/edu/metadata.json"
    metadata = json.loads(metadata_path.read_text(encoding="utf-8"))
    metadata["source_map_sha256"] = sha256(MODEL_DIR / "source_map.json")
    write_json(metadata_path, metadata)


def build_source_map() -> dict[str, dict[str, str | int]]:
    lines = (
        (MODEL_DIR.parents[2] / "reference/nanoGPT/model.py")
        .read_text(encoding="utf-8")
        .splitlines()
    )
    markers = {
        "embedding": (
            "tok_emb = self.transformer.wte(idx)",
            "x = self.transformer.drop(tok_emb + pos_emb)",
            "GPT.forward",
            "crates/nanogpt-model/src/model.rs",
            "Gpt::embed",
        ),
        "attention_layer_norm": (
            "x = x + self.attn(self.ln_1(x))",
            "x = x + self.attn(self.ln_1(x))",
            "Block.forward",
            "crates/nanogpt-model/src/layers.rs",
            "Block::forward",
        ),
        "query_key_value": (
            "q, k, v  = self.c_attn(x).split",
            "v = v.view(B, T, self.n_head",
            "CausalSelfAttention.forward",
            "crates/nanogpt-model/src/attention.rs",
            "CausalSelfAttention::forward",
        ),
        "attention": (
            "# causal self-attention;",
            "y = self.resid_dropout(self.c_proj(y))",
            "CausalSelfAttention.forward",
            "crates/nanogpt-model/src/attention.rs",
            "CausalSelfAttention::forward",
        ),
        "attention_residual": (
            "x = x + self.attn(self.ln_1(x))",
            "x = x + self.attn(self.ln_1(x))",
            "Block.forward",
            "crates/nanogpt-model/src/layers.rs",
            "Block::forward",
        ),
        "mlp_layer_norm": (
            "x = x + self.mlp(self.ln_2(x))",
            "x = x + self.mlp(self.ln_2(x))",
            "Block.forward",
            "crates/nanogpt-model/src/layers.rs",
            "Block::forward",
        ),
        "mlp": (
            "x = self.c_fc(x)",
            "return x",
            "MLP.forward",
            "crates/nanogpt-model/src/layers.rs",
            "Mlp::forward",
        ),
        "mlp_residual": (
            "x = x + self.mlp(self.ln_2(x))",
            "x = x + self.mlp(self.ln_2(x))",
            "Block.forward",
            "crates/nanogpt-model/src/layers.rs",
            "Block::forward",
        ),
        "final_layer_norm": (
            "for block in self.transformer.h:",
            "x = self.transformer.ln_f(x)",
            "GPT.forward",
            "crates/nanogpt-model/src/model.rs",
            "Gpt::finish_forward",
        ),
        "logits": (
            "if targets is not None:",
            "logits = self.lm_head(x[:, [-1], :])",
            "GPT.forward",
            "crates/nanogpt-model/src/model.rs",
            "Gpt::finish_forward",
        ),
    }
    result: dict[str, dict[str, str | int]] = {}
    for operation, (
        start_marker,
        end_marker,
        label,
        rust_file,
        rust_symbol,
    ) in markers.items():
        matching = [
            index
            for index, source in enumerate(lines, start=1)
            if start_marker in source
        ]
        start_line = matching[0]
        end_line = next(
            index
            for index, source in enumerate(lines[start_line - 1 :], start=start_line)
            if end_marker in source
        )
        result[operation] = {
            "file": "reference/model.py",
            "label": label,
            "line_end": end_line,
            "line_start": start_line,
            "rust_file": rust_file,
            "rust_symbol": rust_symbol,
            "symbol": operation,
        }
    return result


if __name__ == "__main__":
    arguments = sys.argv[1:]
    if not arguments:
        main()
    else:
        if arguments != ["--source-map-only"]:
            raise ToolError(detail=f"unsupported arguments: {arguments}")
        refresh_source_map_only()
