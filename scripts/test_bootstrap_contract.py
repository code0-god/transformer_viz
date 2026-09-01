# /// script
# requires-python = ">=3.11"
# dependencies = []
# ///
# --- How to run ---
# python3 -m unittest discover -s scripts -p 'test_bootstrap_*.py'

from __future__ import annotations

import pathlib
import re
import unittest
from typing import Final


ROOT: Final = pathlib.Path(__file__).resolve().parent.parent


class DockerBootstrapContractTests(unittest.TestCase):
    def test_web_service_runs_pnpm_noninteractively(self) -> None:
        compose = (ROOT / "compose.yaml").read_text(encoding="utf-8")
        web_service = compose.split("  web:\n", maxsplit=1)[1].split(
            "\nvolumes:\n", maxsplit=1
        )[0]

        self.assertRegex(
            web_service,
            re.compile(r"""^      CI: ["']?true["']?$""", re.MULTILINE),
            "web service must set CI=true so pnpm can refresh stale volumes without a TTY",
        )

    def test_pages_build_uses_root_anchored_default_output(self) -> None:
        workflow = (ROOT / ".github/workflows/pages.yml").read_text(encoding="utf-8")

        self.assertIn(
            "run: ./scripts/build-web.sh /transformer_viz/\n",
            workflow,
            "Pages must use build-web's root-anchored default output directory",
        )


if __name__ == "__main__":
    unittest.main()
