#!/usr/bin/env python3
"""Real-Chrome Phase 9 responsive, keyboard, network, and lifecycle verifier."""

from __future__ import annotations

import argparse
import base64
import json
from pathlib import Path
from typing import Any

from browser_cdp import Cdp
from browser_contract import CAPTURES, VIEWPORTS, failures_for
from browser_contrast import contrast_contract
from browser_journey import dense_replay, replay_detail_navigation, stream_reveal
from browser_keyboard import keyboard_contract, mobile_contract
from browser_probes import READY_PROBE, RESET_SCROLL_PROBE, STATE_PROBE
from browser_session import ChromeSession
from browser_telemetry import BrowserTelemetry
from browser_zoom import actual_zoom_contract

WORKER_INSTRUMENTATION = r"""
window.__phase9WorkerPosts = 0;
const originalPostMessage = Worker.prototype.postMessage;
Worker.prototype.postMessage = function (...args) {
  window.__phase9WorkerPosts += 1;
  return originalPostMessage.apply(this, args);
};
"""
SENTINEL_READY = r"""new Promise((resolve, reject) => {
  const timeout = setTimeout(() => finish('sentinel ready timeout'), 10000);
  const observer = new MutationObserver(check);
  function finish(error) {
    clearTimeout(timeout);
    observer.disconnect();
    error ? reject(error) : requestAnimationFrame(() => requestAnimationFrame(resolve));
  }
  function check() {
    if (document.querySelector('#status')?.dataset.status === 'ready') finish();
  }
  observer.observe(document.documentElement, {subtree: true, childList: true, attributes: true});
  check();
})"""
WAITING_CAPTURES = {
    (1280, 800): "waiting-1280x800.png",
    (1440, 900): "waiting-1440x900.png",
}
DENSE_CAPTURES = {
    (1280, 800): "dense-replay-1280x800.png",
    (1440, 900): "dense-replay-1440x900.png",
}


def capture(cdp: Cdp, session: str, path: Path) -> None:
    image = cdp.send(
        "Page.captureScreenshot",
        {"format": "png", "captureBeyondViewport": False},
        session,
    )["data"]
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(base64.b64decode(image))


def dense_contract(cdp: Cdp, session: str) -> tuple[dict[str, Any], list[str]]:
    geometry = dense_replay(cdp, session)
    failures: list[str] = []
    if geometry["visualOverflow"] != "visible":
        failures.append(f"dense stage visual clips overflow: {geometry}")
    if geometry["scrollHeight"] <= geometry["clientHeight"]:
        failures.append(
            f"dense stage does not contribute intrinsic scroll height: {geometry}"
        )
    if geometry["visualBottom"] > geometry["stageScrollHeight"] + 1:
        failures.append(f"dense visual extends beyond canvas scroll range: {geometry}")
    if not geometry["matrix"]:
        failures.append("dense replay did not render an attention matrix")
    if geometry["defaultPrompt"] != "the cat":
        failures.append(f"default prompt is not literal C001: {geometry}")
    if geometry["generatedCount"] < 2 or not geometry["decoded"]:
        failures.append(f"default generation was not a meaningful continuation: {geometry}")
    details = replay_detail_navigation(cdp, session)
    geometry["detailNavigation"] = details
    failures.extend(contrast_contract(cdp, session))
    if (details["count"] != 18 or details["distinct"] != 18
            or details["distinctRenderers"] != 7 or "missing" in details["renderers"]
            or details["failures"]):
        failures.append(f"Inspector details/generation renderers were not exhaustive: {details}")
    return geometry, failures


def reduced_motion_contract(cdp: Cdp, session: str) -> list[str]:
    cdp.send(
        "Emulation.setEmulatedMedia",
        {"features": [{"name": "prefers-reduced-motion", "value": "reduce"}]},
        session,
    )
    reduced = cdp.evaluate(
        session,
        "({transition:getComputedStyle(document.querySelector('button')).transitionDuration,"
        "animation:getComputedStyle(document.querySelector('button')).animationDuration})",
    )
    cdp.send("Emulation.setEmulatedMedia", {"features": []}, session)
    durations = [float(value.removesuffix("s")) for value in reduced.values()]
    return (
        [f"reduced motion failed: {reduced}"]
        if any(value > 0.000001 for value in durations)
        else []
    )


def run_sentinel(browser: ChromeSession, url: str) -> int:
    cdp = browser.require_cdp()
    browser.navigate(url)
    cdp.evaluate(browser.page_session, SENTINEL_READY, True)
    browser.session_barrier()
    telemetry = BrowserTelemetry()
    telemetry.consume(cdp.events)
    print("\n".join(telemetry.errors))
    if telemetry.errors:
        print("Worker sentinel verifier result: FAIL (expected negative-test outcome)")
        return 1
    print("Worker sentinel verifier result: unexpected PASS")
    return 0


def verify(args: argparse.Namespace) -> int:
    failures: list[str] = []
    telemetry = BrowserTelemetry()
    observed_workers: set[str] = set()
    with ChromeSession() as browser:
        if args.worker_sentinel:
            return run_sentinel(browser, args.url)
        cdp = browser.require_cdp()
        session = browser.page_session
        cdp.send(
            "Page.addScriptToEvaluateOnNewDocument",
            {"source": WORKER_INSTRUMENTATION},
            session,
        )
        for size in VIEWPORTS:
            width, height = size
            cdp.send(
                "Emulation.setDeviceMetricsOverride",
                {
                    "width": width,
                    "height": height,
                    "deviceScaleFactor": 1,
                    "mobile": False,
                },
                session,
            )
            browser.navigate(args.url)
            cdp.evaluate(session, READY_PROBE, True)
            cdp.evaluate(session, RESET_SCROLL_PROBE, True)
            browser.session_barrier()
            workers = set(browser.app_worker_sessions())
            observed_workers.update(workers)
            state = cdp.evaluate(session, STATE_PROBE)
            size_failures = failures_for(size, state)
            if not workers:
                size_failures.append("expected dedicated app Worker was not attached")
            size_failures.extend(keyboard_contract(cdp, session, state, width))
            size_failures.extend(contrast_contract(cdp, session))
            cdp.evaluate(session, RESET_SCROLL_PROBE, True)
            if width < 768:
                size_failures.extend(mobile_contract(cdp, session, width, height))
                size_failures.extend(reduced_motion_contract(cdp, session))
            if size == (390, 844):
                stream = stream_reveal(cdp, session)
                if stream["requested"] != 24 or stream["count"] < 2:
                    size_failures.append(f"390px stream did not exercise the 24-token request: {stream}")
                if stream["violations"]:
                    size_failures.append(f"stream reveal escaped local reels: {stream}")
                if stream["scrollX"] != stream["initial"]["scrollX"] or stream["docW"] != stream["initial"]["docW"]:
                    size_failures.append(f"stream changed document horizontal geometry: {stream}")
                if stream["focus"] != stream["initial"]["focus"]:
                    size_failures.append(f"stream stole focus: {stream}")
                print(f"390x844 stream reveal: {json.dumps(stream, sort_keys=True)}")
            if args.evidence and size in WAITING_CAPTURES:
                capture(cdp, session, args.evidence / WAITING_CAPTURES[size])
            if args.evidence and size in CAPTURES:
                capture(cdp, session, args.evidence / CAPTURES[size])
            if size in DENSE_CAPTURES:
                geometry, dense_failures = dense_contract(cdp, session)
                size_failures.extend(dense_failures)
                print(
                    f"{width}x{height} dense replay: {json.dumps(geometry, sort_keys=True)}"
                )
                browser.session_barrier()
                if args.evidence:
                    capture(cdp, session, args.evidence / DENSE_CAPTURES[size])
            browser.session_barrier()
            telemetry.consume(cdp.events)
            result = "PASS" if not size_failures else "FAIL"
            print(f"{width}x{height}: {result} {json.dumps(state, sort_keys=True)}")
            failures.extend(f"{width}x{height}: {failure}" for failure in size_failures)
        for physical in ((1440, 900), (390, 844)):
            zoom, zoom_failures = actual_zoom_contract(browser, args.url, physical)
            print(f"actual zoom {physical[0]}x{physical[1]}: {json.dumps(zoom, sort_keys=True)}")
            failures.extend(f"actual zoom {physical[0]}x{physical[1]}: {failure}" for failure in zoom_failures)
            browser.session_barrier()
            telemetry.consume(cdp.events)
        browser.session_barrier()
        telemetry.consume(cdp.events)
    worker_urls = telemetry.worker_urls(observed_workers)
    all_urls = [record.url for record in telemetry.requests]
    required_worker_assets = (
        "manifest.json",
        "config.json",
        "tokenizer.json",
        "model.safetensors",
    )
    for asset in required_worker_assets:
        if not any(url.endswith(asset) for url in worker_urls):
            failures.append(f"dedicated Worker telemetry missing {asset}")
    for asset in ("worker.js", "worker_bg.wasm"):
        if not any(url.endswith(asset) for url in all_urls):
            failures.append(f"browser telemetry missing {asset}")
    outside = telemetry.outside_scope(args.url)
    failures.extend(telemetry.errors)
    failures.extend(f"out-of-scope request: {url}" for url in outside)
    print(
        f"Dedicated Worker requests ({len(worker_urls)}): {json.dumps(worker_urls, sort_keys=True)}"
    )
    print(
        f"Browser errors: {len(telemetry.errors)}; requests: {len(telemetry.scoped_urls())}; "
        f"out of scope: {len(outside)}"
    )
    if failures:
        print("FAILURES")
        print("\n".join(f"- {failure}" for failure in failures))
        return 1
    print("Phase 9 Chrome responsive contract: PASS")
    return 0


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--url", default="http://127.0.0.1:8097/")
    parser.add_argument("--evidence", type=Path)
    parser.add_argument("--worker-sentinel", action="store_true")
    return verify(parser.parse_args())


if __name__ == "__main__":
    raise SystemExit(main())
