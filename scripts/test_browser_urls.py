#!/usr/bin/env python3
# /// script
# requires-python = ">=3.12"
# dependencies = []
# ///
# ─── How to run ───
# PYTHONPATH=scripts uv run -m unittest scripts/test_browser_urls.py
"""Unit tests for static-safe browser probe URLs."""

from __future__ import annotations

import unittest

from browser_urls import lab_url


class BrowserUrlTests(unittest.TestCase):
    def test_composes_lab_url_when_served_from_root(self) -> None:
        # Given: a static server mounted at the domain root.
        origin = "http://127.0.0.1:43123"
        # When: a probe requests the Lab surface.
        url = lab_url(origin, "/")
        # Then: the hash route leaves static asset resolution at the root.
        self.assertEqual(url, "http://127.0.0.1:43123/#/lab")

    def test_composes_lab_url_when_served_from_subpath(self) -> None:
        # Given: a static server mounted beneath the production subpath.
        origin = "http://127.0.0.1:43123"
        # When: a probe requests the Lab surface.
        url = lab_url(origin, "/transformer_viz/")
        # Then: the hash route preserves the production asset base path.
        self.assertEqual(url, "http://127.0.0.1:43123/transformer_viz/#/lab")
