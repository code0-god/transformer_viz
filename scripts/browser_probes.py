"""Bounded browser-side asynchronous probes."""

READY_PROBE = r"""new Promise((resolve, reject) => {
  const timeout = setTimeout(() => finish('app-ready timeout'), 30000);
  let observer;
  const finish = error => {
    clearTimeout(timeout);
    if (observer) observer.disconnect();
    removeEventListener('load', check);
    error ? reject(error) : requestAnimationFrame(() => requestAnimationFrame(resolve));
  };
  const check = () => {
    const shell = document.querySelector('.architecture-app');
    const status = document.querySelector('#status');
    if (status?.dataset.status === 'error') finish(`app entered error: ${status.textContent}`);
    else if (shell && status?.dataset.status === 'ready' && document.readyState === 'complete') finish();
  };
  observer = new MutationObserver(check);
  observer.observe(document.documentElement, {subtree: true, childList: true, attributes: true});
  addEventListener('load', check);
  check();
})"""

STATE_PROBE = r"""(() => {
  const query = selector => document.querySelector(selector);
  const box = element => {
    const rect = element.getBoundingClientRect();
    return {x: rect.x, y: rect.y, w: rect.width, h: rect.height, b: rect.bottom, r: rect.right};
  };
  const overlap = (left, right) =>
    left.x < right.r - 1 && left.r > right.x + 1 && left.y < right.b - 1 && left.b > right.y + 1;
  const stageElement = query('.stage-canvas');
  const stageChildren = [...stageElement.children].filter(element => {
    const rect = element.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  }).map(box);
  const stageOverlaps = stageChildren.some((left, index) =>
    stageChildren.slice(index + 1).some(right => overlap(left, right)));
  const controls = [...document.querySelectorAll('button,input,select,textarea,a[href]')];
  const generationControls = [...document.querySelectorAll(
    '.generation-form input,.generation-form select,.generation-form textarea,.generation-actions button')];
  const active = query('.stage-reel:not([hidden]) [aria-current="step"]');
  const reel = query('.stage-reel:not([hidden])');
  const mapBody = query('.model-map-body');
  const transport = query('.rail-transport');
  const groups = query('.curriculum-groups');
  const sourceRegions = [stageElement, transport, query('.model-map'), query('.inspector'), groups];
  const domOrder = sourceRegions.every((element, index) => index === 0 ||
    Boolean(sourceRegions[index - 1].compareDocumentPosition(element) & Node.DOCUMENT_POSITION_FOLLOWING));
  return {
    innerWidth,
    innerHeight,
    docW: document.documentElement.scrollWidth,
    docH: document.documentElement.scrollHeight,
    shell: box(query('.guided-player')),
    columns: getComputedStyle(query('.guided-player')).gridTemplateColumns.split(' ').length,
    mapToggle: getComputedStyle(query('.model-map-toggle')).display,
    mapHidden: mapBody.hidden,
    mapDisplay: getComputedStyle(mapBody).display,
    mapPosition: getComputedStyle(mapBody).position,
    stage: box(stageElement),
    inspector: box(query('.inspector')),
    transport: box(transport),
    groups: box(groups),
    timeline: box(query('.generation-timeline')),
    domOrder,
    navigationCount: document.querySelectorAll('nav.curriculum-rail').length,
    transportPosition: getComputedStyle(transport).position,
    stageOverflowY: getComputedStyle(stageElement).overflowY,
    stageOverlaps,
    controlsFit: generationControls.every(element => {
      const rect = element.getBoundingClientRect();
      return rect.left >= 0 && rect.right <= innerWidth;
    }),
    minTargets: controls.filter(element => {
      const rect = element.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0 && (rect.width < 44 || rect.height < 44);
    }).length,
    activeVisible: !active || !reel || (
      active.getBoundingClientRect().left >= reel.getBoundingClientRect().left - 1 &&
      active.getBoundingClientRect().right <= reel.getBoundingClientRect().right + 1),
    currentCue: getComputedStyle(active).boxShadow !== 'none',
    speedCue: getComputedStyle(query('.speed-buttons [aria-pressed="true"]')).boxShadow !== 'none',
    visibleGroups: [...document.querySelectorAll('.stage-reel')].filter(element =>
      !element.hidden && getComputedStyle(element).display !== 'none').length,
    panelRole: query('#shared-workspace').getAttribute('role'),
    panelLabel: query('#shared-workspace').getAttribute('aria-labelledby'),
    workerPosts: window.__phase9WorkerPosts || 0
  };
})()"""

SCROLL_PROBE = r"""(selector => new Promise((resolve, reject) => {
  const target = document.querySelector(selector);
  const transport = document.querySelector('.rail-transport');
  const timeout = setTimeout(() => finish('scroll event timeout'), 3000);
  let settled = false;
  const finish = error => {
    if (settled) return;
    settled = true;
    clearTimeout(timeout);
    removeEventListener('scroll', onScroll);
    if (error) reject(error);
    else requestAnimationFrame(() => requestAnimationFrame(() => {
      const rect = transport.getBoundingClientRect();
      resolve({top: rect.top, bottom: rect.bottom, left: rect.left, right: rect.right,
               height: rect.height, position: getComputedStyle(transport).position, scrollY});
    }));
  };
  const onScroll = () => finish();
  addEventListener('scroll', onScroll, {once: true});
  const rect = target.getBoundingClientRect();
  const absoluteTop = rect.top + scrollY;
  const transportRect = transport.getBoundingClientRect();
  const stageGap = Math.max(0, transportRect.top - rect.bottom);
  const desired = selector === '.stage-canvas'
    ? Math.max(0, absoluteTop + rect.height + stageGap - innerHeight + transportRect.height)
    : Math.max(0, absoluteTop + rect.height / 2 - innerHeight / 2);
  scrollTo({top: desired, behavior: 'instant'});
  if (Math.abs(scrollY - desired) < 1) finish();
}))"""

RESET_SCROLL_PROBE = r"""new Promise((resolve, reject) => {
  const timeout = setTimeout(() => reject('scroll reset timeout'), 3000);
  let settled = false;
  const done = () => {
    if (settled) return;
    settled = true;
    clearTimeout(timeout);
    removeEventListener('scroll', done);
    requestAnimationFrame(() => requestAnimationFrame(resolve));
  };
  addEventListener('scroll', done, {once: true});
  scrollTo({top: 0, behavior: 'instant'});
  if (scrollY === 0) done();
})"""

FOCUS_PROBE = r"""new Promise((resolve, reject) => {
  const timeout = setTimeout(() => finish('focus visibility timeout'), 3000);
  const finish = error => {
    clearTimeout(timeout);
    if (error) reject(error);
    else requestAnimationFrame(() => requestAnimationFrame(() => {
      const focused = document.activeElement;
      const rect = focused.getBoundingClientRect();
      const transport = document.querySelector('.rail-transport').getBoundingClientRect();
      const insideTransport = Boolean(focused.closest('.rail-transport'));
      const obscured = !insideTransport && transport.top < innerHeight
        && rect.bottom > transport.top && rect.top < transport.bottom;
      const interactive = ['BUTTON', 'INPUT', 'SELECT', 'TEXTAREA', 'A', 'SUMMARY'].includes(focused.tagName);
      const region = focused.closest('.rail-transport') ? 'transport'
        : focused.closest('.model-map') ? 'map'
        : focused.closest('.inspector') ? 'inspector'
        : focused.closest('.curriculum-rail') ? 'curriculum' : 'other';
      resolve({tag: focused.tagName, id: focused.id, classes: focused.className, interactive, region,
               top: rect.top, bottom: rect.bottom, transportTop: transport.top,
               visible: !interactive || (rect.top >= 0 && rect.bottom <= innerHeight && !obscured)});
    }));
  };
  requestAnimationFrame(() => finish());
})"""
