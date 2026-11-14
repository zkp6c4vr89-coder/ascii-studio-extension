"""Build the ASCII Studio browser extension for every store.

  python3 extension/build.py

Makes:
  extension/build/chrome/    load this folder unpacked to test (Chrome, Edge, Brave)
  extension/build/firefox/   load via about:debugging to test
  extension/dist/ascii-studio-chrome-<version>.zip    upload to Chrome Web Store & Edge Add-ons
  extension/dist/ascii-studio-firefox-<version>.zip   upload to addons.mozilla.org

The studio page is the website (web/) itself, so improvements there land here too.
Needs Pillow only for drawing the icons (already in the project's .venv).
"""

import json
import shutil
import zipfile
from pathlib import Path

HERE = Path(__file__).resolve().parent
WEB = HERE / "web"   # copy of the website (refresh with sync_web.py)
# Firefox needs a permanent ID. Keep this one forever once you publish.
FIREFOX_ID = "{6f0d3c39-5a4e-4b8e-9d41-2a7f3e0b8c15}"


def make_icons(folder: Path) -> None:
    from PIL import Image, ImageDraw, ImageFont

    big = 512
    img = Image.new("RGBA", (big, big), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    d.rounded_rectangle((0, 0, big - 1, big - 1), radius=110, fill=(11, 11, 14, 255))
    font = ImageFont.truetype("/System/Library/Fonts/Menlo.ttc", 380, index=1)  # Menlo Bold
    d.text((big / 2, big / 2 + 10), "@", font=font, fill=(124, 242, 154, 255), anchor="mm")
    folder.mkdir(parents=True, exist_ok=True)
    for s in (16, 32, 48, 128):
        img.resize((s, s), Image.LANCZOS).save(folder / f"{s}.png")


def assemble(target: str) -> Path:
    out = HERE / "build" / target
    shutil.rmtree(out, ignore_errors=True)
    out.mkdir(parents=True)
    for name in ("renderer.js", "app.js", "style.css", "wallpaper-store.js"):
        shutil.copy(WEB / name, out / name)
    shutil.copy(WEB / "index.html", out / "studio.html")
    for name in ("background.js", "newtab.html", "newtab.js"):
        shutil.copy(HERE / name, out / name)
    shutil.copytree(HERE / "icons", out / "icons")

    manifest = json.loads((HERE / "manifest.json").read_text())
    if target == "firefox":
        manifest["background"] = {"scripts": ["background.js"]}   # Firefox uses an event page
        manifest["browser_specific_settings"] = {"gecko": {
            "id": FIREFOX_ID,
            "strict_min_version": "140.0",
            "data_collection_permissions": {"required": ["none"]},  # we collect nothing
        }}
    (out / "manifest.json").write_text(json.dumps(manifest, indent=2))
    return out


def zip_folder(folder: Path, dest: Path) -> None:
    dest.parent.mkdir(exist_ok=True)
    with zipfile.ZipFile(dest, "w", zipfile.ZIP_DEFLATED) as z:
        for f in sorted(folder.rglob("*")):
            if f.is_file():
                z.write(f, f.relative_to(folder).as_posix())


def main() -> None:
    if not (HERE / "icons" / "128.png").exists():
        make_icons(HERE / "icons")
    version = json.loads((HERE / "manifest.json").read_text())["version"]
    for target in ("chrome", "firefox"):
        folder = assemble(target)
        z = HERE / "dist" / f"ascii-studio-{target}-{version}.zip"
        zip_folder(folder, z)
        print(f"{target:8} {folder.relative_to(HERE.parent)}  ->  {z.relative_to(HERE.parent)}")


if __name__ == "__main__":
    main()
