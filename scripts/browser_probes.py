"""Bounded browser-side readiness probe."""

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
