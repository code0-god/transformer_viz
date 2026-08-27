"""Regression tests for static startup-shell browser probes."""

from __future__ import annotations

import unittest

from browser_worker_startup import STARTUP_LAYOUT_PROBE, STARTUP_READY_PROBE


class BrowserWorkerStartupTests(unittest.TestCase):
    def test_startup_probes_target_the_shipped_h1(self) -> None:
        selector = ".startup-shell__surface h1"

        self.assertIn(selector, STARTUP_READY_PROBE)
        self.assertIn(selector, STARTUP_LAYOUT_PROBE)
        self.assertNotIn(".startup-shell__surface h2", STARTUP_READY_PROBE)
        self.assertNotIn(".startup-shell__surface h2", STARTUP_LAYOUT_PROBE)


if __name__ == "__main__":
    unittest.main()
