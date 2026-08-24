"""JavaScript probes for architecture navigation browser contracts."""

INSTRUMENT_WORKER = r"""
(() => {
  window.__architectureWorkerPosts = 0;
  const originalPostMessage = Worker.prototype.postMessage;
  Worker.prototype.postMessage = function (...args) {
    window.__architectureWorkerPosts += 1;
    return originalPostMessage.apply(this, args);
  };
})();
"""

ROOT_PROBE = r"""
(() => {
  const required = selector => {
    const element = document.querySelector(selector);
    if (!element) throw new Error(`missing ${selector}`);
    return element;
  };
  const block = required('[data-node-id="transformer-block"]');
  const indicator = required(
    '[data-node-id="transformer-block"] .architecture-node__drill-down--label',
  );
  const outline = required('.architecture-node__focus-outline');
  return {
    root: Boolean(document.querySelector('[data-testid="architecture-root"]')),
    detail: Boolean(document.querySelector('[data-testid="architecture-detail"]')),
    capability: block.getAttribute('data-node-capability'),
    role: block.getAttribute('role'),
    tabIndex: block.getAttribute('tabindex'),
    pressed: block.getAttribute('aria-pressed'),
    indicatorOpacity: Number.parseFloat(getComputedStyle(indicator).opacity),
    outlineFill: getComputedStyle(outline).fill,
    outlineStroke: getComputedStyle(outline).stroke,
    prompt: required('#generation-prompt').value,
    status: required('#status').dataset.status,
    workerPosts: window.__architectureWorkerPosts,
    documentOverflow: Math.max(
      0,
      document.documentElement.scrollWidth - document.documentElement.clientWidth,
    ),
  };
})()
"""

DETAIL_PROBE = r"""
(() => {
  const required = selector => {
    const element = document.querySelector(selector);
    if (!element) throw new Error(`missing ${selector}`);
    return element;
  };
  const detail = required('[data-testid="architecture-detail"]');
  const scroll = required('.architecture-detail-scroll');
  const firstPath = required('[data-connector="input-to-residual1"]');
  const secondPath = required('[data-connector="x-prime-to-residual2"]');
  const firstJunction = required('[data-junction="block-input-junction"]');
  const secondJunction = required('[data-junction="x-prime-junction"]');
  const internalNodes = [...document.querySelectorAll(
    '[data-node-id="layer-norm-1"], [data-node-id="self-attention"], ' +
    '[data-node-id="residual-1"], [data-node-id="layer-norm-2"], ' +
    '[data-node-id="mlp"], [data-node-id="residual-2"]',
  )];
  return {
    root: Boolean(document.querySelector('[data-testid="architecture-root"]')),
    detail: true,
    selectedLayer: Number(detail.dataset.selectedLayer),
    layerButtons: document.querySelectorAll('[data-layer-index]').length,
    breadcrumb: required('[data-testid="architecture-breadcrumb-block"]').textContent.trim(),
    breadcrumbCurrent: required(
      '[data-testid="architecture-breadcrumb-block"]',
    ).getAttribute('aria-current'),
    firstPath: firstPath.getAttribute('d'),
    secondPath: secondPath.getAttribute('d'),
    firstJunctionY: Number(firstJunction.getAttribute('cy')),
    secondJunctionY: Number(secondJunction.getAttribute('cy')),
    internalNodeCount: internalNodes.length,
    internalRoles: internalNodes.map(node => node.getAttribute('role')),
    prompt: required('#generation-prompt').value,
    status: required('#status').dataset.status,
    workerPosts: window.__architectureWorkerPosts,
    forbiddenDetail: /QKV|QKᵀ|Softmax|heatmap|Tensor Inspector/i.test(
      detail.textContent,
    ),
    documentOverflow: Math.max(
      0,
      document.documentElement.scrollWidth - document.documentElement.clientWidth,
    ),
    localOverflow: Math.max(0, scroll.scrollWidth - scroll.clientWidth),
  };
})()
"""

SET_PROMPT = r"""
(() => {
  const prompt = document.querySelector('#generation-prompt');
  const setter = Object.getOwnPropertyDescriptor(
    HTMLTextAreaElement.prototype,
    'value',
  ).set;
  setter.call(prompt, 'architecture navigation sentinel');
  prompt.dispatchEvent(new Event('input', { bubbles: true }));
})()
"""
