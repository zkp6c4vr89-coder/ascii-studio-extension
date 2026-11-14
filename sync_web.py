"""Refresh web/ (the studio page this extension ships) from the
ascii-studio-web repo, when it's checked out next to this one.

  python3 sync_web.py [path/to/ascii-studio-web]
"""

import shutil
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
FILES = ("renderer.js", "app.js", "style.css", "wallpaper-store.js", "index.html", "manifest.webmanifest", "scenes.js")

candidates = [Path(sys.argv[1])] if len(sys.argv) > 1 else [HERE.parent / "ascii-studio-web", HERE.parent / "web"]
src = next((c for c in candidates if (c / "renderer.js").exists()), None)
if not src:
    sys.exit("Couldn't find the web repo. Pass its path: python3 sync_web.py ../ascii-studio-web")
(HERE / "web").mkdir(exist_ok=True)
shutil.copytree(src / "brand", HERE / "web" / "brand", dirs_exist_ok=True,
                ignore=shutil.ignore_patterns("*.py", "__pycache__"))
for f in FILES:
    shutil.copy(src / f, HERE / "web" / f)
    print("copied", f)
