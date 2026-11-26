"""MyBot: make every logo and app icon from one square image.

Usage (from the repository root, Python 3 with Pillow):

    python scripts/mybot-logo.py <image>

The image should be square, at least 1024 x 1024 (1600 x 1600 is best), PNG or JPEG. A non-square
image is cropped to its top-left square. The script writes:

- build/icon-{production,dev,preview}.png and .ico, build/icon.ico, build/icon-production.icns,
  build/icon-*-macos-safe-area.png and every file in build/logo-colors/ (rounded corners)
- packages/brand/src/mybot-logo-image.ts (the AppLogo image, 256 px WebP as a data URL)
- packages/ui/src/assets/mybot-logo.png (the rail logo, 128 px)
"""

import base64
import glob
import io
import sys
from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent.parent
BUILD = ROOT / "build"
CORNER = 0.2075  # The corner radius of the old drawn logo, as a share of its size.
ICO_SIZES = [(16, 16), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)]


def rounded(square: Image.Image, size: int) -> Image.Image:
    art = square.resize((size, size), Image.LANCZOS).convert("RGBA")
    mask = Image.new("L", (size * 4, size * 4), 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, size * 4 - 1, size * 4 - 1), radius=int(size * 4 * CORNER), fill=255)
    art.putalpha(mask.resize((size, size), Image.LANCZOS))
    return art


def main() -> None:
    if len(sys.argv) != 2:
        sys.exit("Usage: python scripts/mybot-logo.py <image>")
    source = Image.open(sys.argv[1]).convert("RGB")
    side = min(source.size)
    if side < 1024:
        print(f"Warning: the image is {side} px; icons above that size are upscaled.")
    square = source.crop((0, 0, side, side))

    full = rounded(square, 1600)
    inner = rounded(square, 1288)
    safe = Image.new("RGBA", (1600, 1600), (0, 0, 0, 0))
    safe.paste(inner, (156, 156), inner)
    for variant in ("production", "dev", "preview"):
        full.save(BUILD / f"icon-{variant}.png")
        safe.save(BUILD / f"icon-{variant}-macos-safe-area.png")
        full.save(BUILD / f"icon-{variant}.ico", sizes=ICO_SIZES)
    full.save(BUILD / "icon.ico", sizes=[(256, 256)])
    safe.save(BUILD / "icon-production.icns")
    for path in glob.glob(str(BUILD / "logo-colors" / "icon-*.png")):
        (safe if path.endswith("-macos-safe-area.png") else full).save(path)

    buffer = io.BytesIO()
    square.resize((256, 256), Image.LANCZOS).save(buffer, "WEBP", quality=90)
    data = base64.b64encode(buffer.getvalue()).decode()
    (ROOT / "packages/brand/src/mybot-logo-image.ts").write_text(
        "// MyBot: the MyBot logo (256 x 256 WebP), inlined so the brand package needs no asset loader\n"
        "// and the logo also renders when an AppLogo SVG is drawn onto a canvas.\n"
        "// Made by scripts/mybot-logo.py; do not edit by hand.\n"
        f'export const MYBOT_LOGO_IMAGE =\n  "data:image/webp;base64,{data}";\n',
        encoding="utf-8",
        newline="\n",
    )
    square.resize((128, 128), Image.LANCZOS).save(ROOT / "packages/ui/src/assets/mybot-logo.png", optimize=True)
    print("Done. Rebuild the installer to see the new exe and installer icons.")


if __name__ == "__main__":
    main()
