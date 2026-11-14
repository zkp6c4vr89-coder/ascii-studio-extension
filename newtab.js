// New Tab page: the user's ASCII wallpaper (or character rain), animated, with a clock.
import { AsciiRenderer } from "./renderer.js";
import { loadWallpaper } from "./wallpaper-store.js";

const canvas = document.getElementById("out");
const dpr = window.devicePixelRatio || 1;
const r = new AsciiRenderer(canvas);
const S = r.settings;

// ---- clock ----
const timeEl = document.getElementById("time"), dateEl = document.getElementById("date");
function clock() {
  const now = new Date();
  timeEl.textContent = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  dateEl.textContent = now.toLocaleDateString([], { weekday: "long", day: "numeric", month: "long" });
}
clock();
setInterval(clock, 1000);
const prefs = (() => { try { return JSON.parse(localStorage.getItem("ntp") || "{}"); } catch { return {}; } })();
const savePrefs = () => { try { localStorage.setItem("ntp", JSON.stringify(prefs)); } catch {} };
document.body.classList.toggle("hide-clock", !!prefs.hideClock);
document.getElementById("toggle-clock").onclick = () => {
  prefs.hideClock = !prefs.hideClock;
  document.body.classList.toggle("hide-clock", prefs.hideClock);
  savePrefs();
};

// ---- wallpaper ----
let wp = null;
try { wp = await loadWallpaper(); } catch {}
if (wp && wp.settings) Object.assign(S, wp.settings);
S.cell = (wp && wp.settings ? wp.settings.cell : 7) * dpr;    // same character size on screen as in the studio

if (!wp || wp.mode === "rain" || !wp.blob) {
  S.mode = "rain";
  if (!wp) S.style = "matrix";
} else {
  const url = URL.createObjectURL(wp.blob);
  if (wp.isVideo) {
    const v = Object.assign(document.createElement("video"), { src: url, loop: true, muted: true, playsInline: true, autoplay: true });
    v.addEventListener("loadeddata", () => r.setSource(v));
    v.play().catch(() => {});
  } else {
    const img = new Image();
    img.onload = () => r.setSource(img);
    img.src = url;
  }
}

// ---- loop: only redraw when the character clock ticks (saves battery) ----
let paused = false, lastTick = -1;
document.getElementById("pause").onclick = (e) => {
  paused = !paused;
  e.target.textContent = paused ? "Play" : "Pause";
};
function frame(ms) {
  requestAnimationFrame(frame);
  if (paused) return;
  const tick = Math.floor((ms / 1000) * S.fps);
  if (tick === lastTick) return;
  lastTick = tick;
  r.resize(Math.round(innerWidth * dpr), Math.round(innerHeight * dpr));
  r.render(((tick / S.fps) % S.period + S.period) % S.period);
}
requestAnimationFrame(frame);
