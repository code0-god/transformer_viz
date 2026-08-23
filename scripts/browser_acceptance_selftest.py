#!/usr/bin/env python3
# /// script
# requires-python = ">=3.12"
# dependencies = []
# ///
# ─── How to run ───
# uv run scripts/browser_acceptance_selftest.py
"""Mutation-oriented unit checks for acceptance validators."""

from __future__ import annotations

from copy import deepcopy
from typing import Any

from browser_acceptance_checks import (
    c001_stream_failures,
    compact_summary_failures,
    parity_failures,
    sampling_step_failures,
)
from browser_acceptance_qualifiers import (
    EXPECTED_STAGE_EVIDENCE,
    asset_failures,
    final_stream_failures,
    frozen_failures,
    global_top_k_failures,
    korean_ui_failures,
    no_kv_failures,
    pause_failures,
    rapid_replay_failures,
    responsiveness_failures,
    selected_candidate_failures,
    stage_evidence_failures,
)


def step(index: int, context: list[int]) -> dict[str, Any]:
    """Build one valid compact Sample step."""
    return {
        "index": index,
        "context_token_ids": context,
        "generated_token": {"id": 11, "display": "x", "piece": [120], "kind": "byte"},
        "selected_logit": 2.0,
        "selected_probability": 0.73105858,
        "candidates": [
            {"token_id": 11, "display": "x", "logit": 2.0, "probability": 0.73105858},
            {"token_id": 10, "display": "w", "logit": 1.0, "probability": 0.26894142},
        ],
        "random": 0.7,
        "selected_interval": {"start": 0.0, "end": 0.73105858},
        "forward_ms": 1.0,
        "sampling_ms": 0.1,
        "total_ms": 1.1,
    }


def stream() -> list[dict[str, Any]]:
    """Build one exact C001 wire stream."""
    request = {
        "type": "generate",
        "request_id": 7,
        "text": "the cat",
        "config": {
            "max_new_tokens": 8,
            "temperature": 1.0,
            "top_k": 20,
            "mode": "sample",
            "seed": 42,
        },
    }
    started = {
        "type": "generation_started",
        "request_id": 7,
        "run_id": 9,
        "prompt_tokens": [
            {"id": 0, "display": "<BOS>", "piece": [], "kind": "bos"},
            *[
                {"id": byte + 3, "display": chr(byte), "piece": [byte], "kind": "byte"}
                for byte in b"the cat"
            ],
        ],
        "config": request["config"],
        "context_limit": 24,
    }
    events = [
        {"direction": "out", "payload": request},
        {"direction": "in", "payload": started},
    ]
    context = [0, *[byte + 3 for byte in b"the cat"]]
    for index in range(8):
        current = step(index, context.copy())
        current["generated_token"] = {
            "id": 11,
            "display": "x",
            "piece": [120],
            "kind": "byte",
        }
        events.append(
            {
                "direction": "in",
                "payload": {
                    "type": "token_generated",
                    "request_id": 7,
                    "run_id": 9,
                    "step": current,
                },
            }
        )
        context.append(11)
    events.append(
        {
            "direction": "in",
            "payload": {
                "type": "generation_finished",
                "request_id": 7,
                "run_id": 9,
                "reason": "max_new_tokens",
            },
        }
    )
    return events


def main() -> int:
    """Prove each validator rejects its named regression."""
    events = stream()
    assert c001_stream_failures(events) == []
    wrong = deepcopy(events)
    wrong[0]["payload"]["config"]["seed"] = 43
    assert c001_stream_failures(wrong)
    late = deepcopy(events)
    late.append(deepcopy(events[2]))
    assert c001_stream_failures(late)
    original = step(0, [0, 1])
    replay = deepcopy(original)
    assert parity_failures(original, replay) == []
    replay["candidates"][1]["probability"] = 0.25
    assert parity_failures(original, replay)
    assert sampling_step_failures(original, "sample", 1.0, 2) == []
    invalid = deepcopy(original)
    invalid["random"] = 1.0
    assert sampling_step_failures(invalid, "sample", 1.0, 2)
    assert compact_summary_failures(original) == []
    invalid = deepcopy(original)
    invalid["tensor"] = {"shape": [2]}
    assert compact_summary_failures(invalid)
    assert selected_candidate_failures(original) == []
    invalid = deepcopy(original)
    invalid["selected_logit"] = 3.0
    assert selected_candidate_failures(invalid)
    provenance = {"head": "a", "headTree": "b", "workingTree": "b"}
    assert frozen_failures(provenance, "a", True) == []
    assert frozen_failures(provenance | {"workingTree": "c"}, "a", False)
    final = stream()
    assert final_stream_failures(final, 7, 9) == []
    final.append(deepcopy(final[2]))
    assert final_stream_failures(final, 7, 9)
    rapid = {
        "postSteps": [0, 7],
        "traceSteps": [0, 7],
        "requestIds": [2, 3],
        "traceRequestIds": [2, 3],
        "finalSelected": 7,
        "afterBarrierSelected": 7,
    }
    assert rapid_replay_failures(rapid) == []
    assert rapid_replay_failures(rapid | {"traceSteps": [7]})
    stages = [
        {
            "testid": a,
            "visual": b,
            "operation": c,
            "evidenceClass": d,
            "source": "x" if source else "",
        }
        for a, b, c, d, source in EXPECTED_STAGE_EVIDENCE
    ]
    assert stage_evidence_failures(stages) == []
    swapped = deepcopy(stages)
    swapped[0], swapped[1] = swapped[1], swapped[0]
    assert stage_evidence_failures(swapped)
    logits = [1.0, 3.0, 2.0]
    candidates = [{"token_id": 1}, {"token_id": 2}]
    assert global_top_k_failures(logits, candidates, 2) == []
    assert global_top_k_failures(logits, [{"token_id": 1}, {"token_id": 0}], 2)
    health = {
        "paints": [1] * 8,
        "heartbeats": [1, 2],
        "heartbeatSpanMs": 3,
        "longTasks": [],
        "interaction": {"states": ["true", "true"], "usable": True},
    }
    assert responsiveness_failures(health) == []
    assert responsiveness_failures(health | {"paints": []})
    pause = {
        "before": "s",
        "after": "s",
        "frames": 3,
        "elapsedMs": 800,
        "intervalMs": 750,
    }
    assert pause_failures(pause) == []
    assert pause_failures(pause | {"after": "t"})
    ui = {
        "empty": {
            "korean": True,
            "generated": 0,
            "trace": False,
            "inspectorEvidence": False,
        },
        "overlength": {
            "korean": True,
            "generated": 0,
            "trace": False,
            "inspectorEvidence": False,
        },
        "recovery": {"status": "complete", "generated": 1, "error": False},
    }
    assert korean_ui_failures(ui) == []
    assert korean_ui_failures(ui | {"empty": ui["empty"] | {"generated": 1}})
    assets = [
        {
            "name": name,
            "status": 200,
            "url": f"http://x/{name}",
            "sessionType": "worker",
        }
        for name in (
            "worker-entry.js",
            "worker_bg.wasm",
            "manifest.json",
            "config.json",
            "tokenizer.json",
            "model.safetensors",
        )
    ]
    assert asset_failures(assets, "http://x/") == []
    assert asset_failures(assets[:-1], "http://x/")
    page_assets = deepcopy(assets)
    page_assets[0]["sessionType"] = "page"
    assert asset_failures(page_assets, "http://x/")
    scan = {
        "forbidden": [],
        "paths": ["apps/web/src"],
        "manifests": ["Cargo.toml"],
        "returncode": 0,
    }
    assert no_kv_failures(scan, True, True, True) == []
    assert no_kv_failures(
        scan | {"forbidden": ["apps/web/src/components/x.rs:1: let kv_cache = 1"]},
        True,
        True,
        True,
    )
    assert no_kv_failures(scan | {"returncode": 2}, True, True, True)
    print("browser acceptance validator self-test: PASS")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
