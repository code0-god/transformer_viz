"""Static-shell and mounted Worker startup failure browser probes."""

from __future__ import annotations

from browser_session import ChromeSession
from browser_worker_integrity_server import AssetHandler, IntegrityError

STARTUP_READY_PROBE = r"""new Promise((resolve, reject) => {
  const timeout = setTimeout(() => finish('startup shell timeout'), 10000);
  const finish = error => {
    clearTimeout(timeout);
    removeEventListener('load', check);
    error ? reject(error) : requestAnimationFrame(() => requestAnimationFrame(resolve));
  };
  const check = () => {
    if (document.readyState === 'complete' &&
        document.querySelector('.startup-shell__surface h2') &&
        document.querySelector('.startup-shell__path ol')) finish();
  };
  addEventListener('load', check);
  check();
})"""

STARTUP_LAYOUT_PROBE = r"""(() => {
  const heading = document.querySelector('.startup-shell__surface h2');
  const textNode = heading?.firstChild;
  const text = textNode?.textContent?.trim() ?? '';
  const lastWord = text.split(/\s+/).at(-1) ?? '';
  const range = document.createRange();
  if (textNode && lastWord) {
    const start = textNode.textContent.lastIndexOf(lastWord);
    range.setStart(textNode, start);
    range.setEnd(textNode, start + lastWord.length);
  }
  const wordLines = new Set(
    [...range.getClientRects()].filter(rect => rect.width && rect.height)
      .map(rect => Math.round(rect.top))
  ).size;
  const items = [...document.querySelectorAll('.startup-shell__path li')]
    .map(element => element.getBoundingClientRect());
  return {
    startup: Boolean(document.querySelector('#startup-shell')),
    docWidth: document.documentElement.scrollWidth,
    viewportWidth: innerWidth,
    lastWordLines: wordLines,
    pathItems: items.length,
    pathVertical: items.every((item, index) =>
      index === 0 || item.top >= items[index - 1].bottom + 1),
  };
})()"""

WORKER_FAILURE_PROBE = r"""new Promise((resolve, reject) => {
  const timeout = setTimeout(() => finish('Worker loader error timeout'), 10000);
  let observer;
  const finish = error => {
    clearTimeout(timeout);
    if (observer) observer.disconnect();
    error ? reject(error) : requestAnimationFrame(() => requestAnimationFrame(resolve));
  };
  const check = () => {
    const status = document.querySelector('#status')?.dataset.status;
    if (status === 'error') finish();
    else if (status === 'ready') finish('blocked Worker loader reached ready');
  };
  observer = new MutationObserver(check);
  observer.observe(document.documentElement, {subtree: true, childList: true, attributes: true});
  check();
})"""


def verify_startup_layout(origin: str, base: str) -> None:
    with ChromeSession() as browser:
        cdp = browser.require_cdp()
        session = browser.page_session
        cdp.send(
            "Emulation.setDeviceMetricsOverride",
            {
                "width": 390,
                "height": 844,
                "deviceScaleFactor": 1,
                "mobile": False,
            },
            session,
        )
        cdp.send(
            "Network.setBlockedURLs",
            {"urls": ["*.js", "*.wasm"]},
            session,
        )
        browser.navigate(origin + base)
        cdp.evaluate(session, STARTUP_READY_PROBE, True)
        state = cdp.evaluate(session, STARTUP_LAYOUT_PROBE)
        if (
            not state.get("startup")
            or state.get("docWidth", 391) > state.get("viewportWidth", 390)
            or state.get("lastWordLines") != 1
            or state.get("pathItems") != 3
            or not state.get("pathVertical")
        ):
            raise IntegrityError(f"{base} mobile startup layout failed: {state}")
    print(f"{base} 390x844 startup layout: PASS")


def verify_worker_loader_failure(origin: str, base: str) -> None:
    AssetHandler.block_worker_loader = True
    try:
        with ChromeSession() as browser:
            cdp = browser.require_cdp()
            session = browser.page_session
            browser.navigate(origin + base)
            cdp.evaluate(session, WORKER_FAILURE_PROBE, True)
            state = cdp.evaluate(
                session,
                """(() => {
                    const detail = document.querySelector('.lifecycle-detail');
                    const style = detail ? getComputedStyle(detail) : null;
                    return {
                        status: document.querySelector('#status')?.dataset.status,
                        detail: detail?.textContent?.trim(),
                        detailVisible: style?.display !== 'none',
                        detailClipped: detail
                            ? detail.scrollWidth > detail.clientWidth
                                || detail.scrollHeight > detail.clientHeight
                            : true,
                        lifecycleRole: document.querySelector('.lifecycle')?.getAttribute('role'),
                        generateDisabled:
                            document.querySelector('[data-testid="generate"]')?.disabled,
                        startup: Boolean(document.querySelector('#startup-shell')),
                    };
                })()""",
            )
            if (
                state.get("status") != "error"
                or not state.get("detail")
                or not state.get("detailVisible")
                or state.get("detailClipped")
                or state.get("lifecycleRole") != "alert"
                or not state.get("generateDisabled")
                or state.get("startup")
            ):
                raise IntegrityError(
                    f"{base} Worker loader failure was not visible: {state}"
                )
    finally:
        AssetHandler.block_worker_loader = False
    print(f"{base} Worker loader failure UI: PASS")
