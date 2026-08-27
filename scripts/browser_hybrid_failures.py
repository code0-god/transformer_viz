"""Production-browser fault injection for local visualization boundaries."""

from __future__ import annotations

from browser_hybrid_capture import request_urls
from browser_hybrid_contract import button_with_text, go_chapter, require
from browser_hybrid_helpers import (
    evaluate_dict,
    pointer_click,
    wait_for,
)
from browser_learning_workspace_probes import INSTRUMENT_LEARNING_WORKSPACE
from browser_learning_workspace_runtime import prepare_runtime_evidence
from browser_probes import READY_PROBE
from browser_session import ChromeSession


def verify_failure_modes(url: str) -> dict[str, object]:
    unavailable = _verify_unavailable(url)
    renderer_error = _verify_renderer_error(url)
    return {
        "webglUnavailable": unavailable,
        "rendererImportError": renderer_error,
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
    go_chapter(browser, "5-1")
    pointer_click(
        browser,
        "document.querySelector('button[data-head-index=\"1\"]')",
        condition=(
            "document.querySelector('button[data-head-index=\"1\"]')"
            "?.getAttribute('aria-pressed') === 'true'"
        ),
        label="Failure-mode Head 2 selection",
    )
    pointer_click(
        browser,
        "document.querySelector('[role=\"tab\"]"
        "[aria-controls=\"learning-visualization-panel\"]')",
        condition=(
            "document.querySelector('#learning-visualization-panel')"
            "?.hidden === false"
        ),
        label="Failure-mode Visualization tab",
    )
    pointer_click(
        browser,
        button_with_text("Layer 1, Head 2 Score 불러오기"),
        condition=(
            "window.__learningWorkerResponses.some("
            "item => item?.type === 'attention_head_trace')"
        ),
        label="Failure-mode trace response",
    )


def _fallback_probe(browser: ChromeSession) -> dict[str, object]:
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
            guidePresent: document.querySelector('.learning-guide') !== null,
            canvasCount: document.querySelectorAll(
              '.score-matrix-canvas canvas',
            ).length,
          };
        })()""",
    )


def _verify_unavailable(url: str) -> dict[str, object]:
    with ChromeSession(enable_gpu=False) as browser:
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
            and probe["guidePresent"] is True
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


def _verify_renderer_error(url: str) -> dict[str, object]:
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
            and probe["guidePresent"] is True
            and probe["canvasCount"] == 0,
            f"Renderer error boundary failed: {probe}",
        )
        return probe
