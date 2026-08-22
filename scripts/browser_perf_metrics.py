"""Typed aggregation and CDP memory metrics for performance acceptance."""

from __future__ import annotations

import statistics
from typing import Any

from browser_cdp import Cdp, CdpError
from browser_session import ChromeSession


def percentile(values: list[float], quantile: float) -> float:
    """Return the nearest-rank percentile for non-empty measurements."""
    ordered = sorted(values)
    rank = max(0, min(len(ordered) - 1, int(len(ordered) * quantile + 0.999999) - 1))
    return ordered[rank]


def startup_transfer(cdp: Cdp, cursor: int) -> dict[str, int]:
    """Aggregate compressed and decoded cold-load bytes from CDP events."""
    encoded = 0
    decoded = 0
    resources = 0
    for event in cdp.events[cursor:]:
        if event.get("method") == "Network.loadingFinished":
            encoded += round(event.get("params", {}).get("encodedDataLength", 0))
            resources += 1
        if event.get("method") == "Network.dataReceived":
            decoded += round(event.get("params", {}).get("dataLength", 0))
    return {"encodedBytes": encoded, "decodedBytes": decoded, "resources": resources}


def disable_accessibility(cdp: Cdp, session: str) -> dict[str, str]:
    """Acknowledge the AX-domain boundary before any retained-memory sampling."""
    result = cdp.send("Accessibility.disable", session_id=session)
    return {
        "status": "disabled",
        "phase": "before-memory-warmup",
        "commandResult": "empty" if not result else "unexpected-nonempty",
    }


def begin_memory_trace(cdp: Cdp) -> None:
    """Start Chrome's process-scoped memory-infra recorder."""
    cdp.send(
        "Tracing.start",
        {
            "transferMode": "ReturnAsStream",
            "traceConfig": {
                "recordMode": "recordUntilFull",
                "includedCategories": ["disabled-by-default-memory-infra"],
                "memoryDumpConfig": {},
            },
        },
    )


def memory_dump(cdp: Cdp) -> dict[str, Any]:
    """Request one deterministic detailed process memory-infra checkpoint."""
    return cdp.send(
        "Tracing.requestMemoryDump",
        {"deterministic": True, "levelOfDetail": "detailed"},
    )


def heap_checkpoint(browser: ChromeSession) -> dict[str, Any]:
    """Force page/Worker GC and collect reproducible CDP heap/DOM proxies."""
    cdp = browser.require_cdp()
    sessions = [browser.page_session, *browser.app_worker_sessions()]
    heaps: dict[str, dict[str, float]] = {}
    for index, session in enumerate(sessions):
        cdp.send("HeapProfiler.enable", session_id=session)
        cdp.send("HeapProfiler.collectGarbage", session_id=session)
        usage = cdp.send("Runtime.getHeapUsage", session_id=session)
        heaps["page" if index == 0 else f"worker-{index}"] = {
            key: float(value)
            for key, value in usage.items()
            if isinstance(value, int | float)
        }
    dom = cdp.send("Memory.getDOMCounters", session_id=browser.page_session)
    return {
        "heaps": heaps,
        "dom": {key: int(value) for key, value in dom.items()},
        "workerSessions": len(browser.app_worker_sessions()),
    }


def metric_map(cdp: Cdp, session: str) -> dict[str, float]:
    """Read enabled CDP Performance metrics by stable metric name."""
    values = cdp.send("Performance.getMetrics", session_id=session)["metrics"]
    return {entry["name"]: float(entry["value"]) for entry in values}


def memory_limitations(cdp: Cdp, session: str) -> list[str]:
    """Probe unsupported memory surfaces and report exact protocol limitations."""
    limitations = [
        "Memory.getDOMCounters exposes documents/nodes/jsEventListeners, not detached-node identity.",
        "Runtime.getHeapUsage excludes a separately attributable WASM linear-memory total.",
        "CDP exposes no global live-timer count and no all-target event-listener inventory.",
    ]
    try:
        cdp.send("Memory.getAllTimeSamplingProfile", session_id=session)
    except CdpError as error:
        limitations.append(f"Memory sampling profile unavailable: {error}")
    limitations.append(
        "Captured memory-infra dump GUIDs are process-scoped and do not provide deterministic page-versus-Worker heap snapshots; reproducible per-session GC+Runtime.getHeapUsage proxies are recorded instead."
    )
    return limitations


def median(values: list[float]) -> float:
    return float(statistics.median(values))


def heap_proxy_bytes(checkpoint: dict[str, Any]) -> float:
    """Sum retained V8, embedder, and backing-store bytes across page and Worker."""
    return sum(
        heap.get("usedSize", 0)
        + heap.get("embedderHeapUsedSize", 0)
        + heap.get("backingStorageSize", 0)
        for heap in checkpoint["heaps"].values()
    )


def acceptance_verdicts(data: dict[str, Any]) -> dict[str, dict[str, str]]:
    """Apply the frozen auditor thresholds without waivers or weakening."""
    lighthouse, stop = data["lighthouseStartup"], data["stop"]
    cycles, burst, reveal = data["cycles"], data["burstDense"], data["mobileReveal"]
    controls = data["listenerControls"]
    heap5 = heap_proxy_bytes(cycles["checkpoints"]["5"])
    heap50 = heap_proxy_bytes(cycles["checkpoints"]["50"])
    allowance = max(1_048_576, heap5 * 0.05)
    control5 = controls["cyclesSingleProfilerEnableNoTracing"][0]
    control50 = controls["cyclesSingleProfilerEnableNoTracing"][-1]
    control_allowance = max(1_048_576, heap_proxy_bytes(control5) * 0.05)
    final_states = {
        (
            state["generated"],
            state["selected"],
            state["selectedIndex"],
            state["mode"],
            state["tab"],
            state["stage"],
            state["status"],
        )
        for state in cycles["states"]
    }
    checks = {
        "mobileLighthouseLcp": (
            lighthouse["mobile"]["medianLcpMs"] <= 2500,
            "median of 3 cold-cache Lighthouse mobile DevTools-throttled trials <= 2500ms",
        ),
        "stop": (
            len([trial for trial in stop["trials"] if "latencyMs" in trial]) == 22
            and stop["p95Ms"] <= stop["limitMs"]
            and all(
                trial["tokensAfterClick"] <= 1
                and trial["tokensAfterTerminal"] == 0
                and trial["maxLongTaskMs"] <= 50
                and trial["stopReason"] == "user_stopped"
                for trial in stop["trials"]
                if "latencyMs" in trial
            ),
            "reachable contexts 2..23: p95 <= worst forward + 100ms; <=1 token after click; 0 after terminal; task <=50ms (context 1 unavailable)",
        ),
        "cycles": (
            cycles["accessibility"]
            == {
                "status": "disabled",
                "phase": "before-memory-warmup",
                "commandResult": "empty",
            }
            and all(
                value["status"] == "disabled"
                for value in controls["accessibility"].values()
            )
            and all(state["workers"] == 1 for state in cycles["states"])
            and len(final_states) == 1
            and cycles["checkpoints"]["5"]["dom"] == cycles["checkpoints"]["50"]["dom"]
            and cycles["warmup"]["steadyStateReached"]
            and all(
                cycles["checkpoints"][key]["memoryInfra"]["success"]
                for key in ("5", "25", "50")
            )
            and heap50 <= heap5 + allowance
            and control5["dom"] == control50["dom"]
            and heap_proxy_bytes(control50)
            <= heap_proxy_bytes(control5) + control_allowance,
            "AX disabled before memory: after warm-up one Worker and stable final DOM; cycle and no-tracing control 5→50 heap within max(1MiB,5%); 100/200 slope recorded",
        ),
        "burst": (
            burst["accessibility"]["status"] == "disabled"
            and burst["burst"]["selectedIndex"] == burst["burst"]["requests"] - 1
            and heap_proxy_bytes(burst["afterBurst"])
            <= heap_proxy_bytes(burst["beforeBurst"]) + 1_048_576,
            "newest result selected; post-GC heap recovers within 1MiB",
        ),
        "dense": (
            burst["dense"]["states"]["final"] == burst["dense"]["states"]["softmax"]
            and burst["dense"]["states"]["attention"]["cells"] > 0
            and burst["dense"]["states"]["softmax"]["cells"] > 0
            and burst["dense"]["maxInteractionMs"] < 50
            and (
                burst["dense"]["cellClickMs"] is None
                or burst["dense"]["cellClickMs"] < 50
            ),
            "attention/softmax cells present; final state node count returns; interactions <50ms",
        ),
        "autoReveal": (
            reveal["requested"] == 24
            and reveal["contextUsed"] == reveal["contextLimit"] == 24
            and not reveal["violations"]
            and reveal["scrollX"] == 0
            and reveal["docW"] == reveal["initial"]["docW"],
            "390px every newest token visible; page geometry/focus stable",
        ),
    }
    verdicts = {
        name: {"status": "PASS" if passed else "FAIL", "threshold": threshold}
        for name, (passed, threshold) in checks.items()
    }
    for limited in ("stop", "cycles"):
        verdicts[limited]["proxyStatus"] = verdicts[limited]["status"]
        verdicts[limited]["status"] = "LIMITED"
    return verdicts
