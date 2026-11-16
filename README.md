# ASCII Studio: Browser Extension

Chrome, Edge, Brave and Firefox extension:

- **Right-click any image or video → "Turn into ASCII art"**
- Toolbar button opens the full studio (photos, videos, webcam, rain)
- **Interactive new-tab wallpapers**: Water (click for ripples), Butterflies (they flee your cursor),
  Fireflies (they gather round it), Rain (your cursor is an umbrella), Starfield (click for hyperspace),
  or any photo or video you make in the studio, with a clock
- **Customise tab** on the new tab: ripple colour & size, rain colour, umbrella on/off and
  fluid rain that flows around your cursor; clock font (incl. ASCII digits), weight, size,
  colour, 12/24-hour, seconds, date style, position and a liquid-glass panel
- Record seamless loops, save PNG / text. 100% on-device, no data collected

## Build
```
python3 build.py
```
Makes `build/chrome/` and `build/firefox/` (load these unpacked to test) and store-ready zips
in `dist/`. Only Python 3 is needed.

- **Chrome / Brave / Edge:** `chrome://extensions` → Developer mode → Load unpacked → `build/chrome`
- **Firefox:** `about:debugging#/runtime/this-firefox` → Load Temporary Add-on → `build/firefox/manifest.json`

Publishing steps, listing text and permission justifications are in [STORE.md](STORE.md);
privacy policy in [PRIVACY.md](PRIVACY.md).

## Layout
| Path | What it is |
|---|---|
| `manifest.json` | Shared manifest; `build.py` adapts it per browser |
| `background.js` | Right-click menu + toolbar button |
| `newtab.html`, `newtab.js` | The new-tab page: clock, wallpaper picker, liquid-glass controls |
| `web/` | Copy of the studio and the five interactive wallpapers (`scenes.js`) from **ascii-studio-web**; refresh with `python3 sync_web.py ../ascii-studio-web` |
| `icons/` | Extension icons |
