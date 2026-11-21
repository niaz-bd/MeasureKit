"""Rasterize MeasureKit icons into Android mipmap-* webp resources."""
from __future__ import annotations

import sys
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "assets"

# Adaptive icon layers are 108dp; legacy launcher icons are 48dp.
DENSITIES = {
    "mipmap-mdpi": (48, 108),
    "mipmap-hdpi": (72, 162),
    "mipmap-xhdpi": (96, 216),
    "mipmap-xxhdpi": (144, 324),
    "mipmap-xxxhdpi": (192, 432),
}


def save_webp(im: Image.Image, path: Path):
    path.parent.mkdir(parents=True, exist_ok=True)
    im.save(path, "WEBP", quality=90, method=6)


def main(android_res: Path):
    icon = Image.open(ASSETS / "icon.png").convert("RGBA")
    fg = Image.open(ASSETS / "android-icon-foreground.png").convert("RGBA")
    bg = Image.open(ASSETS / "android-icon-background.png").convert("RGBA")
    mono = Image.open(ASSETS / "android-icon-monochrome.png").convert("RGBA")

    for folder, (legacy, adaptive) in DENSITIES.items():
        out = android_res / folder
        save_webp(icon.resize((legacy, legacy), Image.Resampling.LANCZOS), out / "ic_launcher.webp")
        save_webp(icon.resize((legacy, legacy), Image.Resampling.LANCZOS), out / "ic_launcher_round.webp")
        save_webp(fg.resize((adaptive, adaptive), Image.Resampling.LANCZOS), out / "ic_launcher_foreground.webp")
        save_webp(bg.resize((adaptive, adaptive), Image.Resampling.LANCZOS), out / "ic_launcher_background.webp")
        save_webp(mono.resize((adaptive, adaptive), Image.Resampling.LANCZOS), out / "ic_launcher_monochrome.webp")
        print(f"wrote {out}")


if __name__ == "__main__":
    targets = sys.argv[1:] or [
        str(ROOT / "android" / "app" / "src" / "main" / "res"),
        r"F:\m\android\app\src\main\res",
    ]
    for t in targets:
        p = Path(t)
        if p.exists():
            main(p)
        else:
            print(f"skip missing {p}")
