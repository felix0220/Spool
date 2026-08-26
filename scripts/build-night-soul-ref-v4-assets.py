#!/usr/bin/env python3
"""Build deterministic, transparent Night Soul ref-v4 raster layers.

The selected image is used as a source of printed ink and material character,
not as a full-body runtime image. Geometry remains code-owned.
"""

from __future__ import annotations

import colorsys
import hashlib
import json
import random
from pathlib import Path

from PIL import Image, ImageChops, ImageDraw, ImageFilter, ImageStat


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "artifacts/night-soul/ref-v4/night-soul-blue-reel-selected.png"
OUT = ROOT / "public/assets/night-soul/ref-v4"
PREVIEW = ROOT / "artifacts/night-soul/task-02"
EXPECTED_SHA256 = "726696f70fb812e472c8f17a3314044dfa69f1cb45716716f8a7ecd4a6f3eb66"


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def clamp(value: float, low: float = 0, high: float = 255) -> int:
    return int(max(low, min(high, value)))


def clear_zero_rgb(image: Image.Image) -> Image.Image:
    image = image.convert("RGBA")
    pixels = image.load()
    for y in range(image.height):
        for x in range(image.width):
            r, g, b, a = pixels[x, y]
            if a == 0:
                pixels[x, y] = (0, 0, 0, 0)
    return image


def rounded_mask(size: tuple[int, int], box: tuple[int, int, int, int], radius: int) -> Image.Image:
    mask = Image.new("L", size, 0)
    ImageDraw.Draw(mask).rounded_rectangle(box, radius=radius, fill=255)
    return mask


def face_exclusion_mask(size: int) -> Image.Image:
    """Mask the true hole and the three reference apertures from print extraction."""
    mask = Image.new("L", (size, size), 0)
    draw = ImageDraw.Draw(mask)
    cx = cy = size // 2
    draw.ellipse((cx - 66, cy - 66, cx + 66, cy + 66), fill=255)
    # The source reels use two upper diagonal apertures and one lower aperture.
    # These are intentionally over-excluded: the physical cutouts are rebuilt by
    # code and must never leak into a printed-ink PNG.
    for ox, oy, half_w, half_h in ((-104, -66, 67, 60), (104, -66, 67, 60), (0, 101, 67, 58)):
        draw.rounded_rectangle((cx + ox - half_w, cy + oy - half_h, cx + ox + half_w, cy + oy + half_h), radius=34, fill=255)
    # Source hardware marks are not printed ink.
    for ox, oy, radius in ((0, -112, 20), (-70, 58, 18), (70, 58, 18)):
        draw.ellipse((cx + ox - radius, cy + oy - radius, cx + ox + radius, cy + oy + radius), fill=255)
    return mask


def extract_reel_print(source: Image.Image, center: tuple[int, int]) -> Image.Image:
    # The selected plate is approximately 540 px across. The output is pivot-local
    # and deliberately contains only ink alpha, never the ivory face itself.
    cx, cy = center
    crop_size = 540
    crop = source.crop((cx - crop_size // 2, cy - crop_size // 2, cx + crop_size // 2, cy + crop_size // 2)).resize((400, 400), Image.Resampling.LANCZOS)
    exclusion = face_exclusion_mask(400)
    pixels = crop.load()
    ex = exclusion.load()
    output = Image.new("RGBA", (400, 400), (0, 0, 0, 0))
    out = output.load()
    for y in range(400):
        for x in range(400):
            dx = x - 200
            dy = y - 200
            radius = (dx * dx + dy * dy) ** 0.5
            if radius > 181 or radius < 100 or ex[x, y]:
                continue
            r, g, b = pixels[x, y]
            # Blue ink is darker and more cobalt than the warm ivory substrate.
            cobalt = max(0, b - r - 10) * 2.8 + max(0, b - g - 2) * 1.4
            saturation = max(0, b - (r + g) / 2) * 1.1
            alpha = clamp(cobalt + saturation)
            if alpha < 12:
                continue
            ink = (clamp(r * .32), clamp(g * .40), clamp(b * .92), clamp(alpha * .92))
            out[x, y] = ink
    # Keep the extraction slightly dry rather than vector-clean.
    alpha = output.getchannel("A").filter(ImageFilter.GaussianBlur(0.35))
    output.putalpha(alpha)
    return clear_zero_rgb(output)


def seeded_noise(size: tuple[int, int], seed: int, low: int = 0, high: int = 255) -> Image.Image:
    rng = random.Random(seed)
    image = Image.new("L", size, 0)
    px = image.load()
    for y in range(size[1]):
        for x in range(size[0]):
            px[x, y] = rng.randint(low, high)
    return image


def soft_noise(size: tuple[int, int], seed: int) -> Image.Image:
    coarse = seeded_noise((max(8, size[0] // 14), max(8, size[1] // 14)), seed, 0, 255)
    return coarse.resize(size, Image.Resampling.BICUBIC).filter(ImageFilter.GaussianBlur(5))


def make_face_grain(seed: int) -> Image.Image:
    noise = seeded_noise((128, 128), seed, 112, 166).filter(ImageFilter.GaussianBlur(.35))
    output = Image.new("RGBA", (128, 128), (245, 242, 232, 0))
    output.putalpha(noise.point(lambda value: max(0, value - 106)))
    return clear_zero_rgb(output)


def body_mask(size: tuple[int, int], inset: int = 16) -> Image.Image:
    return rounded_mask(size, (inset, inset, size[0] - inset - 1, size[1] - inset - 1), 42)


def make_fog(seed: int) -> Image.Image:
    size = (1120, 624)
    field = soft_noise(size, seed)
    alpha = Image.new("L", size, 0)
    ap = alpha.load()
    fp = field.load()
    for y in range(size[1]):
        for x in range(size[0]):
            edge = min(x, y, size[0] - 1 - x, size[1] - 1 - y)
            edge_fade = min(1.0, max(0.0, edge / 58.0))
            corner_haze = max(0.0, 1.0 - ((x - 840) ** 2 / 320000 + (y - 100) ** 2 / 52000))
            left_haze = max(0.0, 1.0 - ((x - 200) ** 2 / 290000 + (y - 110) ** 2 / 42000))
            value = (fp[x, y] - 105) * .24 + (corner_haze + left_haze) * 26
            ap[x, y] = clamp(value * edge_fade, 0, 54)
    output = Image.new("RGBA", size, (202, 229, 255, 0))
    output.putalpha(alpha.filter(ImageFilter.GaussianBlur(7)))
    return clear_zero_rgb(output)


def make_glow(seed: int) -> Image.Image:
    size = (1120, 624)
    field = soft_noise(size, seed)
    alpha = Image.new("L", size, 0)
    ap = alpha.load()
    fp = field.load()
    for y in range(size[1]):
        for x in range(size[0]):
            beam = max(0.0, 1.0 - ((x - 560) ** 2 / 100000 + (y - 300) ** 2 / 250000))
            lower = max(0.0, 1.0 - ((x - 560) ** 2 / 250000 + (y - 470) ** 2 / 30000))
            value = (fp[x, y] - 72) * .42 + beam * 92 + lower * 28
            ap[x, y] = clamp(value, 0, 105)
    output = Image.new("RGBA", size, (26, 104, 255, 0))
    output.putalpha(alpha.filter(ImageFilter.GaussianBlur(10)))
    return clear_zero_rgb(output)


def make_edge_wear(seed: int) -> Image.Image:
    size = (1120, 624)
    output = Image.new("RGBA", size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(output)
    rng = random.Random(seed)
    pale = (225, 243, 255, 0)
    for _ in range(150):
        side = rng.choice(("top", "bottom", "left", "right"))
        if side in ("top", "bottom"):
            x = rng.randint(18, size[0] - 18)
            y = rng.randint(18, 58) if side == "top" else rng.randint(size[1] - 58, size[1] - 18)
            length = rng.randint(3, 38)
            points = [(x, y), (x + length, y + rng.randint(-3, 3))]
        else:
            x = rng.randint(18, 58) if side == "left" else rng.randint(size[0] - 58, size[0] - 18)
            y = rng.randint(18, size[1] - 18)
            length = rng.randint(3, 30)
            points = [(x, y), (x + rng.randint(-3, 3), y + length)]
        draw.line(points, fill=(pale[0], pale[1], pale[2], rng.randint(15, 78)), width=rng.choice((1, 1, 2)))
    # A few scuffed translucent patches, kept on the perimeter only.
    for _ in range(32):
        x = rng.choice((rng.randint(18, 90), rng.randint(size[0] - 90, size[0] - 18)))
        y = rng.randint(28, size[1] - 28)
        draw.ellipse((x, y, x + rng.randint(4, 18), y + rng.randint(2, 8)), fill=(245, 248, 255, rng.randint(8, 25)))
    output.putalpha(ImageChops.multiply(output.getchannel("A"), body_mask(size, 4)))
    return clear_zero_rgb(output)


def make_surface_grain(seed: int) -> Image.Image:
    noise = seeded_noise((64, 64), seed, 100, 188)
    output = Image.new("RGBA", (64, 64), (255, 255, 255, 0))
    output.putalpha(noise.point(lambda value: clamp((value - 96) * .22, 5, 22)))
    return clear_zero_rgb(output)


def save_asset(image: Image.Image, name: str) -> dict:
    image = clear_zero_rgb(image)
    path = OUT / name
    image.save(path, optimize=False)
    alpha = image.getchannel("A")
    extrema = alpha.getextrema()
    nonzero = sum(1 for value in alpha.getdata() if value)
    return {"file": name, "size": list(image.size), "mode": image.mode, "sha256": sha256(path), "alphaExtrema": list(extrema), "nonzeroAlphaPixels": nonzero}


def composite_checkerboard(image: Image.Image, background: tuple[int, int, int]) -> Image.Image:
    base = Image.new("RGBA", image.size, (*background, 255))
    return Image.alpha_composite(base, image).convert("RGB")


def main() -> None:
    actual = sha256(SOURCE)
    if actual != EXPECTED_SHA256:
        raise SystemExit(f"source hash mismatch: {actual}")
    OUT.mkdir(parents=True, exist_ok=True)
    PREVIEW.mkdir(parents=True, exist_ok=True)
    source = Image.open(SOURCE).convert("RGB")

    assets = [
        ("left-reel-print.png", extract_reel_print(source, (432, 484))),
        ("right-reel-print.png", extract_reel_print(source, (984, 484))),
        ("reel-face-grain.png", make_face_grain(0x4E494748)),
        ("shell-fog-overlay.png", make_fog(0x464F47)),
        ("shell-edge-wear.png", make_edge_wear(0x57454152)),
        ("electric-glow-texture.png", make_glow(0x424C5545)),
        ("surface-grain.png", make_surface_grain(0x47524149)),
    ]
    manifest_assets = [save_asset(image, name) for name, image in assets]

    reused = []
    for rel in ("lord-strip.png", "wait-on-you-strip.png", "print-distress-mask.png"):
        path = ROOT / "public/assets/night-soul/ref-v2" / rel
        reused.append({"file": f"../ref-v2/{rel}", "size": list(Image.open(path).size), "sha256": sha256(path)})

    manifest = {
        "version": "ref-v4",
        "source": {"file": str(SOURCE.relative_to(ROOT)), "size": list(source.size), "sha256": actual},
        "master": {"size": [1120, 624], "runtimeScale": 4, "runtimeFootprint": [280, 156]},
        "geometry": {
            "bodyClip": [-140, -78, 280, 156, 11],
            "reelCenters": [[-65, 0], [65, 0]],
            "reelFaceRadius": 50,
            "reelHoleRadius": 20,
            "guideCenters": [[-94, 49], [94, 49]],
            "guideOuterRadius": 13,
            "centreLock": [0, 50, 7],
            "printPivots": {"left": [200, 200], "right": [200, 200]},
        },
        "assets": manifest_assets,
        "reusedTransparentAssets": reused,
        "renderOrder": [
            "rear-media",
            "lower-mechanical-substrate",
            "translucent-shell-field",
            "electric-glow-texture",
            "shell-fog-overlay",
            "molded-seams",
            "functional-reel-face",
            "lower-guide-hardware",
            "shell-edge-wear",
            "lord-strip",
            "wait-on-you-strip",
            "surface-grain",
        ],
        "extraction": {
            "reelPrints": "cobalt ink segmentation inside the face plate with true hole and aperture exclusion masks",
            "materialLayers": "deterministic seeded alpha-only texture generation; no text, chassis, plate or coral pixels",
            "zeroAlphaRgb": "cleared to 0,0,0 for every output",
        },
    }
    (OUT / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")

    # Four-background proof for every new transparent asset.
    backgrounds = [(250, 250, 250), (7, 14, 28), (15, 62, 150), (236, 77, 45)]
    for name, image in assets:
        if image.width > 256:
            preview = image.resize((min(560, image.width), round(image.height * min(560, image.width) / image.width)), Image.Resampling.LANCZOS)
        else:
            preview = image.resize((256, 256), Image.Resampling.NEAREST)
        sheet = Image.new("RGB", (preview.width * 2, preview.height * 2), (0, 0, 0))
        for index, background in enumerate(backgrounds):
            sheet.paste(composite_checkerboard(preview, background), ((index % 2) * preview.width, (index // 2) * preview.height))
        sheet.save(PREVIEW / name)

    print(json.dumps({"sourceSha256": actual, "assets": [a["file"] for a in manifest_assets]}, indent=2))


if __name__ == "__main__":
    main()
