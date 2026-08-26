#!/usr/bin/env python3
"""Extract the two keyed sticker renders into tight RGBA PNG assets."""

from __future__ import annotations

import argparse
from pathlib import Path

from PIL import Image


def remove_green(source: Path, destination: Path, padding: int = 8) -> None:
    image = Image.open(source).convert("RGBA")
    pixels = image.load()
    for y in range(image.height):
        for x in range(image.width):
            red, green, blue, _ = pixels[x, y]
            green_dominance = green - max(red, blue)
            if green_dominance >= 70:
                alpha = 0
            elif green_dominance <= 10:
                alpha = 255
            else:
                alpha = int((70 - green_dominance) * 255 / 60)
            pixels[x, y] = (red, green, blue, alpha)

    bounds = image.getchannel("A").getbbox()
    if bounds is None:
        raise ValueError(f"No foreground found in {source}")
    left = max(0, bounds[0] - padding)
    top = max(0, bounds[1] - padding)
    right = min(image.width, bounds[2] + padding)
    bottom = min(image.height, bounds[3] + padding)
    destination.parent.mkdir(parents=True, exist_ok=True)
    image.crop((left, top, right, bottom)).save(destination, optimize=True)
    print(f"{destination}: {right - left}x{bottom - top}")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("source", type=Path)
    parser.add_argument("destination", type=Path)
    args = parser.parse_args()
    remove_green(args.source, args.destination)


if __name__ == "__main__":
    main()
