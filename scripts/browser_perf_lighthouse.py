"""Cold-cache Lighthouse startup trials and matched Worker-ready probes."""

from __future__ import annotations

import json
import os
import statistics
import subprocess
from pathlib import Path
from typing import Any

from browser_perf_acceptance import configure
from browser_perf_metrics import startup_transfer
from browser_perf_probes import READY_METRICS
from browser_session import CHROME, ChromeSession

_THROTTLED_READY = r"""new Promise((resolve,reject)=>{
  const timeout=setTimeout(()=>finish('throttled ready timeout'),90000);let observer;
  function finish(error){clearTimeout(timeout);observer?.disconnect();
    removeEventListener('DOMContentLoaded',attach);error?reject(error):resolve();}
  function check(){const status=document.querySelector('#status');
    if(status?.dataset.status==='error')finish(status.textContent);
    else if(status?.dataset.status==='ready'&&document.readyState==='complete')finish();}
  function attach(){if(!document.documentElement)return;observer=new MutationObserver(check);
    observer.observe(document.documentElement,{subtree:true,childList:true,attributes:true});check();}
  addEventListener('DOMContentLoaded',attach,{once:true});attach();
})"""

_PROFILES = {
    "mobile": {
        "size": (390, 844),
        "latency": 150,
        "download": 1_638_400 / 8,
        "upload": 750_000 / 8,
        "cpu": 4,
    },
    "desktop": {
        "size": (1440, 900),
        "latency": 40,
        "download": 10_240_000 / 8,
        "upload": 10_240_000 / 8,
        "cpu": 1,
    },
}


def _worker_trial(url: str, profile: dict[str, Any]) -> dict[str, Any]:
    with ChromeSession(timeout=90) as browser:
        configure(browser, profile["size"])
        cdp, session = browser.require_cdp(), browser.page_session
        cdp.send(
            "Network.emulateNetworkConditions",
            {
                "offline": False,
                "latency": profile["latency"],
                "downloadThroughput": profile["download"],
                "uploadThroughput": profile["upload"],
            },
            session,
        )
        cdp.send("Emulation.setCPUThrottlingRate", {"rate": profile["cpu"]}, session)
        cursor = len(cdp.events)
        browser.navigate(url)
        cdp.evaluate(session, _THROTTLED_READY, True)
        browser.session_barrier()
        return cdp.evaluate(session, READY_METRICS) | startup_transfer(cdp, cursor)


def lighthouse_trials(url: str, evidence: Path) -> dict[str, Any]:
    """Run three fresh-profile DevTools-throttled Lighthouse trials per form factor."""
    version = subprocess.check_output(["lighthouse", "--version"], text=True).strip()
    result: dict[str, Any] = {
        "lighthouseVersion": version,
        "chromePath": str(CHROME),
        "method": "Lighthouse 13.4.1, cold profile per invocation, devtools throttling",
    }
    for label, profile in _PROFILES.items():
        trials = []
        for index in range(1, 4):
            output = evidence / f"lighthouse-{label}-{index}.json"
            command = [
                "lighthouse",
                url,
                "--quiet",
                "--output=json",
                f"--output-path={output}",
                "--only-categories=performance",
                "--throttling-method=devtools",
                "--chrome-flags=--headless=new --no-first-run --no-default-browser-check",
            ]
            if label == "desktop":
                command.append("--preset=desktop")
            subprocess.run(
                command, check=True, env={**os.environ, "CHROME_PATH": str(CHROME)}
            )
            raw = json.loads(output.read_text())
            requests = raw["audits"]["network-requests"]["details"]["items"]
            trials.append(
                {
                    "rawJson": output.name,
                    "lcpMs": raw["audits"]["largest-contentful-paint"]["numericValue"],
                    "transferBytes": sum(
                        item.get("transferSize", 0) for item in requests
                    ),
                    "workerReadyCompanion": _worker_trial(url, profile),
                }
            )
        result[label] = {
            "trials": trials,
            "medianLcpMs": float(statistics.median(x["lcpMs"] for x in trials)),
            "medianTransferBytes": float(
                statistics.median(x["transferBytes"] for x in trials)
            ),
            "medianWorkerReadyMs": float(
                statistics.median(
                    x["workerReadyCompanion"]["workerReadyMs"] for x in trials
                )
            ),
        }
    return result
