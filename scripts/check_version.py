"""Fails if the pushed tag (vX.Y.Z) doesn't match manifest.json, the single source of the version."""
import json, os, sys
from pathlib import Path

tag = (os.environ.get("TAG") or (sys.argv[1] if len(sys.argv) > 1 else "")).lstrip("v")
version = json.loads((Path(__file__).resolve().parent.parent / "manifest.json").read_text())["version"]
if not tag:
    print(f"no tag; manifest.json version is {version}")
elif tag != version:
    sys.exit(f"Tag v{tag} doesn't match manifest.json version {version}. Bump manifest.json, commit, then tag.")
else:
    print(f"version {version} matches tag")
