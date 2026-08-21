#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.12,<3.14"
# dependencies = ["numpy==2.3.2", "torch==2.8.0"]
# ///

# ─── How to run ───
# 1. Install uv: curl -LsSf https://astral.sh/uv/install.sh | sh
# 2. Run: uv run tools/reference/train_edu.py
# ──────────────────

from __future__ import annotations

import torch
from edu_common import (
    BLOCK_SIZE,
    CHECKPOINT_PATH,
    CORPUS_PATH,
    EXPECTED_CONTINUATION,
    PROMPT,
    SEED,
    WORK_DIR,
    ToolError,
    encode,
    generate,
    load_reference,
    make_model,
    parameter_count,
    seed_everything,
)

STEPS = 900
BATCH_SIZE = 48


def curriculum() -> torch.Tensor:
    examples: list[list[int]] = []
    for line in CORPUS_PATH.read_text(encoding="utf-8").splitlines():
        sentence = line.strip().lower().removesuffix(".")
        prefix, separator, last_word = sentence.rpartition(" ")
        if separator and len(encode(prefix)) + len(last_word) + 1 <= BLOCK_SIZE + 1:
            examples.append([*encode(prefix), *(byte + 3 for byte in last_word.encode()), 1])
    target = [*encode(PROMPT), *(byte + 3 for byte in EXPECTED_CONTINUATION.encode()), 1]
    examples.extend([target] * 24)
    windows = [
        (sequence + [1] * (BLOCK_SIZE + 1 - len(sequence)))[: BLOCK_SIZE + 1]
        for sequence in examples
    ]
    return torch.tensor(windows, dtype=torch.long)


def main() -> None:
    seed_everything()
    model = make_model(load_reference())
    if parameter_count(model) > 2_000_000:
        raise ToolError(detail="educational model exceeds parameter budget")
    samples = curriculum()
    optimizer = torch.optim.AdamW(model.parameters(), lr=3e-3, weight_decay=0.01)
    generator = torch.Generator().manual_seed(SEED)
    model.train()
    for step in range(STEPS):
        indices = torch.randint(len(samples), (BATCH_SIZE,), generator=generator)
        batch = samples[indices]
        _, loss = model(batch[:, :-1].contiguous(), batch[:, 1:].contiguous())
        optimizer.zero_grad(set_to_none=True)
        loss.backward()
        torch.nn.utils.clip_grad_norm_(model.parameters(), 1.0)
        optimizer.step()
        if step % 150 == 0 or step == STEPS - 1:
            print(f"step={step:04d} loss={loss.item():.6f}")
    model.eval()
    generated, rankings = generate(model, len(EXPECTED_CONTINUATION))
    expected = [byte + 3 for byte in EXPECTED_CONTINUATION.encode()]
    if any(token not in top for token, top in zip(expected, rankings, strict=True)):
        raise ToolError(detail=f"quality gate failed: expected={expected} top3={rankings}")
    WORK_DIR.mkdir(parents=True, exist_ok=True)
    torch.save({"model": model.state_dict(), "steps": STEPS}, CHECKPOINT_PATH)
    continuation = bytes(token - 3 for token in generated).decode()
    print(f"quality=top3 continuation={continuation!r}")
    print(f"parameters={parameter_count(model)} checkpoint={CHECKPOINT_PATH}")


if __name__ == "__main__":
    main()
