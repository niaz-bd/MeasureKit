"""Generate MeasureKit launcher / adaptive / favicon assets."""
from __future__ import annotations

import math
from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "assets"
SIZE = 1024
SAFE = 0.66  # Android adaptive safe zone fraction
BG = (27, 34, 42, 255)  # #1B222A
TEAL = (45, 212, 191, 255)  # #2DD4BF
TEAL_DARK = (15, 148, 136, 255)  # #0F9488
WHITE = (255, 255, 255, 255)


def round_line(draw: ImageDraw.ImageDraw, a, b, width: int, fill):
    draw.line([a, b], fill=fill, width=width)
    r = width // 2
    for p in (a, b):
        draw.ellipse((p[0] - r, p[1] - r, p[0] + r, p[1] + r), fill=fill)


def draw_mark(draw: ImageDraw.ImageDraw, cx: float, cy: float, scale: float, fill, fill_dark=None):
    """Drafting caliper + short ruler — sits in adaptive safe zone."""
    s = scale
    # Pivot
    pivot = (cx, cy - 0.22 * s)
    left_tip = (cx - 0.28 * s, cy + 0.18 * s)
    right_tip = (cx + 0.28 * s, cy + 0.18 * s)
    arm_w = max(18, int(0.07 * s))

    # Arms (dark underlay for slight depth)
    if fill_dark is not None:
        round_line(draw, pivot, left_tip, arm_w + 6, fill_dark)
        round_line(draw, pivot, right_tip, arm_w + 6, fill_dark)

    round_line(draw, pivot, left_tip, arm_w, fill)
    round_line(draw, pivot, right_tip, arm_w, fill)

    # Pivot joint
    pr = max(14, int(0.055 * s))
    draw.ellipse(
        (pivot[0] - pr, pivot[1] - pr, pivot[0] + pr, pivot[1] + pr),
        fill=fill,
    )
    inner = max(5, int(pr * 0.35))
    hole = BG if fill != WHITE else (0, 0, 0, 0)
    # For transparent fg, punch with clear; for solid icons use BG
    if fill == WHITE:
        draw.ellipse(
            (pivot[0] - inner, pivot[1] - inner, pivot[0] + inner, pivot[1] + inner),
            fill=(0, 0, 0, 0),
        )
    else:
        draw.ellipse(
            (pivot[0] - inner, pivot[1] - inner, pivot[0] + inner, pivot[1] + inner),
            fill=BG if fill_dark is not None else (0, 0, 0, 0),
        )

    # Ruler bar under tips
    y = cy + 0.30 * s
    x0, x1 = cx - 0.30 * s, cx + 0.30 * s
    bar_h = max(10, int(0.035 * s))
    draw.rounded_rectangle(
        (x0, y - bar_h / 2, x1, y + bar_h / 2),
        radius=bar_h // 2,
        fill=fill,
    )
    # Tick marks
    tick_h = max(16, int(0.07 * s))
    tick_w = max(4, int(0.012 * s))
    for t in (-0.22, -0.11, 0.0, 0.11, 0.22):
        tx = cx + t * s
        draw.rectangle(
            (tx - tick_w / 2, y - tick_h, tx + tick_w / 2, y - bar_h / 2),
            fill=fill,
        )


def make_background() -> Image.Image:
    im = Image.new("RGBA", (SIZE, SIZE), BG)
    draw = ImageDraw.Draw(im)
    # Very subtle technical grid
    grid = (36, 44, 54, 255)
    step = 64
    for x in range(0, SIZE + 1, step):
        draw.line([(x, 0), (x, SIZE)], fill=grid, width=1)
    for y in range(0, SIZE + 1, step):
        draw.line([(0, y), (SIZE, y)], fill=grid, width=1)
    return im


def make_icon() -> Image.Image:
    im = make_background()
    draw = ImageDraw.Draw(im)
    draw_mark(draw, SIZE / 2, SIZE / 2, SIZE * SAFE, TEAL, TEAL_DARK)
    return im


def make_foreground() -> Image.Image:
    im = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    draw = ImageDraw.Draw(im)
    # Draw onto temporary, then recolor hole carefully
    # Use solid teal without dark underlay for clean silhouette
    s = SIZE * SAFE
    cx = cy = SIZE / 2
    pivot = (cx, cy - 0.22 * s)
    left_tip = (cx - 0.28 * s, cy + 0.18 * s)
    right_tip = (cx + 0.28 * s, cy + 0.18 * s)
    arm_w = max(18, int(0.07 * s))
    round_line(draw, pivot, left_tip, arm_w, TEAL)
    round_line(draw, pivot, right_tip, arm_w, TEAL)
    pr = max(14, int(0.055 * s))
    draw.ellipse(
        (pivot[0] - pr, pivot[1] - pr, pivot[0] + pr, pivot[1] + pr),
        fill=TEAL,
    )
    # Clear pivot hole
    inner = max(5, int(pr * 0.35))
    draw.ellipse(
        (pivot[0] - inner, pivot[1] - inner, pivot[0] + inner, pivot[1] + inner),
        fill=(0, 0, 0, 0),
    )
    y = cy + 0.30 * s
    x0, x1 = cx - 0.30 * s, cx + 0.30 * s
    bar_h = max(10, int(0.035 * s))
    draw.rounded_rectangle(
        (x0, y - bar_h / 2, x1, y + bar_h / 2),
        radius=bar_h // 2,
        fill=TEAL,
    )
    tick_h = max(16, int(0.07 * s))
    tick_w = max(4, int(0.012 * s))
    for t in (-0.22, -0.11, 0.0, 0.11, 0.22):
        tx = cx + t * s
        draw.rectangle(
            (tx - tick_w / 2, y - tick_h, tx + tick_w / 2, y - bar_h / 2),
            fill=TEAL,
        )
    return im


def make_monochrome() -> Image.Image:
    fg = make_foreground()
    # Replace non-transparent pixels with white
    px = fg.load()
    for y in range(SIZE):
        for x in range(SIZE):
            r, g, b, a = px[x, y]
            if a > 16:
                px[x, y] = (255, 255, 255, a)
            else:
                px[x, y] = (0, 0, 0, 0)
    return fg


def make_favicon(icon: Image.Image) -> Image.Image:
    return icon.resize((48, 48), Image.Resampling.LANCZOS)


def main():
    ASSETS.mkdir(parents=True, exist_ok=True)
    icon = make_icon()
    fg = make_foreground()
    bg = make_background()
    mono = make_monochrome()
    fav = make_favicon(icon)
    splash = icon.resize((200, 200), Image.Resampling.LANCZOS)

    icon.save(ASSETS / "icon.png", "PNG", optimize=True)
    fg.save(ASSETS / "android-icon-foreground.png", "PNG", optimize=True)
    bg.save(ASSETS / "android-icon-background.png", "PNG", optimize=True)
    mono.save(ASSETS / "android-icon-monochrome.png", "PNG", optimize=True)
    fav.save(ASSETS / "favicon.png", "PNG", optimize=True)
    splash.save(ASSETS / "splash-icon.png", "PNG", optimize=True)

    for name in (
        "icon.png",
        "android-icon-foreground.png",
        "android-icon-background.png",
        "android-icon-monochrome.png",
        "favicon.png",
        "splash-icon.png",
    ):
        p = ASSETS / name
        print(f"{p} {p.stat().st_size} bytes {Image.open(p).size} {Image.open(p).mode}")


if __name__ == "__main__":
    main()
