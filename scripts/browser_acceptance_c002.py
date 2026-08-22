# /// script
# requires-python = ">=3.12"
# dependencies = []
# ///
# ─── How to run ───
# Imported by scripts/browser_acceptance.py.
"""C002 real compiled-Worker protocol, math, lifecycle, and edge probes."""

from __future__ import annotations

from typing import Any

from browser_acceptance_checks import (
    compact_summary_failures,
    parity_failures,
    sampling_step_failures,
)
from browser_acceptance_instrument import error_terminal_probe, evaluate_dict
from browser_acceptance_qualifiers import global_top_k_failures
from browser_cdp import Cdp

DIRECT_PROBE = r"""new Promise((resolve,reject)=>{const worker=__acceptance.workers[0],protocolStart=__acceptance.records.length;
  const config=(seed,mode='sample',max=4)=>({max_new_tokens:max,temperature:mode==='sample'?2:1,top_k:mode==='sample'?20:259,mode,seed});
  const stream=(requestId,text,cfg)=>new Promise((ok,bad)=>{const events=[];let runId=null;const listener=event=>{const value=event.data;
    if(value.request_id!==requestId)return;events.push(value);if(value.type==='generation_started')runId=value.run_id;
    if(value.type==='token_generated')worker.postMessage({type:'continue_generation',request_id:requestId,run_id:runId,step_index:value.step.index});
    if(value.type==='generation_finished'||value.type==='error'){worker.removeEventListener('message',listener);clearTimeout(timeout);ok(events)}};
    const timeout=setTimeout(()=>bad(`stream ${requestId} timeout`),60000);worker.addEventListener('message',listener);worker.postMessage({type:'generate',request_id:requestId,text,config:cfg})});
  const wait=(accept,action,label)=>new Promise((ok,bad)=>{const events=[];const listener=event=>{events.push(event.data);if(!accept(event.data))return;
    worker.removeEventListener('message',listener);clearTimeout(timeout);ok({match:event.data,events})};const timeout=setTimeout(()=>bad(`${label} timeout`),60000);worker.addEventListener('message',listener);action()});
  const quiet=(action,sentinel)=>wait(value=>value.type==='error'&&value.request_id===sentinel,()=>{action();worker.postMessage({type:'run',request_id:sentinel,text:''})},'ordered quiet barrier');
  (async()=>{const uiBefore={decoded:document.querySelector('[data-testid="decoded-continuation"]').textContent,selected:document.querySelector('.generated-token[aria-pressed="true"]')?.dataset.stepIndex||null,tensors:[...document.querySelectorAll('[data-detail-tensor-id]')].map(n=>n.dataset.detailTensorId),inspector:document.querySelector('.inspector-panel:not([hidden])').textContent};
    const sameA=await stream(2001,'the cat',config(42)),startA=sameA.find(v=>v.type==='generation_started'),stepsA=sameA.filter(v=>v.type==='token_generated');
    const replay=await wait(v=>v.type==='generation_step_trace'||v.type==='error',()=>worker.postMessage({type:'inspect_generation_step',request_id:2012,generation_run_id:startA.run_id,step_index:1}),'valid replay');
    const mismatch=await wait(v=>v.type==='error'&&v.request_id===2013,()=>worker.postMessage({type:'inspect_generation_step',request_id:2013,generation_run_id:startA.run_id,step_index:99}),'mismatch replay');
    const replayAfterMismatch=await wait(v=>v.type==='generation_step_trace'||v.type==='error',()=>worker.postMessage({type:'inspect_generation_step',request_id:2014,generation_run_id:startA.run_id,step_index:1}),'cache preservation');
    const sameB=await stream(2002,'the cat',config(42)),different=await stream(2003,'the cat',config(43)),greedy=await stream(2004,'the cat',config(42,'greedy',3));
    const duplicateActive=await new Promise((ok,bad)=>{const events=[];let runId;const listener=event=>{const value=event.data;if(value.request_id!==2021)return;events.push(value);if(value.type==='generation_started')runId=value.run_id;if(value.type==='token_generated'){const credit={type:'continue_generation',request_id:2021,run_id:runId,step_index:value.step.index};worker.postMessage(credit);worker.postMessage(credit)}if(value.type==='generation_finished'){worker.removeEventListener('message',listener);clearTimeout(timeout);ok(events)}};const timeout=setTimeout(()=>bad('duplicate active credit timeout'),60000);worker.addEventListener('message',listener);worker.postMessage({type:'generate',request_id:2021,text:'cat',config:config(21,'sample',3)})});
    const eos=await stream(2015,'the cat sat on the mat',config(42,'greedy',8)),context=await stream(2005,'abcdefghijklmnopqrstuvw',config(7));
    const empty=await stream(2006,'',config(7)),koreanText='가나다라마바사아자a',korean=await stream(2007,koreanText,config(7)),recovery=await stream(2008,'cat',config(7,'greedy',1));
    const stopped=await new Promise((ok,bad)=>{const events=[];let identity;const listener=event=>{const value=event.data;if(value.request_id!==2009)return;events.push(value);
      if(value.type==='generation_started'){identity=value;worker.postMessage({type:'stop_generation',request_id:2009,run_id:value.run_id});worker.postMessage({type:'stop_generation',request_id:2009,run_id:value.run_id});}
      if(value.type==='generation_finished'){worker.removeEventListener('message',listener);clearTimeout(timeout);ok({events,identity})}};const timeout=setTimeout(()=>bad('stop timeout'),60000);worker.addEventListener('message',listener);worker.postMessage({type:'generate',request_id:2009,text:'cat',config:config(9,'sample',8)})});
    const duplicateCredit=await quiet(()=>{const token=stepsA[0];worker.postMessage({type:'continue_generation',request_id:2001,run_id:startA.run_id,step_index:token.step.index});worker.postMessage({type:'continue_generation',request_id:2001,run_id:startA.run_id,step_index:token.step.index})},2090);
    const replacement=await new Promise((ok,bad)=>{const events=[];let sent=false;const listener=event=>{const value=event.data;if(![2010,2011].includes(value.request_id))return;events.push(value);
      if(!sent&&value.type==='generation_started'&&value.request_id===2010){sent=true;worker.postMessage({type:'generate',request_id:2011,text:'dog',config:config(11,'sample',1)})}
      if(value.type==='token_generated'&&value.request_id===2011)worker.postMessage({type:'continue_generation',request_id:2011,run_id:value.run_id,step_index:value.step.index});
      if(value.type==='generation_finished'&&value.request_id===2011){worker.removeEventListener('message',listener);clearTimeout(timeout);ok(events)}};const timeout=setTimeout(()=>bad('replacement timeout'),60000);worker.addEventListener('message',listener);worker.postMessage({type:'generate',request_id:2010,text:'cat',config:config(10,'sample',8)})});
    const staleContinuation=await quiet(()=>worker.postMessage({type:'continue_generation',request_id:999999,run_id:999999,step_index:0}),2091);
    const validLatest=replacement.find(v=>v.type==='generation_started'&&v.request_id===2011);
    const staleReplay=await wait(v=>v.type==='error'&&v.request_id===2016,()=>worker.postMessage({type:'inspect_generation_step',request_id:2016,generation_run_id:startA.run_id,step_index:0}),'stale replay');
    const latestReplay=await wait(v=>v.type==='generation_step_trace'||v.type==='error',()=>worker.postMessage({type:'inspect_generation_step',request_id:2017,generation_run_id:validLatest.run_id,step_index:0}),'latest replay');
    const uiAfter={decoded:document.querySelector('[data-testid="decoded-continuation"]').textContent,selected:document.querySelector('.generated-token[aria-pressed="true"]')?.dataset.stepIndex||null,tensors:[...document.querySelectorAll('[data-detail-tensor-id]')].map(n=>n.dataset.detailTensorId),inspector:document.querySelector('.inspector-panel:not([hidden])').textContent};
    const errorReceipt=await wait(v=>v.type==='error',()=>worker.postMessage({type:'generate',request_id:2020,text:'cat',config:{max_new_tokens:2,temperature:0,top_k:0,mode:'sample',seed:1}}),'browser Worker Error');
    const uiRecovery=await wait(v=>v.type==='generation_finished',()=>{const set=(selector,value,event='input')=>{const node=document.querySelector(selector);node.value=value;node.dispatchEvent(new Event(event,{bubbles:true}))};set('#generation-prompt','cat');set('#max-new-tokens','1');set('#sampling-mode','greedy','change');document.querySelector('[data-testid="generate"]').click()},'UI recovery');
    await new Promise(ok=>requestAnimationFrame(()=>requestAnimationFrame(ok)));const recoveredUi={status:document.querySelector('#status').dataset.status,error:Boolean(document.querySelector('[data-testid="generation-error"]')),generated:document.querySelectorAll('.generated-token').length};
    const tokenizer=await fetch('./models/edu/tokenizer.json').then(r=>r.json()),bytes=[...new TextEncoder().encode(koreanText)],tokenIds=[tokenizer.bos_id,...bytes.map(v=>v+tokenizer.byte_offset)];
    resolve({sameA,sameB,different,greedy,duplicateActive,eos,context,empty,korean,recovery,stopped,duplicateCredit,replacement,staleContinuation,replay:replay.match,mismatch:mismatch.match,replayAfterMismatch:replayAfterMismatch.match,staleReplay:staleReplay.match,latestReplay:latestReplay.match,errorReceipt:errorReceipt.match,uiRecovery:uiRecovery.match,recoveredUi,
      tokenizer:{kind:tokenizer.kind,tokenIds,count:tokenIds.length},uiBefore,uiAfter,wireRecords:__acceptance.records.slice(protocolStart)})})().catch(error=>reject(String(error)))})"""


def tokens(events: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Return committed compact steps."""
    return [event["step"] for event in events if event.get("type") == "token_generated"]


def reason(events: list[dict[str, Any]]) -> str | None:
    """Return the sole terminal reason when present."""
    values = [
        event["reason"]
        for event in events
        if event.get("type") == "generation_finished"
    ]
    return values[0] if len(values) == 1 else None


def replay_artifact(data: dict[str, Any]) -> dict[str, Any]:
    """Project complete replay and cache-preservation assertions."""
    source = tokens(data["sameA"])[1]
    responses = [data["replay"], data["replayAfterMismatch"]]
    parity = [
        parity_failures(source, response["step"])
        for response in responses
        if response.get("type") == "generation_step_trace"
    ]
    latest_source = tokens(data["replacement"])[-1]
    latest_parity = (
        parity_failures(latest_source, data["latestReplay"]["step"])
        if data["latestReplay"].get("type") == "generation_step_trace"
        else ["latest replay missing"]
    )
    return {
        "status": "PASS"
        if len(parity) == 2 and not any(parity) and not latest_parity
        else "FAIL",
        "tolerance": 1e-4,
        "parityFailures": parity,
        "mismatch": data["mismatch"],
        "stale": data["staleReplay"],
        "cachePreserved": len(parity) == 2 and not any(parity),
        "latestParityFailures": latest_parity,
        "rapidNewest": data["latestReplay"],
        "response": data["replay"],
    }


def lifecycle_failures(data: dict[str, Any]) -> list[str]:
    """Validate terminal cardinality, causal credit, replacement, and stale identities."""
    failures = []
    stopped = data["stopped"]["events"]
    terminal = [
        i for i, e in enumerate(stopped) if e.get("type") == "generation_finished"
    ]
    if (
        len(terminal) != 1
        or stopped[terminal[0]]["reason"] != "user_stopped"
        or any(e.get("type") == "token_generated" for e in stopped[terminal[0] + 1 :])
    ):
        failures.append("Stop terminal cardinality/order violated")
    replacement = data["replacement"]
    new_start = next(
        i
        for i, e in enumerate(replacement)
        if e.get("type") == "generation_started" and e.get("request_id") == 2011
    )
    old_before = sum(
        e.get("type") == "token_generated" and e.get("request_id") == 2010
        for e in replacement[:new_start]
    )
    old_after = sum(
        e.get("type") == "token_generated" and e.get("request_id") == 2010
        for e in replacement[new_start:]
    )
    replaced = [event for event in replacement if event.get("reason") == "replaced"]
    if old_before > 1 or old_after or len(replaced) != 1:
        failures.append("replacement stale-token/credit bound violated")
    active = data["duplicateActive"]
    if [step["index"] for step in tokens(active)] != [0, 1, 2] or reason(
        active
    ) != "max_new_tokens":
        failures.append("duplicate active continuation minted credit")
    for field in ("duplicateCredit", "staleContinuation"):
        unexpected = [
            e for e in data[field]["events"] if e.get("request_id") not in {2090, 2091}
        ]
        if unexpected:
            failures.append(f"{field} emitted stale response")
    stale = data["staleReplay"]
    if stale.get("code") != "not_initialized" or "실행 기록" not in stale.get(
        "message", ""
    ):
        failures.append("stale replay did not report exact stale-run semantics")
    if data["uiBefore"] != data["uiAfter"]:
        failures.append("direct stale events mutated UI history/evidence")
    return failures


def run(cdp: Cdp, session: str) -> tuple[dict[str, Any], list[str]]:
    """Execute and independently validate exact C002 contracts."""
    before = cdp.send("Runtime.getHeapUsage", session_id=session)
    data = evaluate_dict(cdp, session, DIRECT_PROBE)
    data["errorTerminal"] = error_terminal_probe(cdp, session)
    after = cdp.send("Runtime.getHeapUsage", session_id=session)
    data["memory"] = {"before": before, "after": after}
    failures = lifecycle_failures(data)
    left, right = tokens(data["sameA"]), tokens(data["sameB"])
    sample_start = next(
        event for event in data["sameA"] if event.get("type") == "generation_started"
    )
    greedy_start = next(
        event for event in data["greedy"] if event.get("type") == "generation_started"
    )
    full_candidates = tokens(data["greedy"])[0]["candidates"]
    full_logits = [float("nan")] * 259
    for candidate in full_candidates:
        full_logits[candidate["token_id"]] = candidate["logit"]
    compatible = (
        len(full_candidates) == 259
        and {candidate["token_id"] for candidate in full_candidates} == set(range(259))
        and left[0]["context_token_ids"]
        == tokens(data["greedy"])[0]["context_token_ids"]
        and sample_start["prompt_tokens"] == greedy_start["prompt_tokens"]
        and sample_start["config"]["top_k"] == 20
        and greedy_start["config"]["top_k"] == 259
        and sample_start["config"]["mode"] == "sample"
        and greedy_start["config"]["mode"] == "greedy"
    )
    top_k_failures = global_top_k_failures(full_logits, left[0]["candidates"], 20)
    data["globalTopK"] = {
        "compatibleContextAndConfig": compatible,
        "vocabularySize": len(full_logits),
        "retained": len(left[0]["candidates"]),
        "rankedIds": [candidate["token_id"] for candidate in left[0]["candidates"]],
        "failures": top_k_failures,
    }
    if not compatible or top_k_failures:
        failures.append("full-vocabulary global Top-K qualification failed")
    if len(left) != len(right) or any(
        parity_failures(a, b) for a, b in zip(left, right, strict=True)
    ):
        failures.append("same-seed complete summaries differ")
    for name, mode, temp, top_k in (
        ("sameA", "sample", 2.0, 20),
        ("different", "sample", 2.0, 20),
        ("greedy", "greedy", 1.0, 259),
    ):
        for step in tokens(data[name]):
            failures.extend(
                f"{name}: {item}"
                for item in sampling_step_failures(step, mode, temp, top_k)
            )
            failures.extend(
                f"{name}: {item}" for item in compact_summary_failures(step)
            )
    if [s["generated_token"]["id"] for s in left] == [
        s["generated_token"]["id"] for s in tokens(data["different"])
    ]:
        failures.append("different seed did not alter selections")
    expected = {
        "sameA": "max_new_tokens",
        "eos": "end_of_sequence",
        "context": "context_limit",
    }
    if any(reason(data[name]) != value for name, value in expected.items()):
        failures.append("terminal reason map incomplete")
    if [event.get("type") for event in data["errorTerminal"]] != [
        "generation_started",
        "error",
        "generation_finished",
    ] or reason(data["errorTerminal"]) != "error":
        failures.append("compiled browser Worker Error terminal receipt missing")
    if data["recoveredUi"] != {"status": "complete", "error": False, "generated": 1}:
        failures.append("UI did not recover cleanly after browser Worker error")
    if (
        data["tokenizer"]["count"] != 29
        or data["tokenizer"]["kind"] != "byte_fallback_v1"
    ):
        failures.append("Korean tokenizer boundary is not exact 29 including BOS")
    if not all(
        any("가" <= char <= "힣" for char in event.get("message", ""))
        for field in ("empty", "korean")
        for event in data[field]
        if event.get("type") == "error"
    ) or not tokens(data["recovery"]):
        failures.append("Korean errors/recovery contract violated")
    replay = replay_artifact(data)
    if replay["status"] != "PASS":
        failures.append("replay mismatch/cache preservation failed")
    if after["usedSize"] > before["usedSize"] + 8 * 1024 * 1024:
        failures.append("bounded memory receipt exceeded 8 MiB")
    return data, failures
