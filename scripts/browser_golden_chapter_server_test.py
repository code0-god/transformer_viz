"""Static public-base routing tests for the Golden browser harness."""

from __future__ import annotations

import tempfile
import unittest
from pathlib import Path
from urllib.error import HTTPError
from urllib.request import urlopen

from browser_golden_chapter import _serve_at_base


class GoldenStaticServerTest(unittest.TestCase):
    def test_serves_release_root_and_assets_under_public_base(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root / "assets").mkdir()
            (root / "index.html").write_text("golden", encoding="utf-8")
            (root / "assets" / "app.js").write_text("ready", encoding="utf-8")
            server, thread, url = _serve_at_base(root, "/transformer_viz/")
            origin = url.removesuffix("/transformer_viz/")
            try:
                with urlopen(url) as response:
                    self.assertEqual(response.read(), b"golden")
                with urlopen(f"{url}assets/app.js") as response:
                    self.assertEqual(response.read(), b"ready")
                with self.assertRaises(HTTPError) as raised:
                    urlopen(f"{origin}/")
                raised.exception.close()
            finally:
                server.shutdown()
                server.server_close()
                thread.join(timeout=10)

    def test_prefers_nested_release_when_combined_root_contains_base(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            nested = root / "transformer_viz"
            nested.mkdir()
            (root / "index.html").write_text("root", encoding="utf-8")
            (nested / "index.html").write_text("subpath", encoding="utf-8")
            server, thread, url = _serve_at_base(root, "/transformer_viz/")
            try:
                with urlopen(url) as response:
                    self.assertEqual(response.read(), b"subpath")
            finally:
                server.shutdown()
                server.server_close()
                thread.join(timeout=10)


if __name__ == "__main__":
    unittest.main()
