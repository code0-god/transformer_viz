#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.12,<3.14"
# dependencies = ["numpy==2.3.2", "safetensors==0.6.2", "torch==2.8.0"]
# ///

# ─── How to run ───
# 1. Install uv: curl -LsSf https://astral.sh/uv/install.sh | sh
# 2. This module is imported by the executable scripts in this directory.
# ──────────────────

from __future__ import annotations

import hashlib
import importlib.util
import random
import sys
from dataclasses import dataclass
from pathlib import Path
from types import ModuleType
from typing import Final

import numpy as np
import torch

ROOT: Final = Path(__file__).resolve().parents[2]
MODEL_DIR: Final = ROOT / "assets/models/edu"
PUBLIC_DIR: Final = ROOT / "apps/web/public/models/edu"
GOLDEN_DIR: Final = ROOT / "assets/golden/edu"
WORK_DIR: Final = ROOT / "tools/reference/.work"
CORPUS_PATH: Final = ROOT / "assets/corpus/edu.txt"
REFERENCE_PATH: Final = ROOT / "reference/nanoGPT/model.py"
REFERENCE_COMMIT_PATH: Final = ROOT / "reference/NANOGPT_COMMIT"
CHECKPOINT_PATH: Final = WORK_DIR / "checkpoint.pt"
SEED: Final = 20260821
BLOCK_SIZE: Final = 24
VOCAB_SIZE: Final = 259
N_LAYER: Final = 2
N_HEAD: Final = 4
N_EMBD: Final = 64
PROMPT: Final = "the cat sat on the"
EXPECTED_CONTINUATION: Final = "mat"


@dataclass(frozen=True, slots=True)
class EduConfig:
    block_size: int = BLOCK_SIZE
    vocab_size: int = VOCAB_SIZE
    n_layer: int = N_LAYER
    n_head: int = N_HEAD
    n_embd: int = N_EMBD
    dropout: float = 0.0
    bias: bool = True


@dataclass(frozen=True, slots=True)
class ToolError(Exception):
    detail: str

    def __str__(self) -> str:
        return self.detail


def seed_everything() -> None:
    random.seed(SEED)
    np.random.seed(SEED)
    torch.manual_seed(SEED)
    torch.use_deterministic_algorithms(True)
    torch.set_num_threads(1)


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def encode(text: str, *, include_eos: bool = True) -> list[int]:
    ids = [0, *(byte + 3 for byte in text.encode("utf-8"))]
    if include_eos:
        ids.append(1)
    return ids


def decode(ids: list[int]) -> str:
    return bytes(token - 3 for token in ids if token >= 3).decode("utf-8")


def load_reference() -> ModuleType:
    expected_commit = REFERENCE_COMMIT_PATH.read_text(encoding="utf-8").strip()
    if expected_commit != "3adf61e154c3fe3fca428ad6bc3818b27a3b8291":
        raise ToolError(detail=f"unexpected nanoGPT commit: {expected_commit}")
    spec = importlib.util.spec_from_file_location("pinned_nanogpt_model", REFERENCE_PATH)
    if spec is None or spec.loader is None:
        raise ToolError(detail=f"cannot import pinned nanoGPT model: {REFERENCE_PATH}")
    module = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)
    return module


def make_model(module: ModuleType) -> torch.nn.Module:
    config = EduConfig()
    reference_config = module.GPTConfig(
        block_size=config.block_size,
        vocab_size=config.vocab_size,
        n_layer=config.n_layer,
        n_head=config.n_head,
        n_embd=config.n_embd,
        dropout=config.dropout,
        bias=config.bias,
    )
    model = module.GPT(reference_config)
    model.eval()
    return model


def parameter_count(model: torch.nn.Module) -> int:
    return sum(parameter.numel() for parameter in model.parameters())


def prompt_ids() -> list[int]:
    return encode(PROMPT)


def generate(model: torch.nn.Module, count: int) -> tuple[list[int], list[list[int]]]:
    generated: list[int] = []
    rankings: list[list[int]] = []
    context = prompt_ids()
    with torch.inference_mode():
        for _ in range(count):
            inputs = torch.tensor([context[-BLOCK_SIZE:]], dtype=torch.long)
            logits, _ = model(inputs)
            top_ids = torch.topk(logits[0, -1], k=3).indices.tolist()
            rankings.append(top_ids)
            generated.append(top_ids[0])
            context.append(top_ids[0])
    return generated, rankings
