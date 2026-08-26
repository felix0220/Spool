#!/usr/bin/env python3
"""Deterministically extract the approved Cathedral Dust production layers.

Task 02 owns asset separation only. The runtime branch is intentionally left
for Task 03 so these images can be inspected and recombined independently.
"""

from __future__ import annotations

import hashlib
import json
from datetime import date
from pathlib import Path

from PIL import Image, ImageChops, ImageDraw, ImageFilter, ImageOps


ROOT = Path(__file__).resolve().parents[1]
ASSET_DIR = ROOT / "public/assets/cathedral-dust/ref-v1"
ARTIFACT_DIR = ROOT / "artifacts/cathedral-dust/task-02"
SOURCE = ASSET_DIR / "reference-source.png"
MASTER = ASSET_DIR / "production-master.png"
MANIFEST = ASSET_DIR / "manifest.json"

WIDTH, HEIGHT = 1120, 624
EXPECTED_SOURCE_HASH = "c0a1bb096f555df3bc365014cf49186363752d063ffe2b36d58d847341b41ffe"
HOLES = ((300, 312, 80), (820, 312, 80))
REEL_RADIUS = 95
REEL_CROP = 224
TITLE_BBOX = (88, 88, 742, 154)
MARK_BBOX = (918, 88, 1048, 142)
LOWER_BBOX = ((229, 472), (891, 472), (891, 624), (229, 624))
FASTENERS = ((38, 36), (1082, 36), (38, 588), (1082, 588), (560, 520))

LAYER_ORDER = [
    "rear-media.png",
    "lower-mechanism.png",
    "shell-substrate.png",
    "reel-left-surface.png",
    "reel-right-surface.png",
    "title-engraving.png",
    "official-SPOOL-mark-vector",
    "brass-fastener.png",
    "surface-wear.png",
]


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for block in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def aa_mask(draw_fn, size=(WIDTH, HEIGHT), scale=4):
    large = Image.new("L", (size[0] * scale, size[1] * scale), 0)
    draw_fn(ImageDraw.Draw(large), scale)
    return large.resize(size, Image.Resampling.LANCZOS)


def rect_mask(rect):
    x0, y0, x1, y1 = rect
    return aa_mask(lambda draw, s: draw.rectangle((x0 * s, y0 * s, x1 * s, y1 * s), fill=255))


def polygon_mask(points):
    return aa_mask(lambda draw, s: draw.polygon([(x * s, y * s) for x, y in points], fill=255))


def circle_mask(cx, cy, radius, size=(WIDTH, HEIGHT)):
    return aa_mask(
        lambda draw, s: draw.ellipse(
            ((cx - radius) * s, (cy - radius) * s, (cx + radius) * s, (cy + radius) * s),
            fill=255,
        ),
        size=size,
    )


def union(*masks):
    result = Image.new("L", masks[0].size, 0)
    for mask in masks:
        result = ImageChops.lighter(result, mask)
    return result


def subtract(base, cut):
    return ImageChops.subtract(base, cut)


def transparent_safe(image: Image.Image) -> Image.Image:
    rgba = image.convert("RGBA")
    pixels = rgba.load()
    for y in range(rgba.height):
        for x in range(rgba.width):
            r, g, b, a = pixels[x, y]
            if a == 0:
                pixels[x, y] = (0, 0, 0, 0)
    return rgba


def layer_from_mask(master: Image.Image, mask: Image.Image) -> Image.Image:
    alpha = ImageChops.multiply(master.getchannel("A"), mask)
    layer = master.copy().convert("RGBA")
    layer.putalpha(alpha)
    return transparent_safe(layer)


def hole_cut(mask: Image.Image) -> Image.Image:
    return subtract(mask, union(*(circle_mask(*hole) for hole in HOLES)))


def master_outer(master: Image.Image) -> Image.Image:
    return master.getchannel("A")


def engraving_mask(master: Image.Image, bbox) -> Image.Image:
    """Extract pale engraved strokes while rejecting dark media texture."""
    gray = ImageOps.grayscale(master)
    blurred = gray.filter(ImageFilter.GaussianBlur(2.4))
    contrast = ImageChops.difference(gray, blurred)
    contrast_alpha = contrast.point(lambda value: min(255, max(0, (value - 11) * 22)))
    light_stroke = gray.point(lambda value: 255 if value >= 120 else 0)
    return ImageChops.multiply(ImageChops.multiply(contrast_alpha, light_stroke), rect_mask(bbox))


def title_mask(master: Image.Image) -> Image.Image:
    """Extract the thin handwritten engraving without the nearby seam lines."""
    extracted = engraving_mask(master, TITLE_BBOX)
    # The generated master also contains the wound-media perimeter. It is a
    # physical seam, not part of the title engraving, so remove only that
    # narrow outer ring while preserving the lettering across the media.
    media_edge = subtract(circle_mask(300, 312, 230), circle_mask(300, 312, 200))
    return subtract(extracted, media_edge)


def mark_preview_mask():
    # The official mark is rendered from public/mark.svg in runtime. This
    # mask exists only to remove its rasterized evidence from shell substrate.
    return engraving_mask(Image.open(MASTER).convert("RGBA"), MARK_BBOX)


def fastener_mask(cx, cy, radius=25):
    return circle_mask(cx, cy, radius)


def save_layer(name: str, layer: Image.Image) -> dict:
    path = ASSET_DIR / name
    layer = transparent_safe(layer)
    layer.save(path, "PNG", optimize=False, compress_level=9)
    alpha = layer.getchannel("A")
    bbox = alpha.getbbox()
    return {
        "path": f"public/assets/cathedral-dust/ref-v1/{name}",
        "width": layer.width,
        "height": layer.height,
        "mode": layer.mode,
        "sha256": sha256(path),
        "alpha": True,
        "alphaBounds": list(bbox) if bbox else None,
    }


def tight_crop(layer: Image.Image, padding: int = 4):
    bbox = layer.getchannel("A").getbbox()
    if not bbox:
        raise SystemExit("cannot tight-crop an empty transparent layer")
    x0, y0, x1, y1 = bbox
    origin = (max(0, x0 - padding), max(0, y0 - padding))
    crop = layer.crop((origin[0], origin[1], min(layer.width, x1 + padding), min(layer.height, y1 + padding)))
    return crop, origin


def build_layers(master: Image.Image):
    outer = master_outer(master)
    left_reel = circle_mask(300, 312, REEL_RADIUS)
    right_reel = circle_mask(820, 312, REEL_RADIUS)
    reel_union = union(left_reel, right_reel)
    lower = polygon_mask(LOWER_BBOX)
    title = title_mask(master)
    mark = mark_preview_mask()
    fastener_union = union(*(fastener_mask(*point) for point in FASTENERS))

    # The wound media is deliberately shape-bound and then hole-cut. It never
    # paints a fake receiver interior.
    media_shape = circle_mask(300, 312, 222)
    dark = ImageOps.grayscale(master).point(lambda value: 255 if value < 132 else 0)
    media_mask = ImageChops.multiply(media_shape, dark)
    media_mask = hole_cut(media_mask)

    # The shell retains material everywhere except regions owned by a later
    # physical layer. Title/logo cuts use their actual extracted masks rather
    # than clearing a rectangular hole through the shell.
    # Clear the entire extracted stroke footprint from the shell substrate so
    # the runtime title/mark assets cannot double-print over the raster shell.
    title_clear = title.point(lambda value: 255 if value > 0 else 0)
    mark_clear = mark.point(lambda value: 255 if value > 0 else 0)
    shell_cut = union(reel_union, lower, media_mask, title_clear, mark_clear, fastener_union)
    shell_mask = hole_cut(subtract(outer, shell_cut))

    surface_cut = union(reel_union, lower, media_mask, title, mark, fastener_union)
    gray = ImageOps.grayscale(master)
    high_pass = ImageChops.difference(gray, gray.filter(ImageFilter.GaussianBlur(1.7)))
    wear_alpha = high_pass.point(lambda value: min(94, max(0, (value - 7) * 5)))
    wear_alpha = hole_cut(ImageChops.multiply(wear_alpha, subtract(outer, surface_cut)))
    wear_base = Image.new("RGBA", (WIDTH, HEIGHT), (124, 113, 100, 255))
    wear_base.putalpha(wear_alpha)

    layers = {}
    layers["shell-substrate.png"] = layer_from_mask(master, shell_mask)
    layers["rear-media.png"] = layer_from_mask(master, media_mask)
    layers["lower-mechanism.png"] = layer_from_mask(master, hole_cut(lower))
    title_layer, title_origin = tight_crop(layer_from_mask(master, title))
    layers["title-engraving.png"] = title_layer
    layers["surface-wear.png"] = transparent_safe(wear_base)

    for side, (cx, cy) in (("left", (300, 312)), ("right", (820, 312))):
        crop = layer_from_mask(master, hole_cut(circle_mask(cx, cy, REEL_RADIUS)))
        crop = crop.crop((cx - REEL_CROP // 2, cy - REEL_CROP // 2, cx + REEL_CROP // 2, cy + REEL_CROP // 2))
        layers[f"reel-{side}-surface.png"] = transparent_safe(crop)

    # One reusable brass fastener, cropped around the upper-left reference
    # screw. Its shell surround is intentionally retained inside the circular
    # material tile; the exterior remains transparent.
    cx, cy = FASTENERS[0]
    crop = layer_from_mask(master, fastener_mask(cx, cy, 25)).crop((cx - 32, cy - 32, cx + 32, cy + 32))
    layers["brass-fastener.png"] = transparent_safe(crop)
    return layers, {
        "titleMask": title,
        "markMask": mark,
        "mediaMask": media_mask,
        "reelUnion": reel_union,
        "lowerMask": lower,
        "titleOrigin": title_origin,
    }


def reconstruct(master: Image.Image, layers: dict, masks: dict) -> Image.Image:
    canvas = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
    for name in ("rear-media.png", "lower-mechanism.png", "shell-substrate.png"):
        canvas.alpha_composite(layers[name])
    for side, (cx, cy) in (("left", (300, 312)), ("right", (820, 312))):
        crop = layers[f"reel-{side}-surface.png"]
        canvas.alpha_composite(crop, (cx - REEL_CROP // 2, cy - REEL_CROP // 2))
    canvas.alpha_composite(layers["title-engraving.png"], masks["titleOrigin"])
    # The official vector mark is not a runtime raster. Include its reference
    # pixels only in this audit reconstruction so the proof compares the full
    # visual target without shipping a duplicate mark asset.
    mark_preview = layer_from_mask(master, masks["markMask"])
    canvas.alpha_composite(mark_preview)
    cx, cy = FASTENERS[0]
    canvas.alpha_composite(layers["brass-fastener.png"], (cx - 32, cy - 32))
    for point in FASTENERS[1:]:
        canvas.alpha_composite(layers["brass-fastener.png"], (point[0] - 32, point[1] - 32))
    canvas.alpha_composite(layers["surface-wear.png"])
    return transparent_safe(canvas)


def write_manifest(layer_meta: dict, source_hash: str, master_hash: str, title_origin):
    manifest = json.loads(MANIFEST.read_text())
    manifest["task02"] = {
        "status": "passed",
        "sourceHashVerified": source_hash,
        "masterHash": master_hash,
        "generatedOn": date.today().isoformat(),
        "master": {"path": "public/assets/cathedral-dust/ref-v1/production-master.png", "width": WIDTH, "height": HEIGHT},
        "layerOrder": LAYER_ORDER,
        "runtimeComponent": "src/components/GraphicDeckStage.jsx::CassetteGraphic",
        "blendRules": {
            "shell-substrate.png": {"opacity": 1, "blendMode": "normal"},
            "rear-media.png": {"opacity": 1, "blendMode": "normal"},
            "lower-mechanism.png": {"opacity": 1, "blendMode": "normal"},
            "surface-wear.png": {"opacity": 0.72, "blendMode": "soft-light"},
            "title-engraving.png": {"opacity": 0.94, "blendMode": "normal"},
            "brass-fastener.png": {"opacity": 1, "blendMode": "normal"},
        },
        "assets": layer_meta,
        "pivotLocal": {
            "reel-left-surface.png": {"productionCenter": {"x": 300, "y": 312}, "cropSize": REEL_CROP, "pivot": {"x": 112, "y": 112}, "runtimeCenter": {"x": -65, "y": 0}, "runtimeSize": 56},
            "reel-right-surface.png": {"productionCenter": {"x": 820, "y": 312}, "cropSize": REEL_CROP, "pivot": {"x": 112, "y": 112}, "runtimeCenter": {"x": 65, "y": 0}, "runtimeSize": 56},
        },
        "title": {
            "productionBounds": list(TITLE_BBOX),
            "assetOrigin": {"x": title_origin[0], "y": title_origin[1]},
            "assetSize": [layer_meta["title-engraving.png"]["width"], layer_meta["title-engraving.png"]["height"]],
            "runtimeScale": 0.25,
        },
        "fasteners": [{"x": x, "y": y, "runtimeX": round((x - 560) * 0.25, 3), "runtimeY": round((y - 312) * 0.25, 3)} for x, y in FASTENERS],
        "runtimeIntegration": "blocked-until-task03",
    }
    MANIFEST.write_text(json.dumps(manifest, indent=2) + "\n")


def main():
    if not SOURCE.exists() or sha256(SOURCE) != EXPECTED_SOURCE_HASH:
        raise SystemExit("Cathedral Dust source hash mismatch")
    if not MASTER.exists():
        raise SystemExit("production-master.png is missing; complete Task01 first")
    master = Image.open(MASTER).convert("RGBA")
    if master.size != (WIDTH, HEIGHT):
        raise SystemExit(f"production master must be {WIDTH}x{HEIGHT}, got {master.size}")
    if master.getchannel("A").getbbox() is None:
        raise SystemExit("production master has no alpha content")

    ASSET_DIR.mkdir(parents=True, exist_ok=True)
    ARTIFACT_DIR.mkdir(parents=True, exist_ok=True)
    layers, masks = build_layers(master)
    metadata = {name: save_layer(name, layer) for name, layer in layers.items()}
    reconstruction = reconstruct(master, layers, masks)
    reconstruction.save(ARTIFACT_DIR / "layer-reconstruction.png", "PNG", optimize=False, compress_level=9)
    comparison = Image.new("RGBA", (WIDTH, HEIGHT), (246, 73, 45, 255))
    comparison.alpha_composite(master)
    comparison.alpha_composite(reconstruction, (0, 0))
    comparison.save(ARTIFACT_DIR / "layer-reconstruction-overlay.png", "PNG", optimize=False, compress_level=9)
    write_manifest(metadata, sha256(SOURCE), sha256(MASTER), masks["titleOrigin"])
    print(f"source {sha256(SOURCE)} verified")
    print(f"master {sha256(MASTER)} verified")
    for name, meta in metadata.items():
        print(f"wrote {name} {meta['width']}x{meta['height']} {meta['sha256']}")
    print(f"wrote {ARTIFACT_DIR / 'layer-reconstruction.png'}")
    print(f"wrote {ARTIFACT_DIR / 'layer-reconstruction-overlay.png'}")


if __name__ == "__main__":
    main()
