#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.12,<3.14"
# dependencies = ["numpy==2.3.2", "packaging==25.0", "safetensors==0.6.2", "torch==2.8.0"]
# ///

# ─── How to run ───
# 1. Install uv: curl -LsSf https://astral.sh/uv/install.sh | sh
# 2. Run: uv run tools/reference/generate_golden.py
# ──────────────────

from __future__ import annotations

import json
import math

import torch
from edu_common import (
    CHECKPOINT_PATH,
    CORPUS_PATH,
    EXPECTED_CONTINUATION,
    GOLDEN_DIR,
    MODEL_DIR,
    N_HEAD,
    PROMPT,
    REFERENCE_COMMIT_PATH,
    SEED,
    ToolError,
    generate,
    load_reference,
    make_model,
    parameter_count,
    prompt_ids,
    seed_everything,
    sha256,
)
from safetensors.torch import save_file


def main() -> None:
    seed_everything()
    model = make_model(load_reference())
    checkpoint = torch.load(CHECKPOINT_PATH, map_location="cpu", weights_only=True)
    model.load_state_dict(checkpoint["model"])
    model.eval()
    inputs = torch.tensor([prompt_ids()], dtype=torch.long)
    trace = {name: tensor.clone() for name, tensor in explicit_trace(model, inputs).items()}
    generated, rankings = generate(model, len(EXPECTED_CONTINUATION))
    expected = [byte + 3 for byte in EXPECTED_CONTINUATION.encode()]
    if any(token not in top for token, top in zip(expected, rankings, strict=True)):
        raise ToolError(detail=f"Top-3 quality gate failed: expected={expected}, rankings={rankings}")
    GOLDEN_DIR.mkdir(parents=True, exist_ok=True)
    trace_path = GOLDEN_DIR / "trace.safetensors"
    save_file(trace, trace_path)
    metadata = {
        "config_sha256": sha256(MODEL_DIR / "config.json"),
        "corpus_file": "assets/corpus/edu_corpus.txt",
        "corpus_sha256": sha256(CORPUS_PATH),
        "generated_continuation": bytes(token - 3 for token in generated).decode(),
        "model_sha256": sha256(MODEL_DIR / "model.safetensors"),
        "nanogpt_commit": REFERENCE_COMMIT_PATH.read_text(encoding="utf-8").strip(),
        "parameter_count": parameter_count(model),
        "prompt": PROMPT,
        "prompt_token_ids": prompt_ids(),
        "seed": SEED,
        "source_map_sha256": sha256(MODEL_DIR / "source_map.json"),
        "tensor_count": len(trace),
        "tensor_names": sorted(trace),
        "tokenizer_sha256": sha256(MODEL_DIR / "tokenizer.json"),
        "top3_token_ids_by_step": rankings,
        "trace_sha256": sha256(trace_path),
    }
    (GOLDEN_DIR / "metadata.json").write_text(
        json.dumps(metadata, indent=2, sort_keys=True) + "\n", encoding="utf-8"
    )
    print(f"golden={trace_path} tensors={len(trace)} sha256={sha256(trace_path)}")
    print(f"quality=expected 'mat' bytes are Top-3 at every autoregressive step: {rankings}")


def explicit_trace(model: torch.nn.Module, inputs: torch.Tensor) -> dict[str, torch.Tensor]:
    trace: dict[str, torch.Tensor] = {"tokens": inputs.contiguous()}
    positions = torch.arange(inputs.size(1), dtype=torch.long)
    token_embeddings = model.transformer.wte(inputs)
    position_embeddings = model.transformer.wpe(positions)
    hidden = token_embeddings + position_embeddings
    trace["token_embeddings"] = token_embeddings.detach().contiguous()
    trace["position_embeddings"] = position_embeddings.detach().contiguous()
    trace["embedding_sum"] = hidden.detach().contiguous()
    for layer, block in enumerate(model.transformer.h):
        prefix = f"layer.{layer}"
        trace[f"{prefix}.input"] = hidden.detach().contiguous()
        normalized = block.ln_1(hidden)
        qkv = block.attn.c_attn(normalized)
        query, key, value = qkv.split(model.config.n_embd, dim=2)
        head_size = model.config.n_embd // N_HEAD
        query = query.view(1, inputs.size(1), N_HEAD, head_size).transpose(1, 2).contiguous()
        key = key.view(1, inputs.size(1), N_HEAD, head_size).transpose(1, 2).contiguous()
        value = value.view(1, inputs.size(1), N_HEAD, head_size).transpose(1, 2).contiguous()
        raw = query @ key.transpose(-2, -1)
        scaled = raw / math.sqrt(head_size)
        mask = torch.tril(torch.ones(inputs.size(1), inputs.size(1), dtype=torch.bool))
        probabilities = torch.softmax(scaled.masked_fill(~mask, float("-inf")), dim=-1)
        attended = probabilities @ value
        merged = attended.transpose(1, 2).contiguous().view(1, inputs.size(1), model.config.n_embd)
        projected = block.attn.c_proj(merged)
        attention_residual = hidden + projected
        mlp_input = block.ln_2(attention_residual)
        mlp_hidden = block.mlp.c_fc(mlp_input)
        activated = torch.nn.functional.gelu(mlp_hidden, approximate="none")
        mlp_output = block.mlp.c_proj(activated)
        hidden = attention_residual + mlp_output
        values = {
            "ln_1": normalized,
            "query": query,
            "key": key,
            "value": value,
            "raw_scores": raw,
            "scaled_scores": scaled,
            "mask": mask,
            "probabilities": probabilities,
            "attention_output": attended,
            "merged": merged,
            "projected": projected,
            "attention_residual": attention_residual,
            "ln_2": mlp_input,
            "mlp_hidden": mlp_hidden,
            "mlp_activated": activated,
            "mlp_output": mlp_output,
            "output": hidden,
        }
        trace.update({f"{prefix}.{name}": tensor.detach().contiguous() for name, tensor in values.items()})
    normalized = model.transformer.ln_f(hidden)
    logits = model.lm_head(normalized)
    trace["final_layer_norm"] = normalized.detach().contiguous()
    trace["logits"] = logits.detach().contiguous()
    trace["last_token_logits"] = logits[:, -1].detach().contiguous()
    trace["last_token_top3_ids"] = torch.topk(logits[0, -1], k=3).indices.contiguous()
    trace["representative.head"] = trace["layer.0.probabilities"][:, 1].contiguous()
    trace["representative.token"] = hidden[:, -1].detach().contiguous()
    return trace


if __name__ == "__main__":
    main()
