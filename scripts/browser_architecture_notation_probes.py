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
  const formula = id => required(
    `[data-formula-id="${id}"] annotation[encoding="application/x-tex"]`,
  ).textContent.trim();
  return {
    root: true,
    repeatedBlock: text.includes('Transformer Block × 2'),
    hiddenInput: text.includes('Hidden State X₀') &&
      formula('hidden-state') === String.raw`X_0 = E_{\mathrm{tok}} + E_{\mathrm{pos}}`,
    hiddenOutput:
      !svg.querySelector('[data-formula-id="root-output-state"]') &&
      text.includes('Append to Context'),
    modelWidth: required(
      '[data-testid="architecture-model-width"] ' +
        'annotation[encoding="application/x-tex"]',
    ).textContent.trim() === String.raw`d_{\mathrm{model}} = 64`,
    finalRelation: formula('final-layer-norm') ===
      String.raw`X_{\mathrm{final}} = \operatorname{LN}_f(X_N)`,
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
  const formula = id => required(
    `.architecture-detail-diagram [data-formula-id="${id}"] ` +
      'annotation[encoding="application/x-tex"]',
  ).textContent.trim();
  const captionFormulas = [
    ...document.querySelectorAll(
      '.architecture-detail-figure figcaption ' +
        'annotation[encoding="application/x-tex"]',
    ),
  ].map(element => element.textContent.trim());
  return {
    block: true,
    input: svgText.includes('Block Input') &&
      formula('block-input-state') === String.raw`X_{\mathrm{in}}\;[T,C]`,
    residual1: svgText.includes('Residual 1') &&
      formula('residual-1') ===
        String.raw`X_{\mathrm{res1}} = X_{\mathrm{in}} + Y_{\mathrm{attn}}`,
    output: svgText.includes('Block Output') &&
      formula('residual-2') ===
        String.raw`X_{\mathrm{out}} = X_{\mathrm{res1}} + Y_{\mathrm{MLP}}`,
    captionFormulas: [
      String.raw`X_{\mathrm{res1}} = X_{\mathrm{in}} + Y_{\mathrm{attn}}`,
      String.raw`X_{\mathrm{out}} = X_{\mathrm{res1}} + Y_{\mathrm{MLP}}`,
    ].every(value => captionFormulas.includes(value)),
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

LEARN_BLOCK_GUIDE_PROBE = r"""
(() => {
  const required = selector => {
    const element = document.querySelector(selector);
    if (!element) throw new Error(`missing ${selector}`);
    return element;
  };
  const panelFormulas = [
    ...document.querySelectorAll(
      '.learning-guide annotation[encoding="application/x-tex"]',
    ),
  ].map(element => element.textContent.trim());
  const formulaHeights = [
    ...document.querySelectorAll('.learning-guide [role="math"]'),
  ].map(element => element.getBoundingClientRect().height);
  return {
    formulas: [
      String.raw`X_{\mathrm{LN1}} = \operatorname{LN1}(X_{\mathrm{in}})`,
      String.raw`Y_{\mathrm{attn}} = \operatorname{Attention}(X_{\mathrm{LN1}})`,
      String.raw`X_{\mathrm{res1}} = X_{\mathrm{in}} + Y_{\mathrm{attn}}`,
      String.raw`X_{\mathrm{LN2}} = \operatorname{LN2}(X_{\mathrm{res1}})`,
      String.raw`Y_{\mathrm{MLP}} = \operatorname{MLP}(X_{\mathrm{LN2}})`,
      String.raw`X_{\mathrm{out}} = X_{\mathrm{res1}} + Y_{\mathrm{MLP}}`,
    ].every(value => panelFormulas.includes(value)),
    layerCount: required(
      '[data-runtime-presentation-id="decoder.runtime.block-facts"] ' +
        '[data-guide-fact-id="decoder.fact.blocks"] [data-fact-status="ready"]',
    ).textContent.trim() === '2',
    formulaMaxHeight: Math.max(0, ...formulaHeights),
    articleLayout: required('[data-learning-layout]').dataset.learningLayout,
    architectureMounted: Boolean(document.querySelector(
      '[data-testid="architecture-detail"]',
    )),
    viewerTrigger: Boolean(document.querySelector(
      '[data-testid="open-diagram-viewer"]',
    )),
  };
})()
"""
