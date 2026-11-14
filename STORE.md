# Publishing ASCII Studio

Build first: `python3 extension/build.py` (from `ascii-studio/`). Raise `version` in
`manifest.json` before every new upload.

## Test locally
- **Chrome / Brave / Edge**: `chrome://extensions` → Developer mode → Load unpacked →
  `extension/build/chrome`. Right-click any image → *Turn into ASCII art*.
- **Firefox**: `about:debugging#/runtime/this-firefox` → Load Temporary Add-on →
  `extension/build/firefox/manifest.json`.

## Where to publish
| Store | Upload | Cost | Covers |
|---|---|---|---|
| Chrome Web Store (chrome.google.com/webstore/devconsole) | `dist/ascii-studio-chrome-*.zip` | one-time $5 developer fee | Chrome, Brave, Opera, Vivaldi, Arc |
| Microsoft Edge Add-ons (partner.microsoft.com) | same Chrome zip | free | Edge |
| Firefox Add-ons (addons.mozilla.org/developers) | `dist/ascii-studio-firefox-*.zip` | free | Firefox |
| Safari | needs `xcrun safari-web-extension-converter` + Xcode + Apple Developer Program | $99/year | Safari (Mac/iPhone) |

Reviews usually take from a few hours to a few days. Firefox may ask for source code; the
zip *is* the source (no minifying or bundling), so just say so.

## Listing text
**Name:** ASCII Studio

**Short description (≤132 chars):**
Turn any image, video or your webcam into colourful ASCII art. Right-click → Turn into ASCII art. 100% on-device.

**Full description:**
ASCII Studio turns pictures into art made only of letters, numbers and symbols.

• Right-click any image or video on a website → "Turn into ASCII art"
• Or open your own photos and videos, or switch on your webcam
• Three looks: full colour, Matrix green, classic mono
• Tune character size, contrast, edge strokes, glow and shimmer
• Save as PNG (up to 4K or your exact screen size for wallpapers), record video, or copy as plain text
• Everything runs on your device with your graphics card. Nothing is uploaded, ever.

**Category:** Photos (Chrome) / Photos, Music & Videos (Firefox)

**New Tab page:** the extension replaces the New Tab page with the animated ASCII wallpaper
(character rain until the user picks a picture). Both stores allow this, but it **must be
stated clearly in the description**. Add this line to the full description:
• Makes your New Tab page an animated ASCII wallpaper with a clock (choose any photo or video)

Chrome/Brave show a "Keep it or change back?" prompt the first time a new tab opens; that's normal.
If you'd rather the store version not touch new tabs, delete the `chrome_url_overrides` line
from `manifest.json` and rebuild; everything else still works.

## Permission justifications (the stores ask for these)
- `contextMenus`: adds the "Turn into ASCII art" item when you right-click an image or video.
- `optional_host_permissions <all_urls>`: *optional*, requested per site only when a site
  blocks loading its image; used solely to fetch the image/video the user right-clicked.
- Camera: requested by the browser only when the user clicks "Webcam".
- Remote code: none. All code ships inside the package.
- Data collection: none (see PRIVACY.md; host that file, e.g. as a GitHub page, and paste its link).

## Store images you'll need to make
- Chrome: icon 128×128 (`icons/128.png`), at least one screenshot 1280×800, small promo tile 440×280.
- Firefox: at least one screenshot.
Tip: open the studio, load a photo, and screenshot the window at 1280×800.
