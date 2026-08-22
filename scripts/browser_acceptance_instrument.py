# /// script
# requires-python = ">=3.12"
# dependencies = []
# ///
# ─── How to run ───
# Imported by scripts/browser_acceptance.py.
"""Pre-navigation Worker instrumentation and event-driven browser helpers."""

from __future__ import annotations

import base64
from pathlib import Path
from typing import Any

from browser_cdp import Cdp, CdpError

INSTRUMENT_WORKER = r"""(() => {
  const NativeWorker = globalThis.Worker;
  const state = {records: [], workers: [], workerUrls: [], workerOptions: []};
  const safe = value => {
    try { return JSON.parse(JSON.stringify(value)); }
    catch (error) { return {capture_error: String(error)}; }
  };
  const record = (direction, worker, payload) => {
    const entry = {sequence: state.records.length, direction, worker,
      timestamp: performance.now(), payload: safe(payload)};
    state.records.push(entry);
    dispatchEvent(new CustomEvent('acceptance-worker', {detail: entry}));
  };
  class AcceptanceWorker extends NativeWorker {
    constructor(url, options) {
      super(url, options);
      const worker = state.workers.length;
      state.workers.push(this);
      state.workerUrls.push(String(url));
      state.workerOptions.push(options === undefined ? null : safe(options));
      this.addEventListener('message', event => record('in', worker, event.data));
    }
    postMessage(message, transfer) {
      const worker = state.workers.indexOf(this);
      record('out', worker, message);
      if (transfer === undefined) super.postMessage(message);
      else super.postMessage(message, transfer);
    }
  }
  Object.defineProperty(globalThis, 'Worker', {value: AcceptanceWorker, configurable: false});
  Object.defineProperty(globalThis, '__acceptance', {value: state, configurable: false});
})()"""

WAIT_READY = r"""new Promise((resolve, reject) => {
  const done = entry => {
    if (entry.detail.payload?.type !== 'ready') return;
    clearTimeout(timeout); removeEventListener('acceptance-worker', done);
    requestAnimationFrame(() => requestAnimationFrame(() => resolve(entry.detail)));
  };
  const timeout = setTimeout(() => {removeEventListener('acceptance-worker', done); reject('Worker Ready timeout');}, 30000);
  addEventListener('acceptance-worker', done);
  const ready = window.__acceptance.records.find(entry => entry.direction === 'in' && entry.payload?.type === 'ready');
  if (ready) done({detail: ready});
})"""


def install(cdp: Cdp, session: str) -> None:
    """Install instrumentation before any application script executes."""
    cdp.send(
        "Page.addScriptToEvaluateOnNewDocument", {"source": INSTRUMENT_WORKER}, session
    )


def evaluate_dict(cdp: Cdp, session: str, expression: str) -> dict[str, Any]:
    """Evaluate one browser expression and require an object result."""
    result = cdp.evaluate(session, expression, True)
    if not isinstance(result, dict):
        raise CdpError(f"acceptance probe returned non-object: {result!r}")
    return result


def screenshot(cdp: Cdp, session: str, path: Path) -> None:
    """Capture the current real-Chrome viewport as PNG."""
    result = cdp.send("Page.captureScreenshot", {"format": "png"}, session)
    data = result.get("data")
    if not isinstance(data, str):
        raise CdpError("Chrome screenshot did not return base64 data")
    path.write_bytes(base64.b64decode(data, validate=True))


def error_terminal_probe(cdp: Cdp, page_session: str) -> list[dict[str, Any]]:
    """Force the compiled Worker fail-initial path through non-finite timing."""
    worker_sessions = [
        event["params"]["sessionId"]
        for event in cdp.events
        if event.get("method") == "Target.attachedToTarget"
        and event.get("params", {}).get("targetInfo", {}).get("type") == "worker"
    ]
    worker_session = worker_sessions[-1]
    cdp.evaluate(
        worker_session,
        "Object.defineProperty(performance,'now',{value:()=>NaN,configurable:true})",
    )
    try:
        result = cdp.evaluate(
            page_session,
            """new Promise((ok,bad)=>{const worker=__acceptance.workers[0],events=[];
            const listener=event=>{const value=event.data;if(value.request_id!==2030)return;events.push(value);
            if(value.type==='generation_finished'){worker.removeEventListener('message',listener);clearTimeout(timeout);ok(events)}};
            const timeout=setTimeout(()=>bad('Error terminal timeout'),60000);worker.addEventListener('message',listener);
            worker.postMessage({type:'generate',request_id:2030,text:'cat',config:{max_new_tokens:2,temperature:1,top_k:20,mode:'sample',seed:30}})})""",
            True,
        )
    finally:
        cdp.evaluate(worker_session, "delete performance.now")
    return result
