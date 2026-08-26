#!/usr/bin/env python3
"""Build the measured Night Soul ref-v4 master map and comparison proof."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "artifacts/night-soul/ref-v4/night-soul-blue-reel-selected.png"
OUT = ROOT / "artifacts/night-soul/task-01"
EXPECTED_SHA256 = "726696f70fb812e472c8f17a3314044dfa69f1cb45716716f8a7ecd4a6f3eb66"
MASTER_SIZE = (1120, 624)


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def font(size: int):
    for candidate in ("/System/Library/Fonts/Menlo.ttc", "/System/Library/Fonts/SFNS.ttf"):
        if Path(candidate).exists():
            try:
                return ImageFont.truetype(candidate, size)
            except OSError:
                pass
    return ImageFont.load_default()


def draw_master_map() -> Image.Image:
    image = Image.new("RGBA", MASTER_SIZE, (0, 0, 0, 0))
    draw = ImageDraw.Draw(image)
    purple = (164, 119, 255, 210)
    cyan = (70, 220, 255, 190)
    orange = (255, 131, 71, 170)
    cream = (250, 239, 206, 215)

    # Master coordinates are cassette-local, 4x the immutable 280 x 156 chassis.
    draw.rectangle((0, 0, 1119, 623), outline=purple, width=3)
    draw.rectangle((56, 48, 1064, 576), outline=(164, 119, 255, 90), width=2)
    for x in (0, 280, 560, 840, 1120):
        draw.line((x, 0, x, 624), fill=(164, 119, 255, 60), width=1)
    for y in (0, 156, 312, 468, 624):
        draw.line((0, y, 1120, y), fill=(164, 119, 255, 60), width=1)

    # Immutable functional anchors: local x/y transformed to master top-left space.
    left = (300, 312)
    right = (820, 312)
    for centre in (left, right):
        draw.ellipse((centre[0] - 200, centre[1] - 200, centre[0] + 200, centre[1] + 200), outline=cyan, width=3)
        draw.ellipse((centre[0] - 80, centre[1] - 80, centre[0] + 80, centre[1] + 80), outline=orange, width=3)
        draw.line((centre[0] - 230, centre[1], centre[0] + 230, centre[1]), fill=(70, 220, 255, 90), width=1)
        draw.line((centre[0], centre[1] - 230, centre[0], centre[1] + 230), fill=(70, 220, 255, 90), width=1)

    # Three aperture placeholders are equal by construction; visual cutout shape is
    # resolved in Task 03/05, not hand-tuned independently per reel.
    aperture_offsets = ((0, -112), (-96, 62), (96, 62))
    for cx, cy in (left, right):
        for ox, oy in aperture_offsets:
            box = (cx + ox - 48, cy + oy - 36, cx + ox + 48, cy + oy + 36)
            draw.rounded_rectangle(box, radius=22, outline=cream, width=2)

    for cx in (184, 936):
        draw.ellipse((cx - 52, 508 - 52, cx + 52, 508 + 52), outline=orange, width=3)
    draw.ellipse((560 - 28, 512 - 28, 560 + 28, 512 + 28), outline=cyan, width=3)
    draw.line((560, 512, 560, 560), fill=cyan, width=3)

    labels = [
        ((26, 38), "LORD BOX  x=-127 y=-66 w=72 h=30"),
        ((48, 320), "LEFT PIVOT (-65,0)  r=50 / hole r=20"),
        ((568, 320), "RIGHT PIVOT (65,0)  r=50 / hole r=20"),
        ((28, 590), "GUIDES (-94,49) / (94,49)   LOCK (0,50)"),
        ((620, 582), "WAIT-ON-YOU BOX  x=12 y=37 w=113 h=38"),
    ]
    for (x, y), label in labels:
        draw.text((x, y), label, fill=cream, font=font(14))
    return image


def main() -> None:
    actual = sha256(SOURCE)
    if actual != EXPECTED_SHA256:
        raise SystemExit(f"source hash mismatch: {actual}")
    OUT.mkdir(parents=True, exist_ok=True)

    master = draw_master_map()
    master.save(OUT / "master-grid.png")

    source = Image.open(SOURCE).convert("RGB")
    left_w = 1120
    left_h = round(source.height * left_w / source.width)
    source_panel = source.resize((left_w, left_h), Image.Resampling.LANCZOS)
    comparison = Image.new("RGB", (left_w * 2, max(left_h, MASTER_SIZE[1])), (13, 20, 38))
    comparison.paste(source_panel, (0, (comparison.height - left_h) // 2))
    comparison.paste(Image.alpha_composite(Image.new("RGBA", MASTER_SIZE, (13, 20, 38, 255)), master).convert("RGB"), (left_w, 0))
    ImageDraw.Draw(comparison).text((24, 16), "SELECTED SOURCE / uniform fit", fill=(250, 239, 206), font=font(20))
    ImageDraw.Draw(comparison).text((left_w + 24, 16), "REF-V4 MASTER / 4x runtime geometry", fill=(250, 239, 206), font=font(20))
    comparison.save(OUT / "source-master-comparison.png")

    payload = {
        "source": str(SOURCE.relative_to(ROOT)),
        "sourceSha256": actual,
        "sourceSize": [source.width, source.height],
        "masterSize": list(MASTER_SIZE),
        "runtimeScale": 4,
        "body": {"x": 0, "y": 0, "width": 1120, "height": 624, "runtime": [280, 156]},
        "reels": {
            "left": {"center": [300, 312], "runtimeLocalCenter": [-65, 0], "faceRadius": 200, "holeRadius": 80},
            "right": {"center": [820, 312], "runtimeLocalCenter": [65, 0], "faceRadius": 200, "holeRadius": 80},
        },
        "guides": {"left": [184, 508], "right": [936, 508], "radius": 52},
        "centerLock": {"center": [560, 512], "radius": 28},
        "decals": {
            "leftReelPrint": [-115, -50, 100, 100],
            "rightReelPrint": [15, -50, 100, 100],
            "lordStrip": [-127, -66, 72, 30],
            "waitOnYouStrip": [12, 37, 113, 38],
        },
        "adaptations": [
            "Preserve the immutable 280 x 156 runtime chassis and map it to a 1120 x 624 4x master.",
            "Keep both reel pivots and the true hole radius locked to the runtime anchors; do not inherit the source image's perspective or aspect ratio.",
            "Use uniform scaling for reference inspection; the final runtime uses code-owned geometry, not a stretched full-body raster.",
            "The source's lower mechanics are vertically compressed into the shared runtime bay while the reel faces remain the dominant hierarchy.",
        ],
    }
    (OUT / "master-map.json").write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
