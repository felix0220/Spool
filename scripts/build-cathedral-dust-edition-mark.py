#!/usr/bin/env python3
"""Build the small Cathedral Dust edition engraving from the title's script idiom.

The font is used only at asset-generation time. The runtime ships the RGBA
asset, so the browser does not depend on a local font being installed.
"""

from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "public/assets/cathedral-dust/ref-v1/edition-03-engraving.png"
FONT = Path("/System/Library/Fonts/Supplemental/SnellRoundhand.ttc")


def main() -> None:
    if not FONT.exists():
        raise SystemExit(f"generation font is missing: {FONT}")

    canvas = Image.new("RGBA", (112, 64), (0, 0, 0, 0))
    draw = ImageDraw.Draw(canvas)
    font = ImageFont.truetype(str(FONT), 82)
    # The 4x source scale matches the existing Cathedral title asset. The
    # negative y offset trims the font's built-in ascender space while keeping
    # a small transparent breathing margin around the engraving.
    draw.text((10, -25), "03", font=font, fill=(157, 148, 137, 224))
    canvas.save(OUTPUT, "PNG", optimize=False, compress_level=9)
    print(f"wrote {OUTPUT} {canvas.width}x{canvas.height}")


if __name__ == "__main__":
    main()
