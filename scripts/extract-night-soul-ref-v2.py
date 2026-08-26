#!/usr/bin/env python3
"""Build clean, selective Night Soul ref-v2 layers.

The reference is a visual source, not a runtime cassette body. This script
exports only printed identity, torn tape, fog, and wear texture. Mechanical
geometry and transparent reel holes remain owned by GraphicDeckStage.
"""

from pathlib import Path
import random

from PIL import Image, ImageDraw, ImageFilter


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "public/assets/night-soul/reference/night-soul-ref-v2.jpg"
OUTPUT = ROOT / "public/assets/night-soul/ref-v2"


def luminance(pixel):
    red, green, blue = pixel[:3]
    return 0.2126 * red + 0.7152 * green + 0.0722 * blue


def clear_transparent_rgb(image):
    """Make transparent pixels genuinely empty, not hidden source fragments."""
    pixels = image.load()
    for y in range(image.height):
        for x in range(image.width):
            if pixels[x, y][3] == 0:
                pixels[x, y] = (0, 0, 0, 0)
    return image


def save_bright_print(source, name, box, threshold, gain=5):
    crop = source.crop(box).convert("RGB")
    alpha = Image.new("L", crop.size, 0)
    alpha_pixels = alpha.load()
    output = Image.new("RGBA", crop.size, (0, 0, 0, 0))
    output_pixels = output.load()
    for y in range(crop.height):
        for x in range(crop.width):
            value = luminance(crop.getpixel((x, y)))
            opacity = max(0, min(255, int((value - threshold) * gain)))
            alpha_pixels[x, y] = opacity
            if opacity:
                output_pixels[x, y] = (241, 238, 226, opacity)
    clear_transparent_rgb(output).save(OUTPUT / name, "PNG", optimize=True)


def save_torn_strip(source, name, box, polygon, erase_ellipses=(), erase_polygons=()):
    crop = source.crop(box).convert("RGBA")
    alpha = Image.new("L", crop.size, 0)
    drawer = ImageDraw.Draw(alpha)
    drawer.polygon(polygon, fill=255)
    for ellipse in erase_ellipses:
        drawer.ellipse(ellipse, fill=0)
    for erase_polygon in erase_polygons:
        drawer.polygon(erase_polygon, fill=0)
    alpha_pixels = alpha.load()
    source_pixels = crop.load()
    for y in range(crop.height):
        for x in range(crop.width):
            red, green, blue, _ = source_pixels[x, y]
            blue_background = (
                blue > 42
                and blue > red * 1.28
                and blue > green * 1.10
            )
            if blue_background:
                alpha_pixels[x, y] = 0
    crop.putalpha(alpha)
    clear_transparent_rgb(crop).save(OUTPUT / name, "PNG", optimize=True)


def save_mist(source, name, box):
    crop = source.crop(box).convert("RGB")
    blurred = crop.filter(ImageFilter.GaussianBlur(radius=13))
    rgba = Image.new("RGBA", crop.size, (0, 0, 0, 0))
    output = rgba.load()
    source_pixels = crop.load()
    blur_pixels = blurred.load()
    for y in range(crop.height):
        for x in range(crop.width):
            current = luminance(source_pixels[x, y])
            base = luminance(blur_pixels[x, y])
            lift = max(0, current - base - 1)
            alpha = max(0, min(92, int(lift * 3.4)))
            output[x, y] = (190, 210, 250, alpha)
    clear_transparent_rgb(rgba).save(OUTPUT / name, "PNG", optimize=True)


def save_edge_wear(source, name, body_box, margin=26):
    crop = source.crop(body_box).convert("RGB")
    width, height = crop.size
    rgba = Image.new("RGBA", crop.size, (0, 0, 0, 0))
    output = rgba.load()
    pixels = crop.load()
    for y in range(height):
        for x in range(width):
            edge_distance = min(x, y, width - 1 - x, height - 1 - y)
            if edge_distance > margin:
                continue
            value = luminance(pixels[x, y])
            scuff = max(0, value - 92)
            alpha = max(0, min(90, int(scuff * 1.7)))
            if alpha:
                output[x, y] = (236, 241, 249, alpha)
    clear_transparent_rgb(rgba).save(OUTPUT / name, "PNG", optimize=True)


def save_lower_wear(source, name, box):
    crop = source.crop(box).convert("RGB")
    rgba = Image.new("RGBA", crop.size, (0, 0, 0, 0))
    output = rgba.load()
    pixels = crop.load()
    width, height = crop.size
    for y in range(crop.height):
        for x in range(crop.width):
            # Only retain the lower panel's outside abrasion. Internal
            # guides, screws and the centre lock are reconstructed as SVG.
            if min(x, y, width - 1 - x, height - 1 - y) > 11:
                continue
            value = luminance(pixels[x, y])
            alpha = max(0, min(28, int(max(0, value - 118) * .42)))
            if alpha:
                output[x, y] = (193, 216, 255, alpha)
    clear_transparent_rgb(rgba).save(OUTPUT / name, "PNG", optimize=True)


def save_print_distress_mask(name, size=64):
    """One fixed physical grain for every printed word, independent of type size."""
    rng = random.Random(20260825)
    mask = Image.new("L", (size, size), 255)
    draw = ImageDraw.Draw(mask)
    for _ in range(46):
        x = rng.randrange(size)
        y = rng.randrange(size)
        radius = rng.choice((1, 1, 1, 2))
        value = rng.choice((0, 18, 38, 64))
        draw.ellipse((x - radius, y - radius, x + radius, y + radius), fill=value)
    for _ in range(24):
        x = rng.randrange(size)
        y = rng.randrange(size)
        draw.rectangle((x, y, min(size - 1, x + rng.choice((1, 2, 3))), y), fill=rng.choice((0, 32, 78)))
    mask.save(OUTPUT / name, "PNG", optimize=True)


def save_global_grain(name, size=64):
    """Low-alpha monochrome surface grain shared by the whole cassette."""
    rng = random.Random(20260826)
    grain = Image.new("RGBA", (size, size), (224, 230, 242, 0))
    pixels = grain.load()
    for y in range(size):
        for x in range(size):
            alpha = rng.randrange(7, 18)
            pixels[x, y] = (224, 230, 242, alpha)
    grain.save(OUTPUT / name, "PNG", optimize=True)


def save_soft_focus_texture(name, size=(256, 96)):
    """Cloudy blue-violet material texture with a fine photographic grain."""
    width, height = size
    rng = random.Random(20260827)
    cloud = Image.new("L", size, 0)
    cloud_draw = ImageDraw.Draw(cloud)
    for _ in range(18):
        cx = rng.randrange(-40, width + 40)
        cy = rng.randrange(-30, height + 30)
        rx = rng.randrange(18, 76)
        ry = rng.randrange(14, 52)
        cloud_draw.ellipse((cx - rx, cy - ry, cx + rx, cy + ry), fill=rng.randrange(70, 220))
    cloud = cloud.filter(ImageFilter.GaussianBlur(radius=15))
    cloud_pixels = cloud.load()
    output = Image.new("RGBA", size, (0, 0, 0, 0))
    pixels = output.load()
    for y in range(height):
        for x in range(width):
            field = cloud_pixels[x, y]
            fine = rng.randrange(-18, 19)
            alpha = max(0, min(88, int(10 + field * .28 + fine)))
            if alpha:
                pixels[x, y] = (156 + min(38, field // 8), 180 + min(34, field // 8), 230, alpha)
    output.save(OUTPUT / name, "PNG", optimize=True)


def main():
    if not SOURCE.exists():
        raise SystemExit(f"Missing ref-v2 source: {SOURCE}")
    OUTPUT.mkdir(parents=True, exist_ok=True)
    source = Image.open(SOURCE)

    # Source body is approximately x=14..1266, y=13..704 in the supplied ref.
    save_bright_print(source, "night-title.png", (480, 70, 780, 185), 120, gain=7)
    save_bright_print(source, "soul-script.png", (555, 170, 720, 230), 112, gain=5)
    save_bright_print(source, "edition-02.png", (105, 93, 180, 140), 132, gain=6)
    save_bright_print(source, "side-b.png", (105, 174, 280, 225), 132, gain=6)
    save_bright_print(source, "stereo.png", (1000, 93, 1180, 140), 132, gain=6)
    save_torn_strip(
        source,
        "lord-strip.png",
        (940, 130, 1240, 265),
        [(5, 18), (285, 58), (272, 121), (0, 73)],
    )
    save_torn_strip(
        source,
        "wait-on-you-strip.png",
        (790, 370, 1240, 555),
        [(10, 41), (438, 4), (440, 86), (58, 184)],
        erase_ellipses=((86, -54, 204, 64), (282, 144, 392, 254)),
        erase_polygons=(
            ((0, 0), (245, 0), (245, 42), (230, 47), (215, 52), (200, 57), (180, 64), (155, 70), (130, 74), (0, 74)),
        ),
    )
    save_mist(source, "mist-overlay.png", (255, 58, 455, 235))
    save_mist(source, "mist-right-overlay.png", (1000, 60, 1240, 250))
    save_edge_wear(source, "edge-wear-overlay.png", (14, 13, 1266, 704))
    # Start below the torn strip and keep this layer to local abrasion only;
    # the lower guides and centre lock remain real SVG hardware.
    save_lower_wear(source, "lower-mechanism-wear.png", (40, 650, 1240, 700))
    save_print_distress_mask("print-distress-mask.png")
    save_global_grain("global-grain.png")
    save_soft_focus_texture("soft-focus-texture.png")


if __name__ == "__main__":
    main()
