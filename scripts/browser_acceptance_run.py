# /// script
# requires-python = ">=3.12"
# dependencies = []
# ///
# ─── How to run ───
# Imported by scripts/browser_acceptance.py.
"""Execute exact C001/C002 qualification inside owned staging."""

from __future__ import annotations

import shutil
import tempfile
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from browser_acceptance_artifacts import (
    cleanup_receipt,
    command,
    deployed_hashes,
    provenance,
    write_artifacts,
)
from browser_acceptance_c001 import run as run_c001
from browser_acceptance_c002 import reason
from browser_acceptance_c002 import run as run_c002
from browser_acceptance_edge_probes import KOREAN_UI
from browser_acceptance_instrument import WAIT_READY, install, screenshot
from browser_acceptance_qualifiers import (
    asset_failures,
    final_stream_failures,
    korean_ui_failures,
    no_kv_failures,
    rapid_replay_failures,
)
from browser_acceptance_report import payloads as build_payloads
from browser_acceptance_runtime import (
    asset_receipts,
    no_kv_scan,
    responsive,
    shipping_sampling_receipt,
)
from browser_cdp import CdpError
from browser_perf_metrics import heap_checkpoint
from browser_perf_server import CompressedStaticServer
from browser_session import ChromeSession
from browser_telemetry import BrowserTelemetry

REQUIRED_REASONS = {
    "max_new_tokens",
    "end_of_sequence",
    "context_limit",
    "user_stopped",
    "replaced",
    "error",
}


@dataclass(frozen=True, slots=True)
class AcceptanceResult:
    """Final harness status returned to the publication boundary."""

    status: str
    failures: list[str]


def run(root: Path, output: Path, expected_head: str | None) -> AcceptanceResult:
    """Own build, browser, assertions, provenance, artifacts, and cleanup."""
    source, failures = provenance(root, expected_head)
    payloads: dict[str, Any] = {}
    events = []
    screenshot_data: bytes | None = None
    port = 0
    profile = Path("missing")
    temporary_path = Path("missing")
    with tempfile.TemporaryDirectory(prefix="transformer-viz-acceptance-") as temporary:
        temporary_path = Path(temporary)
        dist = temporary_path / "dist"
        build = command(["./scripts/build-web.sh", "/", str(dist)], root)
        if build["returncode"] != 0:
            failures.append("release build failed")
        deployed = deployed_hashes(dist) if dist.exists() else {}
        no_cache = no_kv_scan(root)
        sampling_receipt = shipping_sampling_receipt(root)
        selftest = command(["python3", "scripts/browser_acceptance_selftest.py"], root)
        publication_selftest = command(
            ["python3", "scripts/browser_acceptance_publication_selftest.py"], root
        )
        if not sampling_receipt["passed"]:
            failures.append("shipping sampling tie/replay receipt failed")
        if selftest["returncode"] != 0 or "PASS" not in selftest["stdout"]:
            failures.append("mutation selftest failed")
        if (
            publication_selftest["returncode"] != 0
            or "PASS" not in publication_selftest["stdout"]
        ):
            failures.append("publication mutation selftest failed")
        if build["returncode"] == 0:
            try:
                with (
                    CompressedStaticServer(dist, "") as server,
                    ChromeSession(timeout=90) as browser,
                ):
                    port = server.httpd.server_port
                    profile = browser.profile
                    cdp = browser.require_cdp()
                    install(cdp, browser.page_session)
                    browser.navigate(server.url)
                    cdp.evaluate(browser.page_session, WAIT_READY, True)
                    telemetry = BrowserTelemetry()
                    before_memory = heap_checkpoint(browser)
                    c001, _, c001_failures = run_c001(cdp, browser.page_session)
                    failures.extend(f"C001: {item}" for item in c001_failures)
                    browser.session_barrier()
                    c001["rapidReplay"]["afterBarrierSelected"] = cdp.evaluate(
                        browser.page_session,
                        "Number(document.querySelector('.generated-token[aria-pressed=\"true\"]').dataset.stepIndex)",
                    )
                    failures.extend(
                        f"C001: {item}"
                        for item in rapid_replay_failures(c001["rapidReplay"])
                    )
                    c002, c002_failures = run_c002(cdp, browser.page_session)
                    failures.extend(f"C002: {item}" for item in c002_failures)
                    korean_ui = cdp.evaluate(browser.page_session, KOREAN_UI, True)
                    failures.extend(
                        f"C002 UI: {item}" for item in korean_ui_failures(korean_ui)
                    )
                    after_memory = heap_checkpoint(browser)
                    geometry, geometry_failures = responsive(cdp, browser.page_session)
                    failures.extend(f"responsive: {item}" for item in geometry_failures)
                    cdp.send(
                        "Emulation.setDeviceMetricsOverride",
                        {
                            "width": 1440,
                            "height": 900,
                            "deviceScaleFactor": 1,
                            "mobile": False,
                        },
                        browser.page_session,
                    )
                    screenshot_path = temporary_path / "c001-1440x900.png"
                    screenshot(cdp, browser.page_session, screenshot_path)
                    screenshot_data = screenshot_path.read_bytes()
                    browser.session_barrier()
                    events = cdp.evaluate(
                        browser.page_session, "window.__acceptance.records"
                    )
                    browser.session_barrier()
                    telemetry.consume(cdp.events)
                    c001_start = next(
                        event["payload"]
                        for event in events
                        if event.get("direction") == "in"
                        and event.get("payload", {}).get("type") == "generation_started"
                    )
                    failures.extend(
                        f"C001 final: {item}"
                        for item in final_stream_failures(
                            events, c001_start["request_id"], c001_start["run_id"]
                        )
                    )
                    assets = asset_receipts(cdp, browser)
                    failures.extend(
                        f"assets: {item}" for item in asset_failures(assets, server.url)
                    )
                    outside = telemetry.outside_scope(server.url)
                    failures.extend(
                        f"late browser telemetry: {item}" for item in telemetry.errors
                    )
                    if outside:
                        failures.append(f"outside-scope network requests: {outside}")
                    worker_urls = cdp.evaluate(
                        browser.page_session, "window.__acceptance.workerUrls"
                    )
                    path = c001["contextPath"]
                    prefix_ok = (
                        len(path["append"]["after"])
                        == len(path["append"]["before"]) + 1
                        and path["append"]["after"]
                        == path["repeat"]["after"]
                        == path["repeat"]["next"]
                    )
                    kv_failures = no_kv_failures(
                        no_cache,
                        True,
                        prefix_ok,
                        after_memory["heaps"].get("worker-1", {}).get("usedSize", 0)
                        <= before_memory["heaps"].get("worker-1", {}).get("usedSize", 0)
                        + 8 * 1024 * 1024,
                    )
                    failures.extend(f"no-KV: {item}" for item in kv_failures)
                    reasons = {
                        "max_new_tokens": reason(c002["sameA"]),
                        "end_of_sequence": reason(c002["eos"]),
                        "context_limit": reason(c002["context"]),
                        "user_stopped": reason(c002["stopped"]["events"]),
                        "replaced": next(
                            (
                                e["reason"]
                                for e in c002["replacement"]
                                if e.get("reason") == "replaced"
                            ),
                            None,
                        ),
                        "error": reason(c002["errorTerminal"]),
                    }
                    if (
                        set(reasons) != REQUIRED_REASONS
                        or set(reasons.values()) != REQUIRED_REASONS
                    ):
                        failures.append(f"terminal enum completeness failed: {reasons}")
                    payloads = build_payloads(
                        c001,
                        c002,
                        {
                            "telemetry": {
                                "errors": telemetry.errors,
                                "outsideScope": outside,
                                "responsive": geometry,
                            },
                            "events": events,
                            "build": build,
                            "sampling": sampling_receipt,
                            "selftest": selftest,
                            "publicationSelftest": publication_selftest,
                            "reasons": reasons,
                            "koreanUi": korean_ui,
                            "deployed": deployed,
                            "workerUrls": worker_urls,
                            "noCache": no_cache,
                            "assets": assets,
                            "memory": {"before": before_memory, "after": after_memory},
                            "kvFailures": kv_failures,
                        },
                    )
            except (CdpError, OSError) as error:
                failures.append(f"harness error: {error}")
    shutil.rmtree(root / "apps/web/dist", ignore_errors=True)
    cleanup = cleanup_receipt(port, temporary_path, profile)
    if not all(
        value for key, value in cleanup.items() if key.endswith(("Closed", "Absent"))
    ):
        failures.append(f"cleanup failed: {cleanup}")
    current_source, current_failures = provenance(root, expected_head)
    failures.extend(f"final provenance: {item}" for item in current_failures)
    if current_source != source:
        failures.append("source provenance changed during acceptance run")
    if screenshot_data is None and not failures:
        failures.append("successful run produced no C001 screenshot")
    status = "PASS" if not failures else "FAIL"
    for value in payloads.values():
        if isinstance(value, dict):
            value["status"] = status
            value["failures"] = failures
    payloads["cleanup.json"] = {"status": status, "failures": failures, **cleanup}
    if screenshot_data is not None:
        (output / "c001-1440x900.png").write_bytes(screenshot_data)
    write_artifacts(output, source, payloads)
    return AcceptanceResult(status=status, failures=failures)
