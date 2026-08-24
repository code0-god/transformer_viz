"""Browser-side probes for the production Learning Workspace contract."""

import json

from browser_session import ChromeSession

INSTRUMENT_LEARNING_WORKSPACE = r"""
(() => {
  window.__learningWorkerPosts = 0;
  window.__learningWorkerStarts = 0;
  window.__learningHeadingFocuses = 0;
  window.__learningFocusInvocations = 0;
  window.__learningScrollBehaviors = [];
  window.__learningWorkerRequests = [];
  window.__learningWorkerResponses = [];
  const NativeWorker = window.Worker;
  class InstrumentedWorker extends NativeWorker {
    constructor(...args) {
      super(...args);
      window.__learningWorkerStarts += 1;
      this.addEventListener('message', event => {
        window.__learningWorkerResponses.push(event.data);
        dispatchEvent(new CustomEvent('learningworkerresponse', { detail: event.data }));
      });
    }
  }
  window.Worker = InstrumentedWorker;
  const originalPostMessage = NativeWorker.prototype.postMessage;
  const originalScrollBy = HTMLElement.prototype.scrollBy;
  const instrumentFocus = prototype => {
    const originalFocus = prototype.focus;
    if (typeof originalFocus !== 'function') return;
    prototype.focus = function (...args) {
      window.__learningFocusInvocations += 1;
      dispatchEvent(new Event('learningfocusinvoke'));
      return originalFocus.apply(this, args);
    };
  };
  instrumentFocus(HTMLElement.prototype);
  instrumentFocus(SVGElement.prototype);
  HTMLElement.prototype.scrollBy = function (...args) {
    const options = args[0];
    window.__learningScrollBehaviors.push(options?.behavior ?? 'auto');
    return originalScrollBy.apply(this, args);
  };
  NativeWorker.prototype.postMessage = function (...args) {
    window.__learningWorkerPosts += 1;
    window.__learningWorkerRequests.push(args[0]);
    dispatchEvent(new CustomEvent('learningworkerrequest', { detail: args[0] }));
    return originalPostMessage.apply(this, args);
  };
  addEventListener('focusin', event => {
    if (event.target?.id === 'learning-route-title') {
      window.__learningHeadingFocuses += 1;
    }
  });
})();
"""

WORKSPACE_READY = r"""new Promise((resolve, reject) => {
  const timeout = setTimeout(() => finish('missing Learning Workspace elements'), 10000);
  let observer;
  const finish = error => {
    clearTimeout(timeout);
    observer?.disconnect();
    error ? reject(new Error(error)) : resolve();
  };
  const check = () => {
    const elements = Array.from(document.getElementsByTagName('*'));
    const workspace = elements.find(element => element.dataset.learningRouteId);
    const guide = elements.find(element => element.dataset.guidePageId);
    if (workspace && guide) finish();
  };
  observer = new MutationObserver(check);
  observer.observe(document.documentElement, { subtree: true, childList: true, attributes: true });
  check();
})"""

STATE_PROBE = r"""
(() => {
  const elements = Array.from(document.getElementsByTagName('*'));
  const workspace = elements.find(element => element.dataset.learningRouteId);
  if (!workspace) throw new Error('missing Learning Workspace route');
  const selected = elements.find(element => element.dataset.nodeId && element.getAttribute('aria-pressed') === 'true');
  const active = elements.find(element => element.dataset.guideSectionId && element.dataset.active === 'true');
  const focusStatus = elements.find(element => element.dataset.focusAvailability);
  const focused = document.activeElement;
  return {
    route: workspace.dataset.learningRouteId,
    selectedNode: selected?.dataset.nodeId ?? null,
    activeSection: active?.dataset.guideSectionId ?? null,
    focusedElement: focused?.dataset.nodeId ?? focused?.dataset.guideSectionId ?? focused?.id ?? focused?.tagName ?? null,
    highlights: elements
      .filter(element => element.dataset.nodeId && element.dataset.learningHighlighted === 'true')
      .map(element => element.dataset.nodeId).sort(),
    workerPosts: window.__learningWorkerPosts,
    workerStarts: window.__learningWorkerStarts,
    headingFocuses: window.__learningHeadingFocuses,
    focusInvocations: window.__learningFocusInvocations,
    focusAvailability: focusStatus?.dataset.focusAvailability ?? null,
    scrollBehaviors: [...window.__learningScrollBehaviors],
  };
})()
"""

PAGE_HEALTH = r"""
(() => {
  const elements = Array.from(document.getElementsByTagName('*'));
  return {
    katexErrors: document.getElementsByClassName('katex-error').length,
    runtimeAlerts: elements
      .filter(element => element.getAttribute('role') === 'alert')
      .map(element => element.textContent?.trim()),
    documentOverflow: Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth),
    status: document.getElementById('status')?.dataset.status ?? null,
  };
})()
"""

VISUAL_SETTLED = r"""new Promise(resolve => requestAnimationFrame(() => {
  document.getAnimations().forEach(animation => animation.finish());
  requestAnimationFrame(resolve);
}))"""

VISUAL_PROBE = r"""
(() => {
  const all = Array.from(document.getElementsByTagName('*'));
  const byClass = name => document.getElementsByClassName(name)[0];
  const rect = element => {
    const value = element.getBoundingClientRect();
    return { x: value.x, y: value.y, width: value.width, height: value.height,
      top: value.top, bottom: value.bottom };
  };
  const workspace = byClass('learning-workspace');
  const body = byClass('learning-workspace__body');
  const diagram = byClass('learning-workspace__pane--diagram');
  const guide = byClass('learning-workspace__pane--guide');
  const guideStyle = getComputedStyle(byClass('learning-guide'));
  const active = all.find(element => element.dataset.guideSectionId && element.dataset.active === 'true');
  const track = all.find(element => element.dataset.learningTrackId);
  const page = all.find(element => element.dataset.guidePageId);
  const overflowOwners = all.filter(element => {
    const overflowX = getComputedStyle(element).overflowX;
    return ['auto', 'scroll'].includes(overflowX) && element.scrollWidth > element.clientWidth + 1;
  }).map(element => ({ tag: element.tagName, id: element.id,
    classes: element.className?.baseVal ?? element.className ?? '',
    overflow: element.scrollWidth - element.clientWidth }));
  const intended = owner => /diagram-scroll|svg-scroll|attention-scroll|math-scroll/.test(owner.classes);
  const targets = all.filter(element => ['BUTTON', 'INPUT', 'TEXTAREA', 'SELECT'].includes(element.tagName) && !element.disabled)
    .filter(element => workspace.contains(element)).map(element => ({ tag: element.tagName,
      label: element.getAttribute('aria-label') ?? element.textContent?.trim() ?? '', ...rect(element) }));
  const diagramRect = rect(diagram);
  const guideRect = rect(guide);
  const totalWidth = diagramRect.width + guideRect.width;
  return {
    routeId: workspace.dataset.learningRouteId,
    profileId: track.dataset.learningTrackId,
    pageId: page.dataset.guidePageId,
    scrollY,
    documentHeight: document.documentElement.scrollHeight,
    workspaceRect: rect(workspace), bodyRect: rect(body), diagramRect, guideRect,
    mode: Math.abs(diagramRect.x - guideRect.x) < 4 ? 'stack' : 'grid',
    diagramShare: totalWidth === 0 ? 0 : diagramRect.width / totalWidth * 100,
    guideShare: totalWidth === 0 ? 0 : guideRect.width / totalWidth * 100,
    documentOverflow: Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth),
    overflowOwners,
    unexpectedOverflowOwners: overflowOwners.filter(owner => !intended(owner)),
    fontSize: Number.parseFloat(guideStyle.fontSize),
    lineHeight: Number.parseFloat(guideStyle.lineHeight),
    activeAccent: active === undefined ? null : { id: active.dataset.guideSectionId,
      backgroundImage: getComputedStyle(active).backgroundImage },
    outlineCount: document.getElementsByClassName('learning-guide-outline').length,
    sectionControlCount: document.getElementsByClassName('learning-guide-section-control').length,
    runtimeFactsCount: document.getElementsByClassName('learning-guide-runtime').length,
    selectedOperationCount: document.getElementsByClassName('learning-guide-operation').length,
    pendingFactCount: all.filter(element => element.dataset.factStatus === 'pending').length,
    readyFactCount: all.filter(element => element.dataset.factStatus === 'ready').length,
    targetViolations: targets.filter(target => target.width < 44 || target.height < 44),
    targets,
    sections: all.filter(element => element.dataset.guideSectionId).map(element => ({
      id: element.dataset.guideSectionId,
      primaryNodeId: element.dataset.primaryNodeId ?? null,
      associatedNodeIds: element.dataset.associatedNodeIds ?? '',
      text: element.textContent ?? ''
    })),
    runtimePresentationIds: all.filter(element => element.dataset.runtimePresentationId)
      .map(element => element.dataset.runtimePresentationId),
    operationPresentationIds: all.filter(element => element.dataset.operationPresentationId)
      .map(element => element.dataset.operationPresentationId),
    outlineText: byClass('learning-guide-outline')?.textContent ?? '',
    guideText: page.textContent ?? '',
  };
})()
"""

STICKY_PROBE = r"""
(() => {
  const diagram = document.getElementsByClassName('learning-workspace__pane--diagram')[0];
  const box = diagram.getBoundingClientRect();
  return { scrollY, top: box.top, bottom: box.bottom, visible: box.bottom > 0 && box.top < innerHeight,
    position: getComputedStyle(diagram).position };
})()
"""


def browser_errors(browser: ChromeSession) -> dict[str, list[str]]:
    console: list[str] = []
    network: list[str] = []
    runtime: list[str] = []
    request_urls: dict[str, str] = {}
    for event in browser.require_cdp().events:
        method = event.get("method")
        params = event.get("params", {})
        if method == "Network.requestWillBeSent":
            request_urls[params.get("requestId", "")] = params.get("request", {}).get("url", "")
        if method == "Runtime.consoleAPICalled" and params.get("type") in ("error", "warning"):
            console.append(json.dumps(params, ensure_ascii=False))
        if method == "Runtime.exceptionThrown":
            runtime.append(json.dumps(params, ensure_ascii=False))
        if method == "Network.loadingFailed":
            request_url = request_urls.get(params.get("requestId", ""), "unknown")
            network.append(f"{request_url}: {json.dumps(params, ensure_ascii=False)}")
        if method == "Network.responseReceived" and params.get("response", {}).get("status", 0) >= 400:
            network.append(json.dumps(params.get("response"), ensure_ascii=False))
    return {"console": console, "network": network, "runtime": runtime}
