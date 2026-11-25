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
ASCII Studio turns pictures into art made only of letters, numbers and symbols, in full colour.

• Right-click any image or video on a website → "Turn into ASCII art"
• Or open your own photos and videos, or switch on your webcam
• Three looks: full colour, Matrix green, classic mono
• Tune character size, contrast, edge strokes, glow, shimmer and character speed
• Save PNGs (up to 4K or your exact screen size), record seamless 5/10/15-second loops, or copy as plain text

Your New Tab page becomes an interactive ASCII wallpaper with a clock:
• Water: click to drop a stone and watch the ripples spread
• Butterflies: they flutter away from your cursor
• Fireflies: they gather around your cursor and flash when you click
• Rain: run your cursor through it and it flows around like a finger in a stream
• Starfield: steer with your mouse, click for hyperspace
• Christmas: Snowfall that piles up, a turning 3D Christmas tree, a crackling Fireplace and Northern lights
• …or any photo or video you make in the studio

Make it yours with the Customise tab: 14 ripple and rain colours (or rainbow), flow strength, umbrella on/off, and a clock with six fonts (including big ASCII digits), 15 colours, sizes, 12/24-hour, seconds, date styles, positions and a liquid-glass panel.

Everything runs on your device using your graphics card. Nothing is uploaded, no data is collected, no account needed.

**What's new in 1.6.0** (paste into "What's new" / version notes):
• Four Christmas wallpapers: Snowfall, a turning 3D Christmas tree, Fireplace and Northern lights
• A countdown to Christmas under the clock (December to New Year; you can turn it off)
• Snow and string lights on any wallpaper during the season
• In December your new tab turns festive once, with Undo. Your own picture is never replaced
• …and something hidden, for anyone who looks closely

**What's new in 1.5.0**:
• New Customise tab on the New Tab page
• Rain now flows around your cursor like a finger in a smooth stream, with adjustable strength
• 14 colours for ripples and rain, 15 for the clock, plus Rainbow for each
• Clock fonts (Modern, Serif, Mono, Rounded, Typewriter, ASCII digits), weight, size, 12/24-hour, seconds, date style, position and a glass panel
• Umbrella around the cursor can now be turned off

**Category:** Photos (Chrome) / Photos, Music & Videos (Firefox)

**New Tab page:** the extension replaces the New Tab page with the animated ASCII wallpaper
(the interactive Water scene until the user picks another). Both stores allow this, but it **must be
stated clearly in the description**. Add this line to the full description:
• Makes your New Tab page an interactive ASCII wallpaper with a clock: water that ripples when you click, butterflies that flee your cursor, fireflies, rain and a starfield, or any photo or video

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
