"""Browser-side probes for the production Learning Workspace contract."""

INSTRUMENT_LEARNING_WORKSPACE = r"""
(() => {
  window.__learningWorkerPosts = 0;
  window.__learningWorkerStarts = 0;
  window.__learningHeadingFocuses = 0;
  window.__learningFocusInvocations = 0;
  window.__learningScrollBehaviors = [];
  const NativeWorker = window.Worker;
  class InstrumentedWorker extends NativeWorker {
    constructor(...args) {
      super(...args);
      window.__learningWorkerStarts += 1;
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
