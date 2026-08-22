#!/usr/bin/env python3
"""Deterministically measure per-resource gzip transfer size for a static artifact."""

from __future__ import annotations

import argparse
import gzip
import hashlib
import io
import json
from pathlib import Path


def gzip_size(content: bytes) -> int:
    output = io.BytesIO()
    with gzip.GzipFile(
        fileobj=output, mode="wb", filename="", compresslevel=9, mtime=0
    ) as stream:
        stream.write(content)
    return output.tell()


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("root", type=Path)
    args = parser.parse_args()
    root = args.root.resolve()
    if not root.is_dir():
        parser.error(f"not a directory: {root}")

    files = sorted(path for path in root.rglob("*") if path.is_file())
    if not files:
        parser.error(f"no regular files: {root}")
    entries = []
    uncompressed_bytes = 0
    compressed_bytes = 0
    for path in files:
        content = path.read_bytes()
        relative = path.relative_to(root).as_posix()
        uncompressed_bytes += len(content)
        compressed_bytes += gzip_size(content)
        entries.append(f"{hashlib.sha256(content).hexdigest()}  {relative}\n")
    paths = "".join(entry.split("  ", 1)[1] for entry in entries).encode()
    manifest = "".join(entries).encode()
    print(
        json.dumps(
            {
                "regular_file_count": len(entries),
                "uncompressed_bytes": uncompressed_bytes,
                "gzip_9n_per_resource_bytes": compressed_bytes,
                "file_list_sha256": hashlib.sha256(paths).hexdigest(),
                "artifact_manifest_sha256": hashlib.sha256(manifest).hexdigest(),
            },
            sort_keys=True,
        )
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
