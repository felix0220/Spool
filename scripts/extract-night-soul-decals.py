#!/usr/bin/env python3
"""Extract the approved Night Soul print layers from the reference image.

The reference image is used as a source for selective printed matter only.
Dark field pixels touching a crop edge are made transparent with a flood fill,
so the runtime cassette can own its shell, holes, reels, and gradients.
"""

from collections import deque
from pathlib import Path

from PIL import Image, ImageDraw


ROOT = Path(__file__).resolve().parents[1]
SOURCE = Path("/private/tmp/night-soul-reference-crop.png")
OUTPUT = ROOT / "public/assets/night-soul/decals"


def luminance(pixel):
    red, green, blue = pixel[:3]
    return 0.2126 * red + 0.7152 * green + 0.0722 * blue


def is_reachable_background(pixel):
    red, green, blue = pixel[:3]
    lum = luminance(pixel)
    checker = abs(red - green) < 7 and abs(green - blue) < 7 and lum > 188
    navy = lum < 92 and blue >= red - 4
    return checker or navy


def remove_edge_background(image):
    rgb = image.convert("RGB")
    width, height = rgb.size
    pixels = rgb.load()
    reached = bytearray(width * height)
    queue = deque()

    def visit(x, y):
        index = y * width + x
        if reached[index] or not is_reachable_background(pixels[x, y]):
            return
        reached[index] = 1
        queue.append((x, y))

    for x in range(width):
        visit(x, 0)
        visit(x, height - 1)
    for y in range(height):
        visit(0, y)
        visit(width - 1, y)

    while queue:
        x, y = queue.popleft()
        for next_x, next_y in ((x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)):
            if 0 <= next_x < width and 0 <= next_y < height:
                visit(next_x, next_y)

    output = rgb.convert("RGBA")
    output_pixels = output.load()
    for y in range(height):
        for x in range(width):
            if reached[y * width + x]:
                red, green, blue, _ = output_pixels[x, y]
                output_pixels[x, y] = (red, green, blue, 0)
    return output


def save_decal(source, name, box):
    crop = source.crop(box)
    result = remove_edge_background(crop)
    result.save(OUTPUT / name, "PNG", optimize=True)


def save_bright_print(source, name, box, threshold):
    crop = source.crop(box).convert("RGBA")
    rgb = crop.convert("RGB")
    alpha = Image.new("L", crop.size, 0)
    alpha_pixels = alpha.load()
    for y in range(crop.height):
        for x in range(crop.width):
            if luminance(rgb.getpixel((x, y))) >= threshold:
                alpha_pixels[x, y] = 255
    crop.putalpha(alpha)
    crop.save(OUTPUT / name, "PNG", optimize=True)


def save_torn_strip(source, name, box, polygon):
    crop = source.crop(box).convert("RGBA")
    alpha = Image.new("L", crop.size, 0)
    ImageDraw.Draw(alpha).polygon(polygon, fill=255)
    crop.putalpha(alpha)
    crop.save(OUTPUT / name, "PNG", optimize=True)


def main():
    if not SOURCE.exists():
        raise SystemExit(f"Missing reference crop: {SOURCE}")
    OUTPUT.mkdir(parents=True, exist_ok=True)
    source = Image.open(SOURCE)
    save_bright_print(source, "night-title.png", (520, 84, 820, 208), 138)
    save_bright_print(source, "soul-script.png", (560, 188, 750, 258), 118)
    save_torn_strip(
        source,
        "lord-strip.png",
        (970, 170, 1280, 320),
        [(8, 14), (292, 77), (282, 144), (0, 67)],
    )
    save_torn_strip(
        source,
        "wait-on-you-strip.png",
        (800, 445, 1260, 635),
        [(27, 105), (428, 7), (457, 89), (76, 183)],
    )


if __name__ == "__main__":
    main()
