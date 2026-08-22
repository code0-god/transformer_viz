"""CDP instrumentation controls for performance-memory attribution."""

from __future__ import annotations

from typing import Any

from browser_perf_acceptance import ready_browser
from browser_perf_metrics import (
    begin_memory_trace,
    disable_accessibility,
    heap_checkpoint,
    memory_dump,
)
from browser_perf_probes import CYCLE_BATCH


def ax_causal_controls(url: str) -> dict[str, Any]:
    """Capture matched AX-enabled/disabled retained-memory checkpoints."""
    result: dict[str, Any] = {
        "config": {
            "cycles": [5, 50, 100],
            "gc": "HeapProfiler.collectGarbage before every checkpoint",
            "action": "Generate/Stop/replay first+last/mode+tabs; identical final state",
            "enabledCommand": "Accessibility.enable from ChromeSession setup",
            "disabledCommand": "Accessibility.disable after READY_PROBE and before cycles",
        }
    }
    for label in ("enabled", "disabled"):
        browser = ready_browser(url)
        try:
            cdp, session = browser.require_cdp(), browser.page_session
            boundary = (
                {"status": "enabled", "phase": "memory-control"}
                if label == "enabled"
                else disable_accessibility(cdp, session)
            )
            points = []
            first = 1
            for last in (5, 50, 100):
                state = cdp.evaluate(
                    session, f"({CYCLE_BATCH})([{first},{last}])", True
                )
                browser.session_barrier()
                points.append(
                    {
                        "cycle": last,
                        "state": state,
                        "checkpoint": heap_checkpoint(browser),
                    }
                )
                first = last + 1
            result[label] = {"accessibility": boundary, "checkpoints": points}
            result["chromeVersion"] = cdp.send("Browser.getVersion")
        finally:
            browser.__exit__(None, None, None)
    return result


def listener_controls(url: str) -> dict[str, Any]:
    """Separate product listener retention from profiler/tracing side effects."""
    idle = ready_browser(url)
    try:
        cdp = idle.require_cdp()
        idle_accessibility = disable_accessibility(cdp, idle.page_session)
        begin_memory_trace(cdp)
        idle_points = []
        for checkpoint in (1, 2, 3):
            point = heap_checkpoint(idle)
            point["memoryInfra"] = memory_dump(cdp)
            point["checkpoint"] = checkpoint
            idle_points.append(point)
        cdp.send("Tracing.end")
    finally:
        idle.__exit__(None, None, None)
    cycled = ready_browser(url)
    try:
        cdp, session = cycled.require_cdp(), cycled.page_session
        cycle_accessibility = disable_accessibility(cdp, session)
        sessions = [session, *cycled.app_worker_sessions()]
        for target in sessions:
            cdp.send("HeapProfiler.enable", session_id=target)
        cycle_points = []
        first = 1
        for last in (5, 25, 50):
            state = cdp.evaluate(session, f"({CYCLE_BATCH})([{first},{last}])", True)
            cycled.session_barrier()
            heaps = {}
            for index, target in enumerate(sessions):
                cdp.send("HeapProfiler.collectGarbage", session_id=target)
                heaps["page" if index == 0 else f"worker-{index}"] = cdp.send(
                    "Runtime.getHeapUsage", session_id=target
                )
            cycle_points.append(
                {
                    "checkpoint": last,
                    "state": state,
                    "dom": cdp.send("Memory.getDOMCounters", session_id=session),
                    "heaps": heaps,
                }
            )
            first = last + 1
        return {
            "accessibility": {
                "idle": idle_accessibility,
                "cycles": cycle_accessibility,
            },
            "idleRepeatedFull": idle_points,
            "cyclesSingleProfilerEnableNoTracing": cycle_points,
        }
    finally:
        cycled.__exit__(None, None, None)
