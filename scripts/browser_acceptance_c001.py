# /// script
# requires-python = ">=3.12"
# dependencies = []
# ///
# ─── How to run ───
# Imported by scripts/browser_acceptance.py.
"""Exact C001 generation, replay, curriculum, and responsiveness journey."""

from __future__ import annotations

from typing import Any

from browser_acceptance_c001_probes import (
    CONTEXT_PATH,
    CURRICULUM,
    EXPECTED_TITLES,
    GENERATE,
    RAPID_REPLAY,
    REPLAY,
    ROUTE,
)
from browser_acceptance_checks import (
    c001_stream_failures,
    inbound,
    outbound,
    parity_failures,
    sampling_step_failures,
)
from browser_acceptance_instrument import evaluate_dict
from browser_acceptance_qualifiers import (
    pause_failures,
    rapid_replay_failures,
    responsiveness_failures,
    selected_candidate_failures,
    stage_evidence_failures,
)
from browser_cdp import Cdp


def run(
    cdp: Cdp, session: str
) -> tuple[dict[str, Any], list[dict[str, Any]], list[str]]:
    """Run and independently validate every C001 machine contract."""
    generation = evaluate_dict(cdp, session, GENERATE)
    events = cdp.evaluate(session, "window.__acceptance.records")
    stream = events[generation["start"] :]
    failures = c001_stream_failures(stream)
    starts, tokens = (
        inbound(stream, "generation_started"),
        inbound(stream, "token_generated"),
    )
    if starts:
        prompt = bytes(
            value for token in starts[0]["prompt_tokens"] for value in token["piece"]
        ).decode()
        chips = generation["promptChips"]
        chip_match = len(chips) == len(starts[0]["prompt_tokens"]) and all(
            str(token["id"]) in chip["id"] and str(token["piece"]) in chip["bytes"]
            for token, chip in zip(starts[0]["prompt_tokens"], chips, strict=True)
        )
        display_match = all(
            token["display"] == chip["display"]
            for token, chip in zip(starts[0]["prompt_tokens"], chips, strict=True)
        )
        if prompt != "the cat" or not chip_match or not display_match:
            failures.append("prompt protocol/chips do not exactly represent the cat")
    if tokens:
        pieces = bytes(
            value
            for event in tokens
            for value in event["step"]["generated_token"]["piece"]
        ).decode(errors="replace")
        chips = generation["generatedChips"]
        chip_match = len(chips) == 8 and all(
            str(event["step"]["generated_token"]["id"]) in chip["id"]
            and str(event["step"]["generated_token"]["piece"]) in chip["bytes"]
            for event, chip in zip(tokens, chips, strict=True)
        )
        display_match = all(
            event["step"]["generated_token"]["display"] == chip["display"]
            for event, chip in zip(tokens, chips, strict=True)
        )
        if (
            pieces != generation["decoded"]
            or not pieces.strip()
            or not chip_match
            or not display_match
            or generation["fullText"].strip() != f"the cat{pieces}".strip()
        ):
            failures.append("generated chips/full meaningful decoded text mismatch")
    replay = evaluate_dict(cdp, session, REPLAY)
    events = cdp.evaluate(session, "window.__acceptance.records")
    replay_events = events[replay["start"] :]
    posts, traces = (
        outbound(replay_events, "inspect_generation_step"),
        inbound(replay_events, "generation_step_trace"),
    )
    if (
        len(posts) != 1
        or len(traces) != 1
        or posts[0].get("generation_run_id") != starts[0].get("run_id")
        or posts[0].get("step_index") != 4
        or traces[0].get("step_index") != 4
        or inbound(replay_events, "error")
        or outbound(replay_events, "generate")
    ):
        failures.append("replay cardinality/correlation violated")
    if traces:
        failures.extend(parity_failures(tokens[4]["step"], traces[0]["step"]))
    failures.extend(sampling_step_failures(tokens[4]["step"], "sample", 1.0, 20))
    failures.extend(selected_candidate_failures(tokens[4]["step"]))
    route = evaluate_dict(cdp, session, ROUTE)
    replay["tensorIds"] = route["tensors"]
    replay["source"] = route["source"]
    if (
        not any("Head 2" in value for value in route["selected"])
        or not route["tensors"]
        or not route["source"]["activeLines"]
        or route["source"]["id"] != "query_key_value"
    ):
        failures.append("Layer 0 / Head 2 replay lacks tensor/source identity")
    context_path = evaluate_dict(cdp, session, CONTEXT_PATH)
    step = tokens[4]["step"]
    before = step["context_token_ids"]
    after = [*before, step["generated_token"]["id"]]
    next_context = tokens[5]["step"]["context_token_ids"]
    sample = context_path["sample"]
    start, end, draw = (
        float(sample["selectedIntervalStart"]),
        float(sample["selectedIntervalEnd"]),
        float(sample["random"]),
    )
    if (
        not start <= draw < end
        or int(sample["selectedTokenId"]) != step["generated_token"]["id"]
    ):
        failures.append("sample interval/selected identity mismatch")
    if (
        context_path["append"]["before"] != before
        or context_path["append"]["after"] != after
        or context_path["repeat"]["after"] != after
        or context_path["repeat"]["next"] != next_context
        or len(after) != len(before) + 1
        or next_context != after
    ):
        failures.append("Append/Repeat context prefix-growth mismatch")
    curriculum = evaluate_dict(cdp, session, CURRICULUM)
    expected = [
        ("Input representation", 3),
        ("Transformer Block", 9),
        ("Prediction", 3),
        ("Generation", 6),
    ]
    if (
        [(g["title"], g["count"]) for g in curriculum["groups"]] != expected
        or [s["title"] for s in curriculum["stages"]] != list(EXPECTED_TITLES)
        or [s["current"] for s in curriculum["stages"]]
        != [f"curriculum-stage-{i}" for i in range(21)]
        or stage_evidence_failures(curriculum["stages"])
    ):
        failures.append(
            "21-step titles/groups/cursor/distinct evidence contract violated"
        )
    modes = curriculum["modes"]
    if not (
        modes["guided"]["cursor"]
        == modes["explore"]["cursor"]
        == modes["guidedAgain"]["cursor"]
        == "curriculum-stage-4"
        and modes["guided"]["architecture"]
        == modes["explore"]["architecture"]
        == modes["guidedAgain"]["architecture"]
        and modes["guided"]["details"] == modes["guidedAgain"]["details"]
        and set(modes["explore"]["details"]) <= set(modes["guided"]["details"])
        and "query" in modes["explore"]["details"]
        and modes["guided"]["source"]
        == modes["explore"]["source"]
        == modes["guidedAgain"]["source"]
        and all(
            value["evidence"].strip() and value["inspector"].strip()
            for value in modes.values()
        )
    ):
        failures.append("Guided/Explore shared focus synchronization violated")
    if not (
        modes["exploreWrites"]["cursor"]
        == modes["guidedFollows"]["cursor"]
        == "curriculum-stage-4"
        and modes["exploreWrites"]["architecture"]
        == modes["guidedFollows"]["architecture"]
        and any("K" in value for value in modes["guidedFollows"]["architecture"])
        and modes["guidedWrites"]["cursor"]
        == modes["exploreFollows"]["cursor"]
        == "curriculum-stage-7"
        and modes["guidedWrites"]["architecture"]
        == modes["exploreFollows"]["architecture"]
        and modes["guidedWrites"]["source"] == modes["exploreFollows"]["source"]
    ):
        failures.append("bidirectional shared writer synchronization violated")
    if curriculum["keyboard"] != {
        "focused": "tab-tensor",
        "selected": "tab-tensor",
    } or any(
        len(tab["visible"]) != 1
        or not tab["visible"][0]["text"].strip()
        or sum(v[1] == "true" for v in tab["selected"]) != 1
        for tab in curriculum["tabs"]
    ):
        failures.append("Inspector mouse/keyboard roving/evidence contract violated")
    speed = curriculum["speed"]
    ordered = [
        move["to"]
        for move in curriculum["autoplay"]
        if move["to"] != "curriculum-stage-17"
    ]
    if (
        not speed[0]["elapsed"] > speed[1]["elapsed"]
        or [item["pressed"] for item in speed] != [["0.5x"], ["2x"]]
        or any(item["cue"] == "none" for item in speed)
        or ordered
        != ["curriculum-stage-18", "curriculum-stage-19", "curriculum-stage-20"]
        or curriculum["stopped"]
        != {"cursor": "curriculum-stage-20", "playing": "false"}
    ):
        failures.append("speed/autoplay ordering or Repeat stop violated")
    rapid = evaluate_dict(cdp, session, RAPID_REPLAY)
    events = cdp.evaluate(session, "window.__acceptance.records")
    rapid_events = events[rapid["start"] :]
    posts = outbound(rapid_events, "inspect_generation_step")
    rapid["postSteps"] = [post["step_index"] for post in posts]
    rapid["requestIds"] = [post["request_id"] for post in posts]
    rapid["traceSteps"] = [trace["step_index"] for trace in rapid["traces"]]
    rapid["traceRequestIds"] = [trace["request_id"] for trace in rapid["traces"]]
    rapid["afterBarrierSelected"] = rapid["finalSelected"]
    failures.extend(rapid_replay_failures(rapid))
    if inbound(rapid_events, "error"):
        failures.append("rapid replay emitted error")
    failures.extend(responsiveness_failures(generation))
    failures.extend(pause_failures(curriculum["pause"]))
    if (
        generation["heartbeatMaxMs"] > 100
        or max(generation["paints"], default=0) > 100
        or generation["interactionMs"] > 50
    ):
        failures.append("generation responsiveness bound exceeded")
    return (
        {
            "generation": generation,
            "replay": replay,
            "route": route,
            "contextPath": context_path,
            "curriculum": curriculum,
            "rapidReplay": rapid,
        },
        events,
        failures,
    )
