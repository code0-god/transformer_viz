"""JavaScript probes for canonical Architecture notation."""

ROOT_NOTATION_PROBE = r"""
(() => {
  const required = selector => {
    const element = document.querySelector(selector);
    if (!element) throw new Error(`missing ${selector}`);
    return element;
  };
  const svg = required('[data-testid="architecture-root"].architecture-diagram');
  const text = svg.textContent.replace(/\s+/g, ' ').trim();
  return {
    root: true,
    repeatedBlock: text.includes('Transformer Block × 2'),
    hiddenInput: text.includes('Hidden State X₀') && text.includes('[T, C]'),
    hiddenOutput: text.includes('Hidden State X_N [T, C]'),
    finalRelation: Boolean(document.querySelector('[data-connector="add2-to-final"]')),
    legacyNotation: ['Hidden State x₀', 'Q × K', '× V', 'Block Input x', 'x′']
      .some(value => text.includes(value)),
    mixedShape: ['[T, C] =', '[H, T, D] =', '[T, 64]']
      .some(value => text.includes(value)),
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

BLOCK_NOTATION_PROBE = r"""
(() => {
  const required = selector => {
    const element = document.querySelector(selector);
    if (!element) throw new Error(`missing ${selector}`);
    return element;
  };
  const detail = required('[data-testid="architecture-detail"]');
  const text = detail.textContent.replace(/\s+/g, ' ').trim();
  const svgText = required('.architecture-detail-diagram').textContent
    .replace(/\s+/g, ' ').trim();
  const formulaHeights = [
    ...document.querySelectorAll('.architecture-annotation [role="math"]'),
  ].map(element => element.getBoundingClientRect().height);
  return {
    block: true,
    input: svgText.includes('Block Input') && svgText.includes('X_in [T, C]'),
    residual1: svgText.includes('Residual 1') &&
      svgText.includes('X_res1 = X_in + Y_attn'),
    output: svgText.includes('Block Output') &&
      svgText.includes('X_out = X_res1 + Y_MLP'),
    formulas: [
      'X_LN1 = LN1(X_in)',
      'Y_attn = Attention(X_LN1)',
      'X_res1 = X_in + Y_attn',
      'X_LN2 = LN2(X_res1)',
      'Y_MLP = MLP(X_LN2)',
      'X_out = X_res1 + Y_MLP',
    ].every(value => text.includes(value)),
    formulaMaxHeight: Math.max(0, ...formulaHeights),
    firstResidual: required('[data-connector="input-to-residual1"]').getAttribute('d'),
    secondResidual: required('[data-connector="x-prime-to-residual2"]').getAttribute('d'),
    legacyNotation: ['Block Input x', 'x′', 'Block Output y', 'Attention(LN1(x))']
      .some(value => text.includes(value)),
    mixedShape: svgText.includes('[T, C] ='),
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
