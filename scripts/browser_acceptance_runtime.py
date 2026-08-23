# /// script
# requires-python = ">=3.12"
# dependencies = []
# ///
# ─── How to run ───
# Imported by browser_acceptance.py.
"""Runtime asset, source-surface, and shipping-test receipts."""

from __future__ import annotations

from pathlib import Path
from typing import Any
from urllib.parse import urlsplit

from browser_acceptance_artifacts import command
from browser_cdp import Cdp
from browser_session import ChromeSession

SCAN_PATHS = ["apps/web/src", "crates/nanogpt-model/src", "crates/nanogpt-schema/src"]
MANIFESTS = ["Cargo.toml", "apps/web/Cargo.toml", "crates/nanogpt-model/Cargo.toml"]
CACHE_PATTERN = "(kv.?cache|key.?cache|value.?cache|past.?key|past.?value|cached.?key|cached.?value|use.?cache)"
CACHE_COPY_ALLOWLIST = {
    (
        "apps/web/src/components/guided/generation_timeline.rs",
        105,
    ): "KV cache 없음: 매 토큰마다 전체 문맥 forward",
    (
        "apps/web/src/components/guided/stage_copy/curriculum.rs",
        129,
    ): "KV cache 없이 늘어난 전체 문맥",
    (
        "apps/web/src/components/guided/visuals/generation_sampling.rs",
        118,
    ): "KV cache 없음 · 전체 prefix",
    (
        "apps/web/src/components/guided/visuals/generation_sampling.rs",
        150,
    ): "KV cache 없이 전체 prefix를 다시 forward",
    (
        "apps/web/src/components/guided/visuals/generation_sampling.rs",
        257,
    ): "KV cache 없음 · 전체 prefix forward",
}


def responsive(cdp: Cdp, session: str) -> tuple[list[dict[str, Any]], list[str]]:
    """Measure desktop/tablet/mobile overflow and mounted control bounds."""
    records = []
    failures = []
    for width, height in ((1440, 900), (1024, 768), (390, 844)):
        cdp.send(
            "Emulation.setDeviceMetricsOverride",
            {"width": width, "height": height, "deviceScaleFactor": 1, "mobile": False},
            session,
        )
        state = cdp.evaluate(
            session,
            """new Promise(ok=>requestAnimationFrame(()=>requestAnimationFrame(()=>ok({width:innerWidth,height:innerHeight,documentWidth:document.documentElement.scrollWidth,status:document.querySelector('#status')?.dataset.status,horizontalOverflow:document.documentElement.scrollWidth>innerWidth,controlsFit:[...document.querySelectorAll('.generation-form input,.generation-form select,.generation-form textarea,.generation-actions button')].filter(n=>{const b=n.getBoundingClientRect();return b.width&&b.height}).every(n=>{const b=n.getBoundingClientRect();return b.left>=0&&b.right<=innerWidth})}))))""",
            True,
        )
        records.append(state)
        if (
            state["horizontalOverflow"]
            or not state["controlsFit"]
            or state["status"] not in {"ready", "complete"}
        ):
            failures.append(f"{width}x{height} responsive state failed: {state}")
    return records, failures


def asset_receipts(cdp: Cdp, browser: ChromeSession) -> list[dict[str, Any]]:
    """Project successful runtime responses with target-session ownership."""
    receipts = []
    for event in cdp.events:
        if event.get("method") != "Network.responseReceived":
            continue
        response = event.get("params", {}).get("response", {})
        url = response.get("url", "")
        name = Path(urlsplit(url).path).name
        if name.startswith("worker-entry-") and name.endswith(".js"):
            name = "worker-entry.js"
        elif name.startswith("worker_bg-") and name.endswith(".wasm"):
            name = "worker_bg.wasm"
        elif name not in {
            "manifest.json",
            "config.json",
            "tokenizer.json",
            "model.safetensors",
        }:
            continue
        session = event.get("sessionId", "")
        target = browser.session_targets.get(session, {})
        receipts.append(
            {
                "name": name,
                "url": url,
                "status": int(response.get("status", 0)),
                "sessionId": session,
                "sessionType": target.get(
                    "type", "page" if session == browser.page_session else "unknown"
                ),
            }
        )
    return receipts


def no_kv_scan(root: Path) -> dict[str, Any]:
    """Scan all runtime/model/state/Worker sources and dependency manifests."""
    result = command(["rg", "-n", "-i", CACHE_PATTERN, *SCAN_PATHS, *MANIFESTS], root)
    matches = [line for line in result["stdout"].splitlines() if line]
    forbidden = []
    allowed = []
    for match in matches:
        path, raw_line, content = match.split(":", 2)
        key = (path, int(raw_line))
        fragment = CACHE_COPY_ALLOWLIST.get(key)
        if fragment is not None and fragment in content and '"' in content:
            allowed.append(match)
        else:
            forbidden.append(match)
    return {
        "paths": SCAN_PATHS,
        "manifests": MANIFESTS,
        "pattern": CACHE_PATTERN,
        "matches": matches,
        "allowedExplanatoryCopy": allowed,
        "forbidden": forbidden,
        "returncode": result["returncode"],
    }


def shipping_sampling_receipt(root: Path) -> dict[str, Any]:
    """Run shipping Rust tie and replay/full-vocabulary ranking boundaries."""
    tie = command(
        [
            "cargo",
            "test",
            "-p",
            "nanogpt-model",
            "--test",
            "sampling",
            "greedy_selects_lowest_token_id_when_raw_logits_tie",
            "--",
            "--exact",
        ],
        root,
    )
    replay = command(
        [
            "cargo",
            "test",
            "-p",
            "transformer-viz-web",
            "selected_step_replay_is_exact_inspectable_and_generation_neutral",
        ],
        root,
    )
    stale_history = command(
        [
            "cargo",
            "test",
            "-p",
            "transformer-viz-web",
            "rejected_visible_generation_clears_stale_history_and_replay",
        ],
        root,
    )
    return {
        "boundary": "shipping Rust sample_final_logits tie + replay reconstruction ranks full model logits",
        "tie": tie,
        "replay": replay,
        "staleHistoryRegression": stale_history,
        "passed": tie["returncode"] == 0
        and "1 passed" in tie["stdout"]
        and replay["returncode"] == 0
        and "1 passed" in replay["stdout"]
        and stale_history["returncode"] == 0
        and "1 passed" in stale_history["stdout"],
    }
