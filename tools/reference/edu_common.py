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
import subprocess
import sys
from dataclasses import dataclass
from collections.abc import Iterator, Sequence
from pathlib import Path
from types import ModuleType
from typing import Final, Protocol, Self, overload

import numpy as np
import torch

ROOT: Final = Path(__file__).resolve().parents[2]
MODEL_DIR: Final = ROOT / "assets/models/edu"
PUBLIC_DIR: Final = ROOT / "apps/web/public/models/edu"
GOLDEN_DIR: Final = ROOT / "assets/golden/edu"
WORK_DIR: Final = ROOT / "tools/reference/.work"
CORPUS_PATH: Final = ROOT / "assets/corpus/edu_corpus.txt"
REFERENCE_PATH: Final = ROOT / "reference/nanoGPT/model.py"
REFERENCE_COMMIT_PATH: Final = ROOT / "reference/NANOGPT_COMMIT"
PUBLIC_REFERENCE_PATH: Final = ROOT / "apps/web/public/reference/model.py"
EXPECTED_NANOGPT_COMMIT: Final = "3adf61e154c3fe3fca428ad6bc3818b27a3b8291"
CANONICAL_MODEL_SHA256: Final = (
    "7c01703240dbec5d554527dc666e35b3df8391d0b117fddc07afcf325a21d11c"
)
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


class NanoGptConfig(Protocol):
    """Configuration fields consumed by the educational trace generator."""

    n_embd: int


class NanoGptAttention(Protocol):
    """Attention projections consumed by the explicit trace."""

    c_attn: torch.nn.Linear
    c_proj: torch.nn.Linear


class NanoGptMlp(Protocol):
    """MLP projections consumed by the explicit trace."""

    c_fc: torch.nn.Linear
    c_proj: torch.nn.Linear


class NanoGptBlock(Protocol):
    """Transformer block shape consumed by the explicit trace."""

    ln_1: torch.nn.LayerNorm
    attn: NanoGptAttention
    ln_2: torch.nn.LayerNorm
    mlp: NanoGptMlp


class NanoGptTransformer(Protocol):
    """Transformer components consumed by the educational tooling."""

    wte: torch.nn.Embedding
    wpe: torch.nn.Embedding
    h: Sequence[NanoGptBlock]
    ln_f: torch.nn.LayerNorm


class StateLoadResult(Protocol):
    """Result returned after loading a Torch state dictionary."""

    missing_keys: list[str]
    unexpected_keys: list[str]


class NanoGptModel(Protocol):
    """nanoGPT model capabilities required by the educational tooling."""

    transformer: NanoGptTransformer
    config: NanoGptConfig
    lm_head: torch.nn.Linear

    @overload
    def __call__(self, inputs: torch.Tensor) -> tuple[torch.Tensor, None]: ...

    @overload
    def __call__(
        self, inputs: torch.Tensor, targets: torch.Tensor
    ) -> tuple[torch.Tensor, torch.Tensor]: ...

    def eval(self) -> Self: ...

    def train(self, mode: bool = True) -> Self: ...

    def load_state_dict(
        self, state_dict: dict[str, torch.Tensor]
    ) -> StateLoadResult: ...

    def state_dict(self) -> dict[str, torch.Tensor]: ...

    def parameters(self, recurse: bool = True) -> Iterator[torch.nn.Parameter]: ...


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


def verify_reference_provenance() -> None:
    expected_commit = REFERENCE_COMMIT_PATH.read_text(encoding="utf-8").strip()
    if expected_commit != EXPECTED_NANOGPT_COMMIT:
        raise ToolError(detail=f"unexpected nanoGPT commit: {expected_commit}")
    reference_dir = REFERENCE_PATH.parent
    head = subprocess.run(
        ["git", "-C", str(reference_dir), "rev-parse", "HEAD"],
        check=True,
        capture_output=True,
        text=True,
    ).stdout.strip()
    if head != expected_commit:
        raise ToolError(
            detail=f"nanoGPT HEAD {head} differs from pin {expected_commit}"
        )
    clean = all(
        subprocess.run(command, check=False).returncode == 0
        for command in (
            ["git", "-C", str(reference_dir), "diff", "--quiet", "--", "model.py"],
            [
                "git",
                "-C",
                str(reference_dir),
                "diff",
                "--cached",
                "--quiet",
                "--",
                "model.py",
            ],
        )
    )
    if not clean:
        raise ToolError(detail="canonical nanoGPT model.py has local modifications")
    digest = sha256(REFERENCE_PATH)
    if digest != CANONICAL_MODEL_SHA256:
        raise ToolError(detail=f"unexpected canonical model.py SHA-256: {digest}")
    if REFERENCE_PATH.read_bytes() != PUBLIC_REFERENCE_PATH.read_bytes():
        raise ToolError(detail="public model.py differs from pinned canonical source")


def load_reference() -> ModuleType:
    verify_reference_provenance()
    spec = importlib.util.spec_from_file_location(
        "pinned_nanogpt_model", REFERENCE_PATH
    )
    if spec is None or spec.loader is None:
        raise ToolError(detail=f"cannot import pinned nanoGPT model: {REFERENCE_PATH}")
    module = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)
    return module


def make_model(module: ModuleType) -> NanoGptModel:
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


def parameter_count(model: NanoGptModel) -> int:
    return sum(parameter.numel() for parameter in model.parameters())


def prompt_ids() -> list[int]:
    return encode(PROMPT)


def generate(model: NanoGptModel, count: int) -> tuple[list[int], list[list[int]]]:
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
