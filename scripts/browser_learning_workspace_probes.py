"""Browser-side probes for the production Learning Workspace contract."""

INSTRUMENT_LEARNING_WORKSPACE = r"""
(() => {
  window.__learningWorkerPosts = 0;
  window.__learningHeadingFocuses = 0;
  window.__learningScrollBehaviors = [];
  const originalPostMessage = Worker.prototype.postMessage;
  const originalScrollBy = HTMLElement.prototype.scrollBy;
  HTMLElement.prototype.scrollBy = function (...args) {
    const options = args[0];
    window.__learningScrollBehaviors.push(options?.behavior ?? 'auto');
    return originalScrollBy.apply(this, args);
  };
  Worker.prototype.postMessage = function (...args) {
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
  const timeout = setTimeout(() => finish('missing Learning Workspace selectors'), 10000);
  let observer;
  const finish = error => {
    clearTimeout(timeout);
    observer?.disconnect();
    error ? reject(new Error(error)) : resolve();
  };
  const check = () => {
    const workspace = document.querySelector('[data-learning-route-id]');
    const guide = document.querySelector('[data-guide-page-id]');
    if (workspace && guide) finish();
  };
  observer = new MutationObserver(check);
  observer.observe(document.documentElement, { subtree: true, childList: true, attributes: true });
  check();
})"""

STATE_PROBE = r"""
(() => {
  const workspace = document.querySelector('[data-learning-route-id]');
  if (!workspace) throw new Error('missing [data-learning-route-id]');
  const selected = document.querySelector('[data-node-id][aria-pressed="true"]');
  const active = document.querySelector('[data-guide-section-id][data-active="true"]');
  const focused = document.activeElement;
  return {
    route: workspace.dataset.learningRouteId,
    selectedNode: selected?.dataset.nodeId ?? null,
    activeSection: active?.dataset.guideSectionId ?? null,
    focusedElement: focused?.dataset.nodeId ?? focused?.dataset.guideSectionId ?? focused?.id ?? focused?.tagName ?? null,
    highlights: [...document.querySelectorAll('[data-node-id][data-learning-highlighted="true"]')]
      .map(element => element.dataset.nodeId).sort(),
    workerPosts: window.__learningWorkerPosts,
    headingFocuses: window.__learningHeadingFocuses,
    focusAvailability: document.querySelector('[data-focus-availability]')?.dataset.focusAvailability ?? null,
    scrollBehaviors: [...window.__learningScrollBehaviors],
  };
})()
"""

PAGE_HEALTH = r"""
(() => ({
  katexErrors: document.querySelectorAll('.katex-error').length,
  runtimeAlerts: [...document.querySelectorAll('[role="alert"]')].map(element => element.textContent?.trim()),
  documentOverflow: Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth),
  status: document.querySelector('#status')?.dataset.status ?? null,
}))()
"""
