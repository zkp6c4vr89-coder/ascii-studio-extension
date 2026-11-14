# ASCII Studio: Browser Extension

Chrome, Edge, Brave and Firefox extension:

- **Right-click any image or video → "Turn into ASCII art"**
- Toolbar button opens the full studio (photos, videos, webcam, rain)
- **Animated new-tab wallpaper**: set any photo or video as your New Tab background, with a clock
- Record seamless loops, save PNG / text. 100% on-device, no data collected

## Build
```
python3 build.py
```
Makes `build/chrome/` and `build/firefox/` (load these unpacked to test) and store-ready zips
in `dist/`. Pillow is needed only to draw the icons the first time.

- **Chrome / Brave / Edge:** `chrome://extensions` → Developer mode → Load unpacked → `build/chrome`
- **Firefox:** `about:debugging#/runtime/this-firefox` → Load Temporary Add-on → `build/firefox/manifest.json`

Publishing steps, listing text and permission justifications are in [STORE.md](STORE.md);
privacy policy in [PRIVACY.md](PRIVACY.md).

## Layout
| Path | What it is |
|---|---|
| `manifest.json` | Shared manifest; `build.py` adapts it per browser |
| `background.js` | Right-click menu + toolbar button |
| `newtab.html`, `newtab.js` | The animated new-tab wallpaper |
| `web/` | Copy of the studio from **ascii-studio-web**; refresh with `python3 sync_web.py ../ascii-studio-web` |
| `icons/` | Extension icons |
