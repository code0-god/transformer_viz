# /// script
# requires-python = ">=3.12"
# dependencies = []
# ///
# ─── How to run ───
# Imported by acceptance harness and mutation selftest.
"""False-pass-resistant final qualification predicates."""

from __future__ import annotations

from typing import Any

from browser_acceptance_runtime_contract import REQUIRED_ASSETS

EXPECTED_STAGE_EVIDENCE = [
    (
        "evidence-tokenization",
        "tokenization",
        "",
        "stage-visual tokenization-visual",
        True,
    ),
    (
        "evidence-token-embedding",
        "token-embedding",
        "",
        "stage-visual token-embedding-visual",
        True,
    ),
    (
        "evidence-position-embedding",
        "position-embedding",
        "",
        "stage-visual position-embedding-visual",
        True,
    ),
    (
        "evidence-layer-norm",
        "attention-layer-norm",
        "",
        "stage-visual vector-comparison",
        True,
    ),
    ("", "query-key-value", "", "stage-visual qkv-visual", True),
    ("", "attention-score", "", "stage-visual score-visual", True),
    ("", "causal-mask", "", "stage-visual mask-visual", True),
    ("", "softmax", "", "stage-visual softmax-visual", True),
    (
        "evidence-value-aggregation",
        "value-aggregation",
        "",
        "stage-visual value-visual",
        True,
    ),
    (
        "evidence-attention-residual",
        "attention-residual",
        "",
        "stage-visual value-visual",
        True,
    ),
    ("evidence-mlp-transform", "mlp-transform", "", "stage-visual mlp-visual", True),
    ("evidence-block-output", "block-output", "", "stage-visual mlp-visual", True),
    (
        "evidence-final-layer-norm",
        "final-layer-norm",
        "",
        "stage-visual prediction-visual",
        True,
    ),
    (
        "evidence-language-model-head",
        "language-model-head",
        "",
        "stage-visual prediction-visual",
        True,
    ),
    ("evidence-logits", "logits", "", "stage-visual prediction-visual", True),
    (
        "generation-sampling-visual",
        "",
        "temperature",
        "stage-visual sampling-visual",
        False,
    ),
    ("generation-sampling-visual", "", "top-k", "stage-visual sampling-visual", False),
    ("evidence-sampling", "", "softmax", "stage-visual sampling-visual", False),
    ("evidence-generated-token", "", "", "generated-token-evidence", False),
    ("generation-sampling-visual", "", "append", "stage-visual sampling-visual", False),
    ("generation-sampling-visual", "", "repeat", "stage-visual sampling-visual", False),
]


def frozen_failures(
    provenance: dict[str, Any], expected_head: str | None, clean: bool
) -> list[str]:
    """Disallow frozen PASS unless HEAD, tree, and repository cleanliness agree."""
    if expected_head is None:
        return []
    failures = []
    if provenance["head"] != expected_head:
        failures.append("frozen HEAD mismatch")
    if provenance["workingTree"] != provenance["headTree"]:
        failures.append("frozen synthetic tree mismatch")
    if not clean:
        failures.append("frozen repository is not clean")
    return failures


def final_stream_failures(
    events: list[dict[str, Any]], request_id: int, run_id: int
) -> list[str]:
    """Reject late C001 lifecycle events after its unique terminal."""
    correlated = []
    for event in events:
        if event.get("direction") != "in":
            continue
        payload = event.get("payload", {})
        kind = payload.get("type")
        same_run = (
            payload.get("request_id") == request_id and payload.get("run_id") == run_id
        )
        same_error = kind == "error" and payload.get("request_id") == request_id
        if (
            same_run and kind in {"token_generated", "generation_finished"}
        ) or same_error:
            correlated.append(kind)
    expected = [*(["token_generated"] * 8), "generation_finished"]
    return (
        []
        if correlated == expected
        else [f"final correlated lifecycle differs: {correlated}"]
    )


def rapid_replay_failures(receipt: dict[str, Any]) -> list[str]:
    """Require two ordered requests/traces and stable newest accepted replay."""
    expected = [0, 7]
    failures = []
    if receipt.get("postSteps") != expected or receipt.get("traceSteps") != expected:
        failures.append("rapid replay request/trace order differs")
    if receipt.get("finalSelected") != 7 or receipt.get("afterBarrierSelected") != 7:
        failures.append("late replay overwrote newest step")
    if len(set(receipt.get("requestIds", []))) != 2 or receipt.get(
        "traceRequestIds"
    ) != receipt.get("requestIds"):
        failures.append("rapid replay correlation differs")
    return failures


def stage_evidence_failures(stages: list[dict[str, Any]]) -> list[str]:
    """Compare each curriculum index to its exact evidence contract."""
    actual = [
        (
            s["testid"],
            s["visual"],
            s["operation"],
            s["evidenceClass"],
            bool(s["source"]),
        )
        for s in stages
    ]
    return (
        [] if actual == EXPECTED_STAGE_EVIDENCE else ["stage evidence mapping differs"]
    )


def global_top_k_failures(
    logits: list[float], candidates: list[dict[str, Any]], top_k: int
) -> list[str]:
    """Rank the full vocabulary and reject omitted outrankers."""
    expected = sorted(
        range(len(logits)), key=lambda token_id: (-logits[token_id], token_id)
    )[: min(top_k, len(logits))]
    actual = [candidate["token_id"] for candidate in candidates]
    return (
        [] if actual == expected else [f"global top-k differs: {actual} != {expected}"]
    )


def selected_candidate_failures(
    step: dict[str, Any], tolerance: float = 1e-4
) -> list[str]:
    """Require selected scalar fields to equal the selected candidate."""
    selected = [
        c for c in step["candidates"] if c["token_id"] == step["generated_token"]["id"]
    ]
    if len(selected) != 1:
        return ["selected candidate cardinality differs"]
    candidate = selected[0]
    if (
        abs(candidate["logit"] - step["selected_logit"]) > tolerance
        or abs(candidate["probability"] - step["selected_probability"]) > tolerance
    ):
        return ["selected scalar/candidate mismatch"]
    return []


def responsiveness_failures(receipt: dict[str, Any]) -> list[str]:
    """Require paints, heartbeat coverage, no long task, and completed interaction."""
    failures = []
    if len(receipt.get("paints", [])) != 8:
        failures.append("per-token paints are not exactly eight")
    if len(receipt.get("heartbeats", [])) < 2 or receipt.get("heartbeatSpanMs", 0) <= 0:
        failures.append("heartbeat does not span generation")
    if receipt.get("longTasks"):
        failures.append("generation emitted long task")
    if receipt.get("interaction", {}).get("states") != [
        "true",
        "true",
    ] or not receipt.get("interaction", {}).get("usable"):
        failures.append("mode interaction did not complete")
    return failures


def pause_failures(receipt: dict[str, Any]) -> list[str]:
    """Require a stable cursor across one selected-speed frame interval."""
    return (
        []
        if receipt.get("before") == receipt.get("after")
        and receipt.get("frames", 0) > 1
        and receipt.get("elapsedMs", 0) >= receipt.get("intervalMs", 1)
        else ["paused cursor was not stably observed"]
    )


def korean_ui_failures(receipt: dict[str, Any]) -> list[str]:
    """Require visible Korean errors, cleared stale evidence, and valid recovery."""
    failures = []
    for key in ("empty", "overlength"):
        state = receipt.get(key, {})
        if (
            not state.get("korean")
            or state.get("generated")
            or state.get("trace")
            or state.get("inspectorEvidence")
        ):
            failures.append(f"{key} UI error/stale clearing differs")
    recovery = receipt.get("recovery", {})
    if (
        recovery.get("status") != "complete"
        or recovery.get("generated", 0) < 1
        or recovery.get("error")
    ):
        failures.append("Korean UI recovery differs")
    return failures


def asset_failures(receipts: list[dict[str, Any]], origin: str) -> list[str]:
    """Require all runtime assets to load successfully from Worker/request sessions."""
    names = {
        item["name"]
        for item in receipts
        if item.get("status") == 200
        and item.get("url", "").startswith(origin)
        and item.get("sessionType") == "worker"
    }
    return (
        []
        if REQUIRED_ASSETS <= names
        else [f"missing successful runtime assets: {sorted(REQUIRED_ASSETS - names)}"]
    )


def no_kv_failures(
    scan: dict[str, Any], compact_ok: bool, prefix_ok: bool, memory_ok: bool
) -> list[str]:
    """Combine broad source/dependency scan with structural/runtime proofs."""
    failures = []
    if scan.get("returncode") not in {0, 1}:
        failures.append("no-KV rg scan failed")
    if scan.get("forbidden"):
        failures.append("forbidden cache marker/path found")
    if not scan.get("paths") or not scan.get("manifests"):
        failures.append("no-KV scan surface incomplete")
    if not compact_ok or not prefix_ok or not memory_ok:
        failures.append("no-KV structural/runtime receipt failed")
    return failures
