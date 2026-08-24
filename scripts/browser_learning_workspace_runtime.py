"""Real generation/replay and keyboard/live evidence for visual confirmation."""

from __future__ import annotations

import base64
import json
from pathlib import Path
from typing import TypedDict

from browser_learning_workspace_actions import (
    NODE_SELECTORS,
    ActionRecord,
    ExpectedState,
    WorkspaceContractError,
    element_expression,
    record_keyboard,
)
from browser_input import dispatch_key
from browser_learning_workspace_probes import VISUAL_SETTLED
from browser_session import ChromeSession

TRACE_GENERATION = r"""new Promise((resolve, reject) => {
  const all = () => Array.from(document.getElementsByTagName('*'));
  const responses = window.__learningWorkerResponses;
  const requests = window.__learningWorkerRequests;
  const tokenCount = () => responses.filter(message => message?.type === 'token_generated').length;
  const cleanupGeneration = () => {
    clearTimeout(generationTimeout);
    removeEventListener('learningworkerresponse', receiveGeneration);
  };
  const fail = message => {
    cleanupGeneration();
    reject(new Error(message));
  };
  const beginReplay = generationFinished => {
    const stepButton = document.getElementsByClassName('generation-steps')[0]
      ?.getElementsByTagName('button')[0];
    if (stepButton === undefined) return reject(new Error('generated step button missing'));
    const beforeReplayTokens = tokenCount();
    const beforeReplayPosts = window.__learningWorkerPosts;
    let inspectRequest;
    const cleanupReplay = () => {
      clearTimeout(replayTimeout);
      removeEventListener('learningworkerrequest', receiveRequest);
      removeEventListener('learningworkerresponse', receiveReplay);
    };
    const receiveRequest = event => {
      if (event.detail?.type === 'inspect_generation_step') inspectRequest = event.detail;
    };
    const receiveReplay = event => {
      const response = event.detail;
      if (response?.type === 'error') {
        cleanupReplay();
        return reject(new Error(response.message));
      }
      if (response?.type !== 'generation_step_trace') return;
      cleanupReplay();
      requestAnimationFrame(() => requestAnimationFrame(() => resolve({
        generation: {
          requestId: generationFinished.request_id,
          runId: generationFinished.run_id,
          reason: generationFinished.reason,
          generatedTokenCount: beforeReplayTokens,
        },
        replay: {
          request: inspectRequest,
          responseType: response.type,
          responseRequestId: response.request_id,
          generationRunId: response.generation_run_id,
          stepIndex: response.step_index,
          summaryRunId: response.summary.run_id,
          sequenceLength: response.summary.tokens.length,
          layerCount: response.summary.layers.length,
          selectedTokenId: response.step.generated_token.id,
          selectedTokenDisplay: response.step.generated_token.display,
          selectedContextLength: response.step.context_token_ids.length,
          tokenDelta: tokenCount() - beforeReplayTokens,
          workerPostDelta: window.__learningWorkerPosts - beforeReplayPosts,
          selectedStepVisible: stepButton.getAttribute('aria-current') === 'step',
          tokenDetailsVisible: document.getElementsByClassName('token-details').length === 1,
        },
        worker: {
          starts: window.__learningWorkerStarts,
          posts: window.__learningWorkerPosts,
          requestTypes: requests.map(request => request?.type ?? 'unknown'),
          responseTypes: responses.map(response => response?.type ?? 'unknown'),
        },
      })));
    };
    addEventListener('learningworkerrequest', receiveRequest);
    addEventListener('learningworkerresponse', receiveReplay);
    const replayTimeout = setTimeout(() => {
      cleanupReplay();
      reject(new Error('generation replay timeout'));
    }, 60000);
    stepButton.click();
  };
  const receiveGeneration = event => {
    const response = event.detail;
    if (response?.type === 'error') return fail(response.message);
    if (response?.type !== 'generation_finished') return;
    cleanupGeneration();
    requestAnimationFrame(() => requestAnimationFrame(() => beginReplay(response)));
  };
  addEventListener('learningworkerresponse', receiveGeneration);
  const generationTimeout = setTimeout(() => fail('generation timeout'), 60000);
  const setValue = (element, value) => {
    const setter = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(element), 'value')?.set;
    if (setter === undefined) throw new Error('form value setter missing');
    setter.call(element, value);
    element.dispatchEvent(new Event('change', { bubbles: true }));
    element.dispatchEvent(new Event('input', { bubbles: true }));
  };
  setValue(document.getElementById('max-new-tokens'), '1');
  setValue(document.getElementById('sampling-mode'), 'greedy');
  const generate = all().find(element => element.dataset.testid === 'generate');
  if (!(generate instanceof HTMLButtonElement)) return fail('Generate button missing');
  generate.click();
})"""

LIVE_TRANSITION = r"""new Promise((resolve, reject) => {
  const all = Array.from(document.getElementsByTagName('*'));
  const live = all.find(element => element.dataset.focusAvailability);
  const section = all.find(element => element.dataset.guideSectionId === 'root-embeddings');
  const control = section?.getElementsByClassName('learning-guide-section-control')[0];
  const node = all.find(element => element.dataset.nodeId === 'token-embedding');
  const before = { availability: live?.dataset.focusAvailability ?? null,
    text: live?.textContent?.trim() ?? '', role: live?.getAttribute('role') ?? null,
    ariaLive: live?.getAttribute('aria-live') ?? null,
    ariaAtomic: live?.getAttribute('aria-atomic') ?? null,
    workerPosts: window.__learningWorkerPosts };
  if (live === undefined || control === undefined || node === undefined)
    return reject(new Error('live transition target missing'));
  let observer;
  const finish = error => {
    clearTimeout(timeout);
    observer?.disconnect();
    error ? reject(error) : resolve({ before, after: {
      availability: live.dataset.focusAvailability ?? null,
      text: live.textContent?.trim() ?? '', role: live.getAttribute('role'),
      ariaLive: live.getAttribute('aria-live'), ariaAtomic: live.getAttribute('aria-atomic'),
      workerPosts: window.__learningWorkerPosts,
      workerDelta: window.__learningWorkerPosts - before.workerPosts,
    }});
  };
  const check = () => {
    if (live.dataset.focusAvailability === 'unavailable') finish();
  };
  observer = new MutationObserver(check);
  observer.observe(live, { subtree: true, childList: true, attributes: true });
  const timeout = setTimeout(() => finish(new Error('live region transition timeout')), 10000);
  node.remove();
  control.click();
})"""


class GenerationEvidence(TypedDict):
    requestId: int
    runId: int
    reason: str
    generatedTokenCount: int


class InspectRequestEvidence(TypedDict):
    type: str
    request_id: int
    generation_run_id: int
    step_index: int


class ReplayEvidence(TypedDict):
    request: InspectRequestEvidence
    responseType: str
    responseRequestId: int
    generationRunId: int
    stepIndex: int
    summaryRunId: int
    sequenceLength: int
    layerCount: int
    selectedTokenId: int
    selectedTokenDisplay: str
    selectedContextLength: int
    tokenDelta: int
    workerPostDelta: int
    selectedStepVisible: bool
    tokenDetailsVisible: bool


class WorkerEvidence(TypedDict):
    starts: int
    posts: int
    requestTypes: list[str]
    responseTypes: list[str]


class RuntimeEvidence(TypedDict):
    generation: GenerationEvidence
    replay: ReplayEvidence
    worker: WorkerEvidence


def prepare_runtime_evidence(browser: ChromeSession) -> RuntimeEvidence:
    result = browser.require_cdp().evaluate(browser.page_session, TRACE_GENERATION, True)
    replay = result["replay"]
    if (
        replay["tokenDelta"] != 0
        or not replay["selectedStepVisible"]
        or not replay["tokenDetailsVisible"]
        or replay["sequenceLength"] <= 0
    ):
        raise WorkspaceContractError(f"real generation/replay evidence failed: {result}")
    return result


def capture_keyboard_live_evidence(browser: ChromeSession, evidence: Path) -> None:
    cdp = browser.require_cdp()
    session = browser.page_session
    target = element_expression(NODE_SELECTORS["embedding"])
    dispatch_key(cdp, session, "Tab", "Tab", 9)
    cdp.evaluate(session, f"({target}).focus()")
    cdp.evaluate(session, VISUAL_SETTLED, True)
    focus = cdp.evaluate(session, f"""(() => {{
      const element = {target};
      const style = getComputedStyle(element);
      const indicator = element.getElementsByClassName('architecture-node__focus-outline')[0];
      const indicatorStyle = getComputedStyle(indicator);
      return {{ focusVisible: element.matches(':focus-visible'), activeTag: document.activeElement?.tagName,
        activeNodeId: document.activeElement?.dataset.nodeId ?? null,
        groupOutlineStyle: style.outlineStyle, groupOutlineWidth: style.outlineWidth,
        indicatorStroke: indicatorStyle.stroke, indicatorStrokeWidth: indicatorStyle.strokeWidth,
        indicatorDasharray: indicatorStyle.strokeDasharray }};
    }})()""", True)
    if not focus["focusVisible"] or focus["indicatorStroke"] == "rgba(0, 0, 0, 0)":
        raise WorkspaceContractError(f"focus-visible style missing: {focus}")
    image = cdp.send("Page.captureScreenshot", {"format": "png", "captureBeyondViewport": False, "fromSurface": True}, session)["data"]
    (evidence / "keyboard-focus-visible-1440x900.png").write_bytes(base64.b64decode(image))
    actions: list[ActionRecord] = []
    record_keyboard(browser, actions, "root.embedding.keyboard", NODE_SELECTORS["embedding"], ExpectedState("decoder.root", "token-embedding", "root-embeddings", "root-embeddings"))
    live = cdp.evaluate(session, LIVE_TRANSITION, True)
    if live["before"]["availability"] != "available" or live["after"]["availability"] != "unavailable" or live["after"]["workerDelta"] != 0:
        raise WorkspaceContractError(f"live-region transition failed: {live}")
    (evidence / "keyboard-live-evidence.json").write_text(json.dumps({"focus": focus, "keyboardActions": actions, "liveRegion": live}, ensure_ascii=False, indent=2) + "\n")
