#!/usr/bin/env python3
# /// script
# requires-python = ">=3.13"
# dependencies = []
# ///
# ─── How to run ───
# 1. Install uv: curl -LsSf https://astral.sh/uv/install.sh | sh
# 2. Run: uv run scripts/browser_performance.py
# 3. Or: chmod +x scripts/browser_performance.py && ./scripts/browser_performance.py
# ──────────────────
"""Build and run the deterministic real-Chrome performance acceptance suite."""

from __future__ import annotations

import argparse
import json
import shutil
import subprocess
import tempfile
from pathlib import Path
from typing import Any

from browser_perf_controls import ax_causal_controls, listener_controls
from browser_perf_lighthouse import lighthouse_trials
from browser_perf_metrics import acceptance_verdicts, heap_proxy_bytes
from browser_perf_acceptance import (
    burst_dense_reveal,
    cycle_acceptance,
    mobile_reveal,
    startup_trials,
    stop_acceptance,
)
from browser_perf_provenance import (
    ProvenanceError,
    artifact_provenance,
    enforce_post_commit,
    require_same_source,
    source_provenance,
)
from browser_perf_receipt import (
    cleanup_receipt,
    publish_evidence,
    seal_evidence,
    validate_harness,
)
from browser_perf_server import CompressedStaticServer

ROOT = Path(__file__).resolve().parent.parent
EVIDENCE = ROOT / ".omo/evidence/generation/fixes/performance"


def build_deployments(temporary: Path, evidence: Path) -> dict[str, Path]:
    """Build isolated root and deployment-prefix artifacts with raw logs."""
    builds: dict[str, Path] = {}
    for name, prefix in (("root", "/"), ("subpath", "/transformer_viz/")):
        dist = temporary / name
        completed = subprocess.run(
            [str(ROOT / "scripts/build-web.sh"), prefix, str(dist)],
            cwd=ROOT,
            text=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            check=False,
        )
        (evidence / f"build-{name}.log").write_text(completed.stdout)
        if completed.returncode != 0:
            raise subprocess.CalledProcessError(completed.returncode, completed.args)
        builds[name] = dist
    return builds


def collect(
    builds: dict[str, Path], provenance: dict[str, Any], evidence: Path
) -> dict[str, Any]:
    """Run root acceptance plus deployment-prefix cold-load coverage."""
    with CompressedStaticServer(builds["root"], "") as server:
        data: dict[str, Any] = {
            "tree": subprocess.check_output(
                ["git", "rev-parse", "HEAD"], cwd=ROOT, text=True
            ).strip(),
            "rootUrl": server.url,
            "provenance": provenance,
            "lighthouseStartup": lighthouse_trials(server.url, evidence),
            "supplementalUnthrottledStartup": startup_trials(server.url),
            "stop": stop_acceptance(server.url),
            "cycles": cycle_acceptance(server.url),
            "listenerControls": listener_controls(server.url),
            "axCausalControls": ax_causal_controls(server.url),
            "burstDense": burst_dense_reveal(server.url),
            "mobileReveal": mobile_reveal(server.url),
        }
    with CompressedStaticServer(builds["subpath"], "/transformer_viz") as server:
        data["subpathUrl"] = server.url
        data["subpathStartup"] = startup_trials(server.url)
    data["verdicts"] = acceptance_verdicts(data)
    return data


def write_report(data: dict[str, Any], evidence: Path) -> None:
    """Persist raw evidence and a threshold-oriented human summary."""
    (evidence / "raw-results.json").write_text(
        json.dumps(data, indent=2, sort_keys=True) + "\n"
    )
    (evidence / "provenance.json").write_text(
        json.dumps(data["provenance"], indent=2, sort_keys=True) + "\n"
    )
    (evidence / "ax-causal-controls.json").write_text(
        json.dumps(data["axCausalControls"], indent=2, sort_keys=True) + "\n"
    )
    lines = [
        "# Performance acceptance",
        "",
        f"Tree: `{data['tree']}`",
        f"Provenance: **{data['provenance']['source']['mode']}**, frozen={data['provenance']['source']['frozen']}; "
        f"status `{data['provenance']['source']['statusSha256']}`; tracked diff `{data['provenance']['source']['trackedDiffSha256']}`; "
        f"source `{data['provenance']['source']['fullSource']['sha256']}`.",
        f"Artifacts: root `{data['provenance']['artifacts']['root']['sha256']}`; "
        f"subpath `{data['provenance']['artifacts']['subpath']['sha256']}`.",
        "",
        *[
            f"- **{value['status']} {name}** — {value['threshold']}"
            + (f" (proxy {value['proxyStatus']})" if "proxyStatus" in value else "")
            for name, value in data["verdicts"].items()
        ],
        "",
        "Lighthouse cold-cache medians (acceptance):",
        *[
            f"- {viewport}: LCP {values['medianLcpMs']:.1f}ms; "
            f"transfer {values['medianTransferBytes']:.0f} bytes; "
            f"matched-throttle Worker Ready {values['medianWorkerReadyMs']:.1f}ms"
            for viewport, values in data["lighthouseStartup"].items()
            if viewport in ("mobile", "desktop")
        ],
        "Supplemental unthrottled PerformanceObserver startup: "
        f"mobile LCP {data['supplementalUnthrottledStartup']['mobile']['medianLcpMs']:.1f}ms; "
        f"desktop LCP {data['supplementalUnthrottledStartup']['desktop']['medianLcpMs']:.1f}ms.",
        "",
        f"Stop: p95 {data['stop']['p95Ms']:.1f}ms; limit {data['stop']['limitMs']:.1f}ms; "
        f"context 1 unreachable; context 23 terminal {data['stop']['trials'][-1]['stopReason']}.",
        f"Replay burst: {data['burstDense']['burst']['requests']} requests; "
        f"newest result {data['burstDense']['burst']['newestLatencyMs']:.1f}ms.",
        f"Accessibility boundary: readiness trials {data['supplementalUnthrottledStartup']['mobile']['trials'][0]['accessibilityDomain']}; "
        f"memory phase {data['cycles']['accessibility']}.",
        f"Warm-up: {data['cycles']['warmup']['cycles']} cycles; steady state reached: "
        f"{data['cycles']['warmup']['steadyStateReached']}.",
        f"Cycle retained-memory proxy: post-warm-up cycle 5 {heap_proxy_bytes(data['cycles']['checkpoints']['5']):.0f} bytes; "
        f"cycle 50 {heap_proxy_bytes(data['cycles']['checkpoints']['50']):.0f} bytes; "
        f"cycle 200 {heap_proxy_bytes(data['cycles']['checkpoints']['200']):.0f} bytes; allowed 5→50 growth "
        f"{max(1048576, heap_proxy_bytes(data['cycles']['checkpoints']['5']) * 0.05):.0f} bytes.",
        f"Page attribution delta 5→200: {data['cycles']['attribution']}.",
        f"No-tracing memory control 5→50: {heap_proxy_bytes(data['listenerControls']['cyclesSingleProfilerEnableNoTracing'][0]):.0f}→"
        f"{heap_proxy_bytes(data['listenerControls']['cyclesSingleProfilerEnableNoTracing'][-1]):.0f} bytes.",
        "Listener controls: idle profiling "
        + "/".join(
            str(point["dom"]["jsEventListeners"])
            for point in data["listenerControls"]["idleRepeatedFull"]
        )
        + "; cycles with one profiler enable and no tracing "
        + "/".join(
            str(point["dom"]["jsEventListeners"])
            for point in data["listenerControls"]["cyclesSingleProfilerEnableNoTracing"]
        ),
        "",
        "Harness cleanup: every Runtime.evaluate returns by value (no remote object groups); all MutationObserver/PerformanceObserver instances disconnect at terminal state.",
        "",
        "Memory protocol limitations:",
        *[f"- {item}" for item in data["cycles"]["limitations"]],
    ]
    (evidence / "report.md").write_text("\n".join(lines) + "\n")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--post-commit-head")
    parser.add_argument("--post-commit-tree")
    args = parser.parse_args()
    EVIDENCE.parent.mkdir(parents=True, exist_ok=True)
    staging = Path(
        tempfile.mkdtemp(prefix=".performance-staging-", dir=EVIDENCE.parent)
    )
    try:
        source = source_provenance(ROOT)
        enforce_post_commit(source, args.post_commit_head, args.post_commit_tree)
        with tempfile.TemporaryDirectory(
            prefix="transformer-viz-performance-"
        ) as temporary:
            builds = build_deployments(Path(temporary), staging)
            provenance = {"source": source, "artifacts": artifact_provenance(builds)}
            data = collect(builds, provenance, staging)
        failures = [
            result
            for result in data["verdicts"].values()
            if result["status"] == "FAIL" or result.get("proxyStatus") == "FAIL"
        ]
        if failures:
            raise ProvenanceError(f"performance acceptance failed: {failures}")
        require_same_source(source, source_provenance(ROOT))
        write_report(data, staging)
        validate_harness(ROOT, staging)
        cleanup_receipt(ROOT, source, staging)
        (staging / "run.log").write_text(
            "$ uv run scripts/browser_performance.py\nexit=0\nfinal=PASS\n"
        )
        manifest_count = seal_evidence(staging)
        staged_verification = subprocess.run(
            ["shasum", "-a", "256", "-c", "SHA256SUMS"],
            cwd=staging,
            text=True,
            stdout=subprocess.PIPE,
            check=True,
        ).stdout
        expected = (staging / "checksum-verification.txt").read_text()
        if staged_verification != expected:
            raise ProvenanceError("staged checksum verification differs from receipt")
        publish_evidence(staging, EVIDENCE)
        verification = subprocess.run(
            ["shasum", "-a", "256", "-c", "SHA256SUMS"],
            cwd=EVIDENCE,
            text=True,
            stdout=subprocess.PIPE,
            check=True,
        ).stdout
        if verification != expected:
            raise ProvenanceError("checksum verification output differs from receipt")
        print(json.dumps(data["verdicts"], indent=2))
        print(f"manifestCount={manifest_count}")
        return 0
    finally:
        if staging.exists():
            shutil.rmtree(staging)


if __name__ == "__main__":
    raise SystemExit(main())
