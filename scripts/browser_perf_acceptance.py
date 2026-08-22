"""Real-Chrome performance acceptance scenarios."""

from __future__ import annotations

from typing import Any

from browser_journey import stream_reveal
from browser_perf_metrics import (
    begin_memory_trace,
    disable_accessibility,
    heap_checkpoint,
    heap_proxy_bytes,
    median,
    memory_dump,
    memory_limitations,
    metric_map,
    percentile,
    startup_transfer,
)
from browser_perf_probes import (
    BOOTSTRAP,
    BURST,
    CYCLE_BATCH,
    DENSE_SWITCHES,
    FORWARD_PROFILE,
    READY_METRICS,
    STOP_TRIAL,
)
from browser_probes import READY_PROBE
from browser_session import ChromeSession

VIEWPORTS = {"mobile": (390, 844), "desktop": (1440, 900)}


def configure(browser: ChromeSession, size: tuple[int, int]) -> None:
    cdp = browser.require_cdp()
    cdp.send(
        "Emulation.setDeviceMetricsOverride",
        {
            "width": size[0],
            "height": size[1],
            "deviceScaleFactor": 1,
            "mobile": size[0] < 600,
        },
        browser.page_session,
    )
    cdp.send("Network.setCacheDisabled", {"cacheDisabled": True}, browser.page_session)
    cdp.send(
        "Page.addScriptToEvaluateOnNewDocument",
        {"source": BOOTSTRAP},
        browser.page_session,
    )


def startup_trials(url: str) -> dict[str, Any]:
    result: dict[str, Any] = {}
    for label, size in VIEWPORTS.items():
        trials: list[dict[str, Any]] = []
        for _ in range(3):
            with ChromeSession(timeout=45) as browser:
                configure(browser, size)
                cdp, cursor = browser.require_cdp(), len(browser.require_cdp().events)
                browser.navigate(url)
                cdp.evaluate(browser.page_session, READY_PROBE, True)
                browser.session_barrier()
                trials.append(
                    cdp.evaluate(browser.page_session, READY_METRICS)
                    | startup_transfer(cdp, cursor)
                    | {"accessibilityDomain": "enabled-through-readiness"}
                )
        result[label] = {
            "trials": trials,
            "medianLcpMs": median([trial["lcpMs"] for trial in trials]),
            "medianWorkerReadyMs": median([trial["workerReadyMs"] for trial in trials]),
            "medianEncodedBytes": median([trial["encodedBytes"] for trial in trials]),
        }
    return result


def ready_browser(url: str, size: tuple[int, int] = (1440, 900)) -> ChromeSession:
    browser = ChromeSession(timeout=60)
    browser.__enter__()
    configure(browser, size)
    browser.navigate(url)
    browser.require_cdp().evaluate(browser.page_session, READY_PROBE, True)
    return browser


def stop_acceptance(url: str) -> dict[str, Any]:
    browser = ready_browser(url)
    try:
        cdp, session = browser.require_cdp(), browser.page_session
        profile = cdp.evaluate(session, FORWARD_PROFILE, True)
        trials = [
            {
                "target": 1,
                "status": "UNREACHABLE",
                "reason": "non-empty input always prepends BOS, so mounted UI minimum context is 2",
            },
            *[
                cdp.evaluate(session, f"({STOP_TRIAL})({target})", True)
                for target in range(2, 24)
            ],
        ]
        measured = [trial for trial in trials if "latencyMs" in trial]
        worst_forward = max(profile["intervals"])
        return {
            "forwardProfile": profile,
            "worstForwardMs": worst_forward,
            "p95Ms": percentile([trial["latencyMs"] for trial in measured], 0.95),
            "limitMs": worst_forward + 100,
            "trials": trials,
        }
    finally:
        browser.__exit__(None, None, None)


def cycle_acceptance(url: str) -> dict[str, Any]:
    browser = ready_browser(url)
    try:
        cdp, session = browser.require_cdp(), browser.page_session
        accessibility = disable_accessibility(cdp, session)
        warmup = []
        first = 1
        stable_chunks = 0
        for last in range(25, 201, 25):
            state = cdp.evaluate(session, f"({CYCLE_BATCH})([{first},{last}])", True)
            browser.session_barrier()
            checkpoint = heap_checkpoint(browser)
            proxy = heap_proxy_bytes(checkpoint)
            if warmup:
                allowance = max(1_048_576, warmup[-1]["proxyBytes"] * 0.05)
                stable_chunks = (
                    stable_chunks + 1
                    if proxy <= warmup[-1]["proxyBytes"] + allowance
                    else 0
                )
            warmup.append(
                {
                    "cycle": last,
                    "state": state,
                    "checkpoint": checkpoint,
                    "proxyBytes": proxy,
                }
            )
            first = last + 1
            if stable_chunks >= 2:
                break
        warmup_cycles = warmup[-1]["cycle"]
        checkpoints: dict[str, Any] = {}
        states: list[dict[str, Any]] = []
        begin_memory_trace(cdp)
        first = warmup_cycles + 1
        for relative in (5, 25, 50, 100, 200):
            last = warmup_cycles + relative
            states.append(
                cdp.evaluate(session, f"({CYCLE_BATCH})([{first},{last}])", True)
            )
            browser.session_barrier()
            checkpoints[str(relative)] = heap_checkpoint(browser)
            if relative <= 50:
                checkpoints[str(relative)]["memoryInfra"] = memory_dump(cdp)
            first = last + 1
        cdp.send("Tracing.end")
        page5 = checkpoints["5"]["heaps"]["page"]
        page200 = checkpoints["200"]["heaps"]["page"]
        return {
            "accessibility": accessibility,
            "warmup": {
                "cycles": warmup_cycles,
                "steadyStateReached": stable_chunks >= 2,
                "points": warmup,
            },
            "states": states,
            "checkpoints": checkpoints,
            "attribution": {
                key: page200.get(key, 0) - page5.get(key, 0)
                for key in ("usedSize", "embedderHeapUsedSize", "backingStorageSize")
            },
            "limitations": memory_limitations(cdp, session),
        }
    finally:
        browser.__exit__(None, None, None)


def burst_dense_reveal(url: str) -> dict[str, Any]:
    browser = ready_browser(url)
    try:
        cdp, session = browser.require_cdp(), browser.page_session
        accessibility = disable_accessibility(cdp, session)
        waiting = heap_checkpoint(browser)
        profile = cdp.evaluate(session, FORWARD_PROFILE, True)
        cdp.evaluate(
            session,
            "new Promise((resolve,reject)=>{const timeout=setTimeout(()=>finish('replay timeout'),30000),observer=new MutationObserver(check);function finish(error){clearTimeout(timeout);observer.disconnect();error?reject(error):resolve();}function check(){const tokens=[...document.querySelectorAll('.generated-token')];if(tokens.at(-1)?.getAttribute('aria-pressed')==='true'&&document.querySelector('#status')?.dataset.status==='complete')finish();}observer.observe(document.documentElement,{subtree:true,childList:true,attributes:true});[...document.querySelectorAll('.generated-token')].at(-1).click();check();})",
            True,
        )
        before_burst = heap_checkpoint(browser)
        burst = cdp.evaluate(session, f"({BURST})()", True)
        after_burst = heap_checkpoint(browser)
        cdp.send("Performance.enable", session_id=session)
        before_metrics = metric_map(cdp, session)
        dense = cdp.evaluate(session, f"({DENSE_SWITCHES})()", True)
        after_metrics = metric_map(cdp, session)
        dense["styleDurationMs"] = (
            after_metrics.get("RecalcStyleDuration", 0)
            - before_metrics.get("RecalcStyleDuration", 0)
        ) * 1000
        dense["layoutDurationMs"] = (
            after_metrics.get("LayoutDuration", 0)
            - before_metrics.get("LayoutDuration", 0)
        ) * 1000
        return {
            "accessibility": accessibility,
            "waiting": waiting,
            "maxProfile": profile,
            "beforeBurst": before_burst,
            "burst": burst,
            "afterBurst": after_burst,
            "dense": dense,
        }
    finally:
        browser.__exit__(None, None, None)


def mobile_reveal(url: str) -> dict[str, Any]:
    browser = ready_browser(url, VIEWPORTS["mobile"])
    try:
        cdp = browser.require_cdp()
        cdp.evaluate(
            browser.page_session,
            "const set=(id,value)=>{const input=document.querySelector(id);input.value=value;input.dispatchEvent(new Event('input',{bubbles:true}))};set('#generation-prompt','a');set('#seed','14');set('#temperature','2');set('#top-k','259');",
        )
        result = stream_reveal(cdp, browser.page_session)
        result.update(
            cdp.evaluate(
                browser.page_session,
                "(() => {const usage=document.querySelector('[data-testid=\"generation-usage\"]');return {contextUsed:Number(usage.dataset.contextUsed),contextLimit:Number(usage.dataset.contextLimit),stopReason:usage.dataset.stopReason};})()",
            )
        )
        return result
    finally:
        browser.__exit__(None, None, None)
