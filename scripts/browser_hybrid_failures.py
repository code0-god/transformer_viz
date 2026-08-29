"""Production-browser fault injection for local visualization boundaries."""

from __future__ import annotations

from browser_hybrid_capture import request_urls
from browser_hybrid_contract import button_with_text, require
from browser_hybrid_helpers import (
    JsonObject,
    evaluate_dict,
    navigate_hash,
    pointer_click,
    settle_animations,
    wait_for,
)
from browser_learning_workspace_probes import INSTRUMENT_LEARNING_WORKSPACE
from browser_learning_workspace_runtime import prepare_runtime_evidence
from browser_probes import READY_PROBE
from browser_session import ChromeSession

DISABLE_WEBGL = r"""
(() => {
  Object.defineProperty(window, 'WebGLRenderingContext', {
    configurable: true,
    value: undefined,
  });
  Object.defineProperty(window, 'WebGL2RenderingContext', {
    configurable: true,
    value: undefined,
  });
  const nativeGetContext = HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext = function (kind, ...args) {
    return String(kind).startsWith('webgl')
      ? null
      : nativeGetContext.call(this, kind, ...args);
  };
})();
"""


def verify_failure_modes(url: str) -> JsonObject:
    unavailable = _verify_unavailable(url)
    reduced_motion = _verify_reduced_motion(url)
    renderer_error = _verify_renderer_error(url)
    css_unavailable = _verify_css_unavailable(url)
    return {
        "webglUnavailable": unavailable,
        "reducedMotion": reduced_motion,
        "rendererImportError": renderer_error,
        "cssUnavailable": css_unavailable,
    }


def _prepare_score_request(browser: ChromeSession, url: str) -> None:
    cdp = browser.require_cdp()
    cdp.send(
        "Page.addScriptToEvaluateOnNewDocument",
        {"source": INSTRUMENT_LEARNING_WORKSPACE},
        browser.page_session,
    )
    browser.navigate(f"{url}#/lab")
    cdp.evaluate(browser.page_session, READY_PROBE, True)
    prepare_runtime_evidence(browser)
    pointer_click(
        browser,
        "document.querySelector('[data-inspection-kind=\"attention\"]')",
        condition=(
            "document.querySelector('#focused-viewer "
            "[data-testid=\"attention-detail\"]') !== null"
        ),
        label="Failure-mode Attention viewer",
    )
    settle_animations(
        browser,
        "[data-viewer-backdrop]",
        "Failure-mode Attention viewer animation",
    )
    pointer_click(
        browser,
        "document.querySelector('#focused-viewer "
        "button[data-head-index=\"1\"]')",
        condition=(
            "document.querySelector('#focused-viewer "
            "button[data-head-index=\"1\"]')"
            "?.getAttribute('aria-pressed') === 'true'"
        ),
        label="Failure-mode Head 2 selection",
    )
    pointer_click(
        browser,
        "document.querySelector('[aria-label=\"집중 보기 닫기\"]')",
        condition="document.querySelector('#focused-viewer') === null",
        label="Failure-mode Architecture close",
    )
    pointer_click(
        browser,
        "document.querySelector('[data-inspection-kind=\"score-matrix\"]')",
        condition=(
            "document.querySelector('#focused-viewer"
            "[data-viewer-kind=\"visualization\"]') !== null"
        ),
        label="Failure-mode Score Matrix viewer",
    )
    settle_animations(
        browser,
        "[data-viewer-backdrop]",
        "Failure-mode Score Matrix viewer animation",
    )
    pointer_click(
        browser,
        button_with_text(
            "Layer 1, Head 2 Score 불러오기",
            "document.querySelector('#focused-viewer')",
        ),
        condition=(
            "window.__learningWorkerResponses.some("
            "item => item?.type === 'attention_head_trace')"
        ),
        label="Failure-mode trace response",
    )


def _fallback_probe(browser: ChromeSession) -> JsonObject:
    return evaluate_dict(
        browser,
        """(() => {
          const fallback = document.querySelector(
            '.three-visualization-surface__fallback',
          );
          const table = document.querySelector('.score-matrix-table');
          return {
            fallbackOpen:
              fallback instanceof HTMLDetailsElement && fallback.open,
            tableVisible: table instanceof HTMLElement
              && table.getBoundingClientRect().height > 0,
            viewerPresent:
              document.querySelector('#focused-viewer') !== null,
            canvasCount: document.querySelectorAll(
              '.score-matrix-canvas canvas',
            ).length,
          };
        })()""",
    )


def _verify_unavailable(url: str) -> JsonObject:
    with ChromeSession(enable_gpu=False) as browser:
        browser.require_cdp().send(
            "Page.addScriptToEvaluateOnNewDocument",
            {"source": DISABLE_WEBGL},
            browser.page_session,
        )
        _prepare_score_request(browser, url)
        wait_for(
            browser,
            "document.querySelector('[data-visualization-state=\"unavailable\"]') !== null",
            "WebGL unavailable fallback",
        )
        probe = _fallback_probe(browser)
        require(
            probe["fallbackOpen"] is True
            and probe["tableVisible"] is True
            and probe["viewerPresent"] is True
            and probe["canvasCount"] == 0,
            f"WebGL unavailable boundary failed: {probe}",
        )
        require(
            not any(
                "ScoreMatrixScene" in request
                for request in request_urls(browser)
            ),
            "Unavailable WebGL requested renderer chunk",
        )
        return probe


def _verify_reduced_motion(url: str) -> JsonObject:
    with ChromeSession(enable_gpu=True) as browser:
        browser.require_cdp().send(
            "Emulation.setEmulatedMedia",
            {
                "media": "",
                "features": [
                    {
                        "name": "prefers-reduced-motion",
                        "value": "reduce",
                    },
                ],
            },
            browser.page_session,
        )
        _prepare_score_request(browser, url)
        wait_for(
            browser,
            (
                "document.querySelector("
                "'[data-visualization-state=\"reduced-motion\"]'"
                ") !== null"
            ),
            "Reduced-motion static fallback",
        )
        probe = {
            **_fallback_probe(browser),
            "mediaMatches": browser.require_cdp().evaluate(
                browser.page_session,
                "matchMedia('(prefers-reduced-motion: reduce)').matches",
            ),
        }
        require(
            probe["mediaMatches"] is True
            and probe["fallbackOpen"] is True
            and probe["tableVisible"] is True
            and probe["viewerPresent"] is True
            and probe["canvasCount"] == 0,
            f"Reduced-motion boundary failed: {probe}",
        )
        require(
            not any(
                "ScoreMatrixScene" in request
                for request in request_urls(browser)
            ),
            "Reduced-motion route requested renderer chunk",
        )
        return probe


def _verify_renderer_error(url: str) -> JsonObject:
    with ChromeSession(enable_gpu=True) as browser:
        browser.require_cdp().send(
            "Network.setBlockedURLs",
            {"urls": ["*ScoreMatrixScene-*"]},
            browser.page_session,
        )
        _prepare_score_request(browser, url)
        wait_for(
            browser,
            "document.querySelector('[data-visualization-state=\"error\"]') !== null",
            "Renderer import error fallback",
        )
        probe = _fallback_probe(browser)
        require(
            probe["fallbackOpen"] is True
            and probe["tableVisible"] is True
            and probe["viewerPresent"] is True
            and probe["canvasCount"] == 0,
            f"Renderer error boundary failed: {probe}",
        )
        return probe


def _verify_css_unavailable(url: str) -> JsonObject:
    with ChromeSession(enable_gpu=False) as browser:
        cdp = browser.require_cdp()
        cdp.send(
            "Network.setBlockedURLs",
            {"urls": ["*.css"]},
            browser.page_session,
        )
        browser.navigate(url)
        cdp.evaluate(browser.page_session, READY_PROBE, True)
        home = evaluate_dict(
            browser,
            """(() => ({
              heading:
                document.querySelector('.course-home h1')
                ?.textContent?.trim() ?? '',
              startLink:
                document.querySelector('.course-home__start')
                instanceof HTMLAnchorElement,
              navigation:
                document.querySelector('nav[aria-label="주요 탐색"]')
                instanceof HTMLElement,
            }))()""",
        )
        require(
            home["heading"] == "Transformer를 처음부터 살펴봅니다"
            and home["startLink"] is True
            and home["navigation"] is True,
            f"CSS-free Home semantics failed: {home}",
        )

        navigate_hash(
            browser,
            "#/learn/decoder-only-fundamentals/0-2",
            (
                "document.querySelector('article') !== null"
                " && document.querySelector("
                "'[data-figure-id=\"decoder.diagram.tokenization.token\"]'"
                ") !== null"
            ),
            "CSS-free Learn",
        )
        learn = evaluate_dict(
            browser,
            """(() => {
              const figure = document.querySelector(
                '[data-figure-id="decoder.diagram.tokenization.token"]',
              );
              return {
                article: document.querySelector('article') !== null,
                heading:
                  document.querySelector(
                    '.curriculum-workspace__chapter-copy h1',
                  )?.textContent?.trim() ?? '',
                figure: figure instanceof HTMLElement,
                caption: figure?.querySelector('figcaption')
                  ?.textContent?.trim() ?? '',
                graphic:
                  figure?.querySelector('svg, [role="img"]') !== null,
                canvasCount: document.querySelectorAll('canvas').length,
              };
            })()""",
        )
        require(
            learn["article"] is True
            and learn["heading"] == "Token이란?"
            and learn["figure"] is True
            and isinstance(learn["caption"], str)
            and learn["caption"] != ""
            and learn["graphic"] is True
            and learn["canvasCount"] == 0,
            f"CSS-free Learn semantics failed: {learn}",
        )

        navigate_hash(
            browser,
            "#/lab",
            "document.querySelector('[data-app-view=\"lab\"]') !== null",
            "CSS-free Lab",
        )
        lab = evaluate_dict(
            browser,
            """(() => ({
              heading:
                document.querySelector('.lab-introduction h1')
                ?.textContent?.trim() ?? '',
              headingLabel:
                document.querySelector('.lab-introduction h1')
                ?.getAttribute('aria-label') ?? '',
              prompt: document.querySelector('textarea') !== null,
              generate:
                document.querySelector('[data-testid="generate"]')
                instanceof HTMLButtonElement,
              settings:
                document.querySelector('.generation-settings')
                instanceof HTMLDetailsElement,
            }))()""",
        )
        require(
            lab["heading"] == "MODEL LAB"
            and lab["headingLabel"] == "모델 실험실"
            and lab["prompt"] is True
            and lab["generate"] is True
            and lab["settings"] is True,
            f"CSS-free Lab semantics failed: {lab}",
        )
        blocked_styles = [
            request
            for request in request_urls(browser)
            if request.split("?", 1)[0].endswith(".css")
        ]
        require(blocked_styles != [], "CSS-free probe blocked no stylesheet")
        return {
            "blockedStyleRequests": len(blocked_styles),
            "home": home,
            "learn": learn,
            "lab": lab,
        }
