#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.12,<3.14"
# dependencies = ["numpy==2.3.2", "safetensors==0.6.2", "torch==2.8.0"]
# ///

# ─── How to run ───
# 1. Install uv: curl -LsSf https://astral.sh/uv/install.sh | sh
# 2. Run: uv run tools/reference/build_tokenizer.py
# ──────────────────

from __future__ import annotations

import json
import shutil

from edu_common import BLOCK_SIZE, MODEL_DIR, PUBLIC_DIR


def main() -> None:
    tokenizer = {
        "bos_id": 0,
        "byte_offset": 3,
        "eos_id": 1,
        "kind": "byte_fallback_v1",
        "max_length": BLOCK_SIZE,
        "unk_id": 2,
    }
    MODEL_DIR.mkdir(parents=True, exist_ok=True)
    PUBLIC_DIR.mkdir(parents=True, exist_ok=True)
    output = MODEL_DIR / "tokenizer.json"
    output.write_text(json.dumps(tokenizer, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    shutil.copy2(output, PUBLIC_DIR / output.name)
    print(f"wrote {output}")


if __name__ == "__main__":
    main()
