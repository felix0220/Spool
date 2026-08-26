#!/usr/bin/env python3
"""Extract the supplied soft-focus Night sticker into a runtime-safe PNG."""

from __future__ import annotations

import sys
from pathlib import Path

from PIL import Image, ImageChops, ImageFilter


ROOT = Path(__file__).resolve().parents[1]
DEFAULT_OUTPUT = ROOT / "public/assets/night-soul/ref-v3/night-glow.png"


def smoothstep(value: float, low: float, high: float) -> float:
    if high <= low:
        return 1.0 if value >= high else 0.0
    t = max(0.0, min(1.0, (value - low) / (high - low)))
    return t * t * (3.0 - 2.0 * t)


def extract(source: Path) -> Image.Image:
    image = Image.open(source).convert("RGB")
    # The supplied reference is portrait. This crop keeps the Night word and
    # its blue fog while excluding the separate Soul label and green margins.
    crop = image.crop((55, 445, 965, 930))
    pixels = crop.load()
    alpha = Image.new("L", crop.size, 0)
    alpha_pixels = alpha.load()

    for y in range(crop.height):
        for x in range(crop.width):
            r, g, b = pixels[x, y]
            blue_score = (b - g) * 1.15 + (b - r) * 0.35
            brightness = max(r, g, b)
            # Blue ink/fog survives; the green backdrop falls below zero. A
            # second brightness gate removes the broad navy field so the
            # output remains a sticker-shaped glow instead of a blue box.
            blue_strength = smoothstep(blue_score, 5, 42)
            ink_strength = smoothstep(brightness, 76, 210)
            alpha_pixels[x, y] = round(255 * blue_strength * ink_strength)

    # Keep the supplied grain but slightly soften hard source pixels so the
    # logo reads as a focus-bloom sticker rather than a clipped screenshot.
    alpha = alpha.filter(ImageFilter.GaussianBlur(0.8))
    bounds = alpha.getbbox()
    if bounds is None:
        raise SystemExit("no blue logo pixels found in supplied reference")
    pad = 18
    left = max(0, bounds[0] - pad)
    top = max(0, bounds[1] - pad)
    right = min(crop.width, bounds[2] + pad)
    bottom = min(crop.height, bounds[3] + pad)
    crop = crop.crop((left, top, right, bottom)).convert("RGBA")
    alpha = alpha.crop((left, top, right, bottom))

    result = Image.new("RGBA", crop.size, (0, 0, 0, 0))
    # Keep the reference's blue/cobalt fog, but promote the brightest parts of
    # the lettering toward warm ivory. The source is photographed over green;
    # a single blue tint turns the Night word into an unreadable blue block on
    # the cobalt cassette. The low-alpha fog preserves the soft-focus material
    # while the warm highlight carries the negative-form lettering.
    source_pixels = crop.load()
    result_pixels = result.load()
    alpha_pixels = alpha.load()
    for y in range(result.height):
        for x in range(result.width):
            r, g, b, _ = source_pixels[x, y]
            base_alpha = alpha_pixels[x, y] / 255
            value = max(r, g, b)
            blue_strength = smoothstep((b - g) * 1.15 + (b - r) * 0.35, 18, 92)
            cream_strength = (
                smoothstep(r, 72, 158)
                * smoothstep(g, 112, 196)
                * smoothstep(b, 180, 250)
            )
            # Preserve only a whisper of the broad blue atmosphere. This is
            # what keeps the raster from reading as a rectangular blue plate.
            a = round(255 * base_alpha * (0.035 + 0.965 * cream_strength) * blue_strength)
            blend = min(1.0, cream_strength * 1.45)
            blue = (
                min(255, round(8 + value * 0.10)),
                min(255, round(22 + value * 0.20)),
                min(255, round(72 + value * 0.72)),
            )
            ivory = (234, 230, 218)
            result_pixels[x, y] = tuple(round(blue[i] * (1 - blend) + ivory[i] * blend) for i in range(3)) + (a,)
    return result


def main() -> None:
    if len(sys.argv) < 2:
        raise SystemExit("usage: extract-night-soul-logo.py SOURCE [OUTPUT]")
    source = Path(sys.argv[1])
    output = Path(sys.argv[2]) if len(sys.argv) > 2 else DEFAULT_OUTPUT
    if not source.exists():
        raise SystemExit(f"source is missing: {source}")
    output.parent.mkdir(parents=True, exist_ok=True)
    asset = extract(source)
    asset.save(output, "PNG", optimize=False, compress_level=9)
    print(f"wrote {output} {asset.width}x{asset.height}")


if __name__ == "__main__":
    main()
