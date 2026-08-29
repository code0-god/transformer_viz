"""Compose same-viewport before/after screenshots into one review image."""

from __future__ import annotations

import argparse
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


def compose(before_path: Path, after_path: Path, output_path: Path) -> None:
    with Image.open(before_path) as before_source:
        before = before_source.convert("RGB")
    with Image.open(after_path) as after_source:
        after = after_source.convert("RGB")
    if before.size != after.size:
        raise ValueError(
            f"Viewport mismatch: before={before.size}, after={after.size}",
        )

    width, height = before.size
    label_height = 48
    comparison = Image.new("RGB", (width * 2, height + label_height), "#11181b")
    comparison.paste(before, (0, label_height))
    comparison.paste(after, (width, label_height))

    draw = ImageDraw.Draw(comparison)
    font = ImageFont.load_default(size=18)
    draw.text((20, 14), "BEFORE", fill="#f7fbfa", font=font)
    draw.text((width + 20, 14), "AFTER", fill="#f7fbfa", font=font)
    draw.line((width, 0, width, height + label_height), fill="#7d898c", width=2)

    output_path.parent.mkdir(parents=True, exist_ok=True)
    comparison.save(output_path, optimize=True)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--before", type=Path, required=True)
    parser.add_argument("--after", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    compose(args.before, args.after, args.output)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
