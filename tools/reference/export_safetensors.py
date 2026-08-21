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
    source_map = build_source_map()
    write_json(MODEL_DIR / "source_map.json", source_map)
    tokenizer = MODEL_DIR / "tokenizer.json"
    manifest = {
        "metadata": {
            "corpus": "Original CC0 educational sentences in assets/corpus/edu.txt",
            "name": "Transformer Viz EDU-2L-64D",
            "nanogpt_commit": REFERENCE_COMMIT_PATH.read_text(encoding="utf-8").strip(),
            "parameter_count": parameter_count(model),
        },
        "model": model_config,
        "schema_version": "1.0.0",
        "tokenizer": descriptor(tokenizer),
        "weights": descriptor(weights),
    }
    write_json(MODEL_DIR / "manifest.json", manifest)
    names = ["config.json", "manifest.json", "model.safetensors", "source_map.json", "tokenizer.json"]
    checksums = "".join(f"{sha256(MODEL_DIR / name)}  {name}\n" for name in names)
    (MODEL_DIR / "SHA256SUMS").write_text(checksums, encoding="utf-8")
    PUBLIC_DIR.mkdir(parents=True, exist_ok=True)
    for path in MODEL_DIR.iterdir():
        if path.is_file():
            shutil.copy2(path, PUBLIC_DIR / path.name)
    print(f"weights={weights.stat().st_size} sha256={sha256(weights)} corpus={sha256(CORPUS_PATH)}")


def write_json(path, value) -> None:
    path.write_text(json.dumps(value, indent=2, sort_keys=True) + "\n", encoding="utf-8")


def descriptor(path) -> dict[str, str | int]:
    return {"sha256": sha256(path), "size_bytes": path.stat().st_size, "url": path.name}


def build_source_map() -> dict[str, dict[str, str | int]]:
    lines = (MODEL_DIR.parents[2] / "reference/nanoGPT/model.py").read_text(encoding="utf-8").splitlines()
    needles = {
        "embedding": "tok_emb = self.transformer.wte(idx)",
        "attention_layer_norm": "x = x + self.attn(self.ln_1(x))",
        "query_key_value": "q, k, v  = self.c_attn(x).split",
        "attention": "att = (q @ k.transpose(-2, -1))",
        "attention_residual": "x = x + self.attn(self.ln_1(x))",
        "mlp_layer_norm": "x = x + self.mlp(self.ln_2(x))",
        "mlp": "x = self.c_fc(x)",
        "mlp_residual": "x = x + self.mlp(self.ln_2(x))",
        "final_layer_norm": "x = self.transformer.ln_f(x)",
        "logits": "logits = self.lm_head(x[:, [-1], :])",
    }
    result: dict[str, dict[str, str | int]] = {}
    for operation, needle in needles.items():
        line = next(index for index, source in enumerate(lines, start=1) if needle in source)
        result[operation] = {
            "file": "reference/model.py",
            "line_end": line,
            "line_start": line,
            "symbol": operation,
        }
    return result


if __name__ == "__main__":
    main()
