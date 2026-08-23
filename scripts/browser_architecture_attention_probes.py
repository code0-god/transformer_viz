"""JavaScript probes for Self-Attention Architecture browser contracts."""

BLOCK_ATTENTION_PROBE = r"""
(() => {
  const required = selector => {
    const element = document.querySelector(selector);
    if (!element) throw new Error(`missing ${selector}`);
    return element;
  };
  const node = required('[data-node-id="self-attention"]');
  const indicator = required('.architecture-node__drill-down');
  const outline = required('.architecture-node__focus-outline');
  return {
    block: Boolean(document.querySelector('[data-testid="architecture-detail"]')),
    attention: Boolean(document.querySelector('[data-testid="attention-detail"]')),
    capability: node.dataset.nodeCapability,
    role: node.getAttribute('role'),
    tabIndex: node.getAttribute('tabindex'),
    indicator: indicator?.textContent.trim(),
    indicatorOpacity: Number.parseFloat(getComputedStyle(indicator).opacity),
    outlineStroke: getComputedStyle(outline).stroke,
    selectedLayer: Number(required('[data-testid="architecture-detail"]').dataset.selectedLayer),
    firstResidual: required('[data-connector="input-to-residual1"]').getAttribute('d'),
    secondResidual: required('[data-connector="x-prime-to-residual2"]').getAttribute('d'),
    prompt: required('#generation-prompt').value,
    status: required('#status').dataset.status,
    workerPosts: window.__architectureWorkerPosts,
  };
})()
"""

ATTENTION_DETAIL_PROBE = r"""
(() => {
  const required = selector => {
    const element = document.querySelector(selector);
    if (!element) throw new Error(`missing ${selector}`);
    return element;
  };
  const detail = required('[data-testid="attention-detail"]');
  const scroll = required('.architecture-attention-scroll');
  const ids = [
    'attention-qkv-projection', 'attention-query', 'attention-key',
    'attention-value', 'attention-scores', 'attention-scale',
    'attention-causal-mask', 'attention-softmax',
    'attention-value-aggregation', 'attention-merge-heads',
    'attention-output-projection',
  ];
  const nodes = ids.map(id => required(`[data-node-id="${id}"]`));
  const connector = name => required(`[data-connector="${name}"]`);
  const point = (name, end = false) => {
    const path = connector(name);
    const value = path.getPointAtLength(end ? path.getTotalLength() : 0);
    return { x: value.x, y: value.y };
  };
  const y = id => Number(required(`[data-node-id="${id}"] rect`).getAttribute('y'));
  const nodeText = id => required(`[data-node-id="${id}"]`).textContent
    .replace(/\s+/g, ' ').trim();
  const factValue = label => {
    const term = [...document.querySelectorAll('.architecture-attention-facts dt')]
      .find(element => element.textContent.trim() === label);
    return term?.nextElementSibling?.textContent.trim() ?? null;
  };
  const qkvStarts = ['qkv-to-query', 'qkv-to-key', 'qkv-to-value'].map(name => point(name));
  const text = detail.textContent;
  const diagramText = required('.architecture-attention-diagram').textContent;
  const formulaHeights = [
    ...document.querySelectorAll('.architecture-attention-operation [role="math"]'),
  ].map(element => element.getBoundingClientRect().height);
  return {
    attention: true,
    block: Boolean(document.querySelector('[data-testid="architecture-detail"]')),
    selectedLayer: Number(detail.dataset.selectedLayer),
    selectedHead: Number(detail.dataset.selectedHead),
    layerButtons: document.querySelectorAll('[data-layer-index]').length,
    headButtons: document.querySelectorAll('[data-head-index]').length,
    breadcrumbBlock: required('[data-testid="architecture-breadcrumb-block"]').textContent.trim(),
    breadcrumbAttention: required('[data-testid="architecture-breadcrumb-attention"]').textContent.trim(),
    breadcrumbCurrent: required(
      '[data-testid="architecture-breadcrumb-attention"]',
    ).getAttribute('aria-current'),
    nodeIds: nodes.map(node => node.dataset.nodeId),
    nodeCapabilities: nodes.map(node => node.dataset.nodeCapability),
    nodeRoles: nodes.map(node => node.getAttribute('role')),
    nodeAriaLabels: nodes.map(node => node.getAttribute('aria-label')),
    selectedNode: document.querySelector(
      '.architecture-node.is-selected',
    )?.dataset.nodeId ?? null,
    operationCopy: document.querySelector(
      '[data-testid="attention-operation-copy"]',
    )?.textContent.trim() ?? null,
    operationFormulaTex: document.querySelector(
      '[data-testid="attention-operation-copy"] annotation[encoding="application/x-tex"]',
    )?.textContent.trim() ?? null,
    qkvStarts,
    qToScoresEnd: point('query-heads-to-scores', true),
    kToScoresEnd: point('key-heads-to-scores', true),
    valueToAggregationEnd: point('value-heads-to-aggregation', true),
    hasValueToScores: Boolean(document.querySelector('[data-connector="value-heads-to-scores"]')),
    operationOrder: [
      y('attention-scores'), y('attention-scale'), y('attention-causal-mask'),
      y('attention-softmax'), y('attention-value-aggregation'),
      y('attention-merge-heads'), y('attention-output-projection'),
    ],
    oneQkvProjection: document.querySelectorAll(
      '[data-node-id="attention-qkv-projection"]',
    ).length,
    splitHeadNodes: document.querySelectorAll('.architecture-attention-split').length,
    currentValues: {
      t: factValue('T'),
      c: factValue('C'),
      h: factValue('H'),
      d: factValue('D'),
      scale: factValue('1 / √D'),
    },
    symbolSections: [...document.querySelectorAll('.architecture-notation-section h4')]
      .map(element => element.textContent.trim()),
    qkvShape: nodeText('attention-qkv-projection').includes(
      'Linear: [T, C] → [T, 3C]',
    ),
    scoreMatmul: nodeText('attention-scores').includes('Score MatMul') &&
      nodeText('attention-scores').includes('S_h = Q_h @ K_hᵀ'),
    valueMatmul: nodeText('attention-value-aggregation').includes('Value MatMul') &&
      nodeText('attention-value-aggregation').includes('Y_h = A_h @ V_h'),
    scaleSymbolic: nodeText('attention-scale').includes('S_h / √D'),
    formula: Boolean(document.querySelector(
      '[role="math"][aria-label="Self-Attention summary"] .katex-mathml math',
    )),
    formulaMaxHeight: Math.max(0, ...formulaHeights),
    actualShapeInDiagram: /\b64\b|\b16\b|\[4,/.test(diagramText),
    legacyNotation: /Q × K|× V|1 \/ √16|\[T, C\] =|\[H, T, D\] =/.test(
      diagramText,
    ),
    attentionOutput: text.includes('Attention Output'),
    hasResidual: /Residual Add/.test(text) ||
      Boolean(document.querySelector('[data-connector*="residual"]')),
    forbiddenDetail: /heatmap|Tensor Inspector|source inspector|probability cell/i.test(text),
    prompt: required('#generation-prompt').value,
    status: required('#status').dataset.status,
    workerPosts: window.__architectureWorkerPosts,
    documentOverflow: Math.max(
      0,
      document.documentElement.scrollWidth - document.documentElement.clientWidth,
    ),
    localOverflow: Math.max(0, scroll.scrollWidth - scroll.clientWidth),
  };
})()
"""
