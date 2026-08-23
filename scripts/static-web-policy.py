#!/usr/bin/env python3
"""Inject and fail-closed validate the Vite static release policy."""

from __future__ import annotations

import argparse
import re
from html.parser import HTMLParser
from pathlib import Path, PurePosixPath
from urllib.parse import unquote, urlsplit

CSP = "default-src 'self'; base-uri 'self'; object-src 'none'; script-src 'self' 'wasm-unsafe-eval'; style-src 'self'; img-src 'self' data:; font-src 'self'; connect-src 'self'; worker-src 'self'; manifest-src 'self'; form-action 'none'"
REFERRER = "strict-origin-when-cross-origin"
ASSET_EXTENSIONS = {".css", ".js", ".wasm", ".woff", ".woff2", ".ttf"}
REQUIRED_EXTENSIONS = {".css", ".js", ".wasm", ".woff2", ".safetensors"}


class Document(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.base: list[dict[str, str | None]] = []
        self.links: list[dict[str, str | None]] = []
        self.metas: list[dict[str, str | None]] = []
        self.scripts: list[tuple[dict[str, str | None], str]] = []
        self._script: tuple[dict[str, str | None], list[str]] | None = None

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        values = dict(attrs)
        if tag == "base":
            self.base.append(values)
        elif tag == "link":
            self.links.append(values)
        elif tag == "meta":
            self.metas.append(values)
        elif tag == "script":
            if self._script is not None:
                raise ValueError("nested script")
            self._script = (values, [])

    def handle_data(self, data: str) -> None:
        if self._script is not None:
            self._script[1].append(data)

    def handle_endtag(self, tag: str) -> None:
        if tag == "script":
            if self._script is None:
                raise ValueError("script end without start")
            attrs, content = self._script
            self.scripts.append((attrs, "".join(content)))
            self._script = None


def parse(source: str) -> Document:
    document = Document()
    document.feed(source)
    document.close()
    if document._script is not None:
        raise ValueError("unterminated script")
    return document


def local_path(url: str, base: str) -> PurePosixPath:
    parsed = urlsplit(url)
    if parsed.scheme or parsed.netloc or url.startswith("//"):
        raise ValueError(f"cross-origin runtime asset: {url}")
    path = unquote(parsed.path)
    if not path.startswith(base):
        raise ValueError(f"asset escapes configured base {base}: {url}")
    relative = path.removeprefix(base)
    result = PurePosixPath(relative)
    if ".." in result.parts:
        raise ValueError(f"asset traverses release root: {url}")
    return result


def validate_html(root: Path, base: str) -> Document:
    page = root / "index.html"
    source = page.read_text(encoding="utf-8")
    document = parse(source)
    csp = [
        meta
        for meta in document.metas
        if (meta.get("http-equiv") or "").lower() == "content-security-policy"
    ]
    if not csp:
        if source.count("<head>") != 1:
            raise ValueError("expected exactly one HTML head")
        meta = f'<meta http-equiv="Content-Security-Policy" content="{CSP}" />'
        source = source.replace("<head>", f"<head>\n    {meta}", 1)
        page.write_text(source, encoding="utf-8")
        document = parse(source)
        csp = [
            item
            for item in document.metas
            if (item.get("http-equiv") or "").lower()
            == "content-security-policy"
        ]
    if len(csp) != 1 or csp[0].get("content") != CSP:
        raise ValueError(f"release CSP is not canonical: {csp}")
    if "'sha256-" in source or "'unsafe-inline'" in source:
        raise ValueError("release CSP permits an inline script or style")
    if source.index("Content-Security-Policy") > source.index("<script"):
        raise ValueError("release CSP must precede the Vite module script")
    if document.base != [{"href": base}]:
        raise ValueError(f"release base is not canonical: {document.base}")
    referrers = [meta for meta in document.metas if meta.get("name") == "referrer"]
    if referrers != [{"name": "referrer", "content": REFERRER}]:
        raise ValueError(f"release referrer policy is not canonical: {referrers}")
    if len(document.scripts) != 1:
        raise ValueError("expected exactly one Vite module script")
    attrs, content = document.scripts[0]
    if attrs.get("type") != "module" or not attrs.get("src") or content.strip():
        raise ValueError("Vite entry must be one external module with no inline body")
    for url in [attrs["src"], *[link["href"] for link in document.links if link.get("href") and not str(link["href"]).startswith("data:")]]:
        relative = local_path(str(url), base)
        if not (root / relative).is_file():
            raise ValueError(f"HTML asset is missing: {url}")
    return document


def validate_files(root: Path, base: str) -> None:
    files = [path for path in root.rglob("*") if path.is_file()]
    suffixes = {path.suffix for path in files}
    missing = REQUIRED_EXTENSIONS - suffixes
    if missing:
        raise ValueError(f"release is missing asset types: {sorted(missing)}")
    for stylesheet in (path for path in files if path.suffix == ".css"):
        for raw in re.findall(r"url\((?:['\"])?([^)'\"]+)", stylesheet.read_text()):
            if raw.startswith(("data:", "#")):
                continue
            resolved = (PurePosixPath(base) / stylesheet.relative_to(root).parent / raw)
            normalized = PurePosixPath(*[part for part in resolved.parts if part != "."])
            while ".." in normalized.parts:
                parts = list(normalized.parts)
                index = parts.index("..")
                if index < 2:
                    raise ValueError(f"CSS asset escapes release root: {raw}")
                del parts[index - 1 : index + 1]
                normalized = PurePosixPath(*parts)
            relative = local_path("/" + str(normalized).lstrip("/"), base)
            if not (root / relative).is_file():
                raise ValueError(f"CSS asset is missing: {stylesheet}: {raw}")
    for path in files:
        if path.suffix in ASSET_EXTENSIONS and path.stat().st_size == 0:
            raise ValueError(f"empty runtime asset: {path}")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--root", type=Path, required=True)
    parser.add_argument("--base", required=True)
    args = parser.parse_args()
    validate_html(args.root.resolve(), args.base)
    validate_files(args.root.resolve(), args.base)
    print(f"{args.base} CSP and same-origin static assets: PASS")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
