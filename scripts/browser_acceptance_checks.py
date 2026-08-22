# /// script
# requires-python = ">=3.12"
# dependencies = []
# ///
# ─── How to run ───
# Imported by scripts/browser_acceptance.py; run its self-test directly.
"""Independent protocol, replay, and sampling acceptance checks."""

from __future__ import annotations

import math
from typing import Any

TOLERANCE = 1e-4
SOFTMAX_TOLERANCE = 1e-5
STEP_FIELDS = {
    "index",
    "context_token_ids",
    "generated_token",
    "selected_logit",
    "selected_probability",
    "candidates",
    "random",
    "selected_interval",
    "forward_ms",
    "sampling_ms",
    "total_ms",
}
TOKEN_FIELDS = {"id", "display", "piece", "byte_start", "byte_end", "kind"}
CANDIDATE_FIELDS = {"token_id", "display", "logit", "probability"}
INTERVAL_FIELDS = {"start", "end"}


def inbound(events: list[dict[str, Any]], kind: str) -> list[dict[str, Any]]:
    """Return ordered inbound payloads of one protocol type."""
    return [
        event["payload"]
        for event in events
        if event.get("direction") == "in"
        and event.get("payload", {}).get("type") == kind
    ]


def outbound(events: list[dict[str, Any]], kind: str) -> list[dict[str, Any]]:
    """Return ordered outbound payloads of one protocol type."""
    return [
        event["payload"]
        for event in events
        if event.get("direction") == "out"
        and event.get("payload", {}).get("type") == kind
    ]


def close(left: float, right: float, tolerance: float = TOLERANCE) -> bool:
    """Compare finite protocol floats at the acceptance tolerance."""
    return (
        math.isfinite(left)
        and math.isfinite(right)
        and math.isclose(left, right, abs_tol=tolerance, rel_tol=tolerance)
    )


def c001_stream_failures(events: list[dict[str, Any]]) -> list[str]:
    """Validate exact request, cardinality, identity, and lifecycle ordering."""
    failures: list[str] = []
    requests, starts = (
        outbound(events, "generate"),
        inbound(events, "generation_started"),
    )
    tokens, finishes = (
        inbound(events, "token_generated"),
        inbound(events, "generation_finished"),
    )
    expected = {
        "text": "the cat",
        "config": {
            "max_new_tokens": 8,
            "temperature": 1,
            "top_k": 20,
            "mode": "sample",
            "seed": 42,
        },
    }
    if len(requests) != 1 or any(
        requests[0].get(key) != value for key, value in expected.items()
    ):
        failures.append(f"exact Generate request mismatch: {requests}")
    if len(starts) != 1:
        failures.append(f"expected one generation_started, got {len(starts)}")
    elif starts[0].get("config") != expected["config"]:
        failures.append("Worker-applied C001 config differs from exact request")
    if len(tokens) != 8:
        failures.append(f"expected eight token_generated, got {len(tokens)}")
    if len(finishes) != 1 or finishes[0].get("reason") != "max_new_tokens":
        failures.append(f"expected one max_new_tokens finish: {finishes}")
    if starts and requests:
        request_id, run_id = starts[0].get("request_id"), starts[0].get("run_id")
        if request_id != requests[0].get("request_id") or any(
            event.get("request_id") != request_id or event.get("run_id") != run_id
            for event in [*tokens, *finishes]
        ):
            failures.append("request_id/run_id correlation changed within C001")
    if [event.get("step", {}).get("index") for event in tokens] != list(range(8)):
        failures.append("token indexes are not exactly 0..7")
    incoming = [event["payload"] for event in events if event.get("direction") == "in"]
    types = [event.get("type") for event in incoming]
    expected_types = [
        "generation_started",
        *(["token_generated"] * 8),
        "generation_finished",
    ]
    relevant = [
        kind
        for kind in types
        if kind
        in {"generation_started", "token_generated", "generation_finished", "error"}
    ]
    if relevant != expected_types:
        failures.append(f"invalid stream ordering/extra lifecycle event: {relevant}")
    return failures


def parity_failures(before: dict[str, Any], replay: dict[str, Any]) -> list[str]:
    """Compare complete compact replay data, including every ordered candidate."""
    failures: list[str] = []
    for field in (
        "index",
        "context_token_ids",
        "generated_token",
        "random",
        "selected_interval",
    ):
        if before.get(field) != replay.get(field):
            failures.append(f"replay changed {field}")
    for field in ("selected_logit", "selected_probability"):
        if not close(float(before[field]), float(replay[field])):
            failures.append(f"replay changed {field}")
    left, right = before.get("candidates", []), replay.get("candidates", [])
    if len(left) != len(right):
        failures.append("replay changed candidate count")
    for index, (expected, actual) in enumerate(zip(left, right, strict=False)):
        if expected.get("token_id") != actual.get("token_id"):
            failures.append(f"replay candidate {index} changed token/order")
        for field in ("logit", "probability"):
            if not close(float(expected[field]), float(actual[field])):
                failures.append(f"replay candidate {index} changed {field}")
    return failures


def sampling_step_failures(
    step: dict[str, Any], mode: str, temperature: float, top_k: int
) -> list[str]:
    """Independently verify finite top-k, temperature-softmax, and selection math."""
    failures: list[str] = []
    candidates = step["candidates"]
    if not candidates or len(candidates) > top_k:
        failures.append("invalid candidate count/top-k clamp")
    ordered = sorted(
        candidates, key=lambda item: (-float(item["logit"]), int(item["token_id"]))
    )
    if [item["token_id"] for item in candidates] != [
        item["token_id"] for item in ordered
    ]:
        failures.append("candidate order violates logit/lowest-ID tie rule")
    scaled = [float(item["logit"]) / temperature for item in candidates]
    pivot = max(scaled)
    weights = [math.exp(value - pivot) for value in scaled]
    total = sum(weights)
    expected = [value / total for value in weights]
    actual = [float(item["probability"]) for item in candidates]
    if not all(
        close(left, right) for left, right in zip(expected, actual, strict=True)
    ):
        failures.append("candidate probabilities differ from temperature softmax")
    if abs(sum(actual) - 1.0) > SOFTMAX_TOLERANCE:
        failures.append("softmax sum exceeds 1e-5")
    cumulative = 0.0
    for probability in actual:
        if not math.isfinite(probability) or not 0.0 <= probability <= 1.0:
            failures.append("candidate probability is non-finite/out of range")
        cumulative += probability
    selected_id = step["generated_token"]["id"]
    selected = [
        candidate for candidate in candidates if candidate["token_id"] == selected_id
    ]
    if (
        len(selected) != 1
        or not close(float(selected[0]["logit"]), float(step["selected_logit"]))
        or not close(
            float(selected[0]["probability"]), float(step["selected_probability"])
        )
    ):
        failures.append("selected scalar fields differ from selected candidate")
    if mode == "greedy":
        if step.get("random") is not None or step.get("selected_interval") is not None:
            failures.append("Greedy emitted categorical evidence")
        if selected_id != ordered[0]["token_id"]:
            failures.append("Greedy is not argmax/lowest-ID")
    else:
        draw, interval = float(step["random"]), step["selected_interval"]
        start, end = float(interval["start"]), float(interval["end"])
        if (
            not all(math.isfinite(value) for value in (draw, start, end))
            or not start <= draw < end
        ):
            failures.append("categorical draw is outside selected interval")
        cursor = 0.0
        matched = False
        for candidate in candidates:
            next_cursor = cursor + float(candidate["probability"])
            if (
                candidate["token_id"] == selected_id
                and close(cursor, start)
                and close(next_cursor, end)
            ):
                matched = True
            cursor = next_cursor
        if not matched:
            failures.append("selected token does not match candidate CDF interval")
    return failures


def compact_summary_failures(step: dict[str, Any]) -> list[str]:
    """Enforce the recursive compact-summary structural allowlist."""
    failures: list[str] = []
    required = STEP_FIELDS - {"random", "selected_interval"}
    if not required <= set(step) <= STEP_FIELDS:
        failures.append(f"step fields differ: {sorted(set(step) ^ STEP_FIELDS)}")
    token = step.get("generated_token", {})
    if not set(token) <= TOKEN_FIELDS or not {"id", "display", "piece", "kind"} <= set(
        token
    ):
        failures.append("generated token fields violate allowlist")
    for candidate in step.get("candidates", []):
        if set(candidate) != CANDIDATE_FIELDS:
            failures.append("candidate fields violate allowlist")
    interval = step.get("selected_interval")
    if interval is not None and set(interval) != INTERVAL_FIELDS:
        failures.append("selected interval fields violate allowlist")
    return failures
