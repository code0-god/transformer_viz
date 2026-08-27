"""Static-safe URL composition shared by browser probes."""

from __future__ import annotations

from typing import Final


LAB_FRAGMENT: Final = "#/lab"


def lab_url(origin: str, base_path: str) -> str:
    """Return the Lab hash route without changing the static asset base path."""
    return f"{origin}{base_path}{LAB_FRAGMENT}"
