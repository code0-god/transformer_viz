# /// script
# requires-python = ">=3.12"
# dependencies = []
# ///
# ─── How to run ───
# Imported by browser_acceptance.py.
"""Machine-readable acceptance artifact projections."""

from __future__ import annotations

from typing import Any

from browser_acceptance_c002 import replay_artifact, tokens


def payloads(
    c001: dict[str, Any], c002: dict[str, Any], runtime: dict[str, Any]
) -> dict[str, Any]:
    """Build required named evidence payloads from validated receipts."""
    return {
        "actions.json": {"c001": c001, "telemetry": runtime["telemetry"]},
        "events.json": runtime["events"],
        "replay.json": c001["replay"],
        "selftest.log": runtime["selftest"],
        "green.log": {
            "contract": "C001",
            "build": runtime["build"],
            "shippingSampling": runtime["sampling"],
            "mutationSelftest": runtime["selftest"],
        },
        "sampling-green.log": {
            "contract": "C002",
            "sameSeed": tokens(c002["sameA"]),
            "differentSeed": tokens(c002["different"]),
            "globalTopK": c002["globalTopK"],
        },
        "stop-reasons.json": {
            "reasons": runtime["reasons"],
            "browserWorkerError": c002["errorTerminal"],
        },
        "cancel-actions.json": {
            key: c002[key]
            for key in (
                "stopped",
                "duplicateCredit",
                "replacement",
                "staleContinuation",
                "staleReplay",
            )
        },
        "replay-parity.json": replay_artifact(c002),
        "edge-prompts.json": {
            key: c002[key]
            for key in (
                "empty",
                "korean",
                "tokenizer",
                "recovery",
                "uiBefore",
                "uiAfter",
            )
        }
        | {"visibleFormJourney": runtime["koreanUi"]},
        "runtime-integrity.json": {
            "deployedHashes": runtime["deployed"],
            "workerUrls": runtime["workerUrls"],
            "noKvCacheSourceScan": runtime["noCache"],
            "assetReceipts": runtime["assets"],
            "shippingSampling": runtime["sampling"],
            "publicationMutationSelftest": runtime["publicationSelftest"],
            "memory": runtime["memory"],
            "noKvFailures": runtime["kvFailures"],
        },
    }
