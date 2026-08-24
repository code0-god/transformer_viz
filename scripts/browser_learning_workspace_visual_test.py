#!/usr/bin/env python3
# /// script
# requires-python = ">=3.12"
# dependencies = []
# ///
# ─── How to run ───
# PYTHONPATH=scripts python3 scripts/browser_learning_workspace_visual_test.py
"""Machine-consumed metric tests for Learning Workspace visual capture."""

from __future__ import annotations

import unittest

from browser_learning_workspace import (
    VisualMetricError,
    VisualMetrics,
    parse_viewports,
    validate_metrics,
)
from browser_learning_workspace_visual import normalize_dom_text


class VisualMetricsTest(unittest.TestCase):
    def test_parse_viewports_when_matrix_is_valid(self) -> None:
        # Given: the complete planned viewport argument.
        source = "1440x900,1024x768,390x844"

        # When: the capture boundary parses the argument.
        parsed = parse_viewports(source)

        # Then: dimensions preserve the requested order.
        self.assertEqual(parsed, ((1440, 900), (1024, 768), (390, 844)))

    def test_validate_metrics_when_desktop_contract_is_met(self) -> None:
        # Given: accepted desktop geometry and health metrics.
        metrics: VisualMetrics = {
            "routeId": "decoder.self-attention",
            "viewport": {"width": 1440, "height": 900},
            "layout": {
                "mode": "grid",
                "diagramShare": 48.0,
                "guideShare": 52.0,
                "documentOverflow": 0,
                "unexpectedOverflowOwners": [],
                "stickyVisibleAfterScroll": True,
            },
            "typography": {"fontSize": 15.04, "lineHeightRatio": 1.7},
            "health": {
                "status": "ready",
                "lifecycleStatus": "complete",
                "workerReadyObserved": True,
                "workerStarts": 1,
                "consoleErrors": 0,
                "networkErrors": 0,
                "runtimeErrors": 0,
                "katexErrors": 0,
            },
            "controls": {"targetViolations": []},
            "content": {
                "outlineCount": 1,
                "sectionControlCount": 1,
                "runtimeFactsCount": 1,
                "selectedOperationCount": 1,
                "pendingFactCount": 0,
                "readyFactCount": 1,
            },
        }

        # When/Then: no acceptance failure is returned.
        self.assertEqual(validate_metrics(metrics), ())

    def test_validate_metrics_when_stack_and_health_regress(self) -> None:
        # Given: a tablet render that incorrectly remains a grid and overflows.
        metrics: VisualMetrics = {
            "routeId": "decoder.root",
            "viewport": {"width": 1024, "height": 768},
            "layout": {
                "mode": "grid",
                "diagramShare": 48.0,
                "guideShare": 52.0,
                "documentOverflow": 3,
                "unexpectedOverflowOwners": ["BODY"],
                "stickyVisibleAfterScroll": False,
            },
            "typography": {"fontSize": 14.0, "lineHeightRatio": 1.5},
            "health": {
                "status": "ready",
                "lifecycleStatus": "complete",
                "workerReadyObserved": False,
                "workerStarts": 2,
                "consoleErrors": 1,
                "networkErrors": 0,
                "runtimeErrors": 0,
                "katexErrors": 0,
            },
            "controls": {"targetViolations": ["button"]},
            "content": {
                "outlineCount": 0,
                "sectionControlCount": 0,
                "runtimeFactsCount": 0,
                "selectedOperationCount": 0,
                "pendingFactCount": 1,
                "readyFactCount": 0,
            },
        }

        # When: the acceptance boundary checks the render.
        failures = validate_metrics(metrics)

        # Then: every independent machine regression is named.
        self.assertIn("1024px layout must stack Diagram then Guide", failures)
        self.assertIn("document horizontal overflow must be 0", failures)
        self.assertIn("Guide body font-size must be at least 15px", failures)
        self.assertIn("Worker startup count must be exactly 1", failures)
        self.assertIn("Worker Ready must be observed before generation", failures)
        self.assertIn("browser error counts must all be 0", failures)
        self.assertIn("interactive targets must be at least 44px", failures)
        self.assertIn("runtime and selected-operation facts must be trace-ready", failures)

    def test_normalize_dom_text_when_latex_contains_sqrt(self) -> None:
        # Given: extracted text containing TeX and layout whitespace.
        source = "A_h  =  \\frac{S_h}{\\sqrt D}\n다음"

        # When: evidence text is normalized for JSON review.
        normalized = normalize_dom_text(source)

        # Then: only whitespace collapses; TeX commands remain byte-intact.
        self.assertEqual(normalized, "A_h = \\frac{S_h}{\\sqrt D} 다음")

    def test_parse_viewports_when_token_is_invalid(self) -> None:
        # Given/When/Then: malformed input fails at the CLI boundary.
        with self.assertRaises(VisualMetricError):
            parse_viewports("1440,390x844")


if __name__ == "__main__":
    unittest.main()
