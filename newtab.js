// New Tab page: an interactive built-in wallpaper (water, butterflies…) or the user's own
// picture from the studio, with a clock. Choice is remembered in localStorage.
import { AsciiRenderer } from "./renderer.js";
import { loadWallpaper } from "./wallpaper-store.js";
import { Grid, SCENES } from "./scenes.js";

const $ = (id) => document.getElementById(id);
// Only Chromium can bend the backdrop through an SVG filter (true liquid glass).
if (navigator.userAgentData && navigator.userAgentData.brands.some((b) => /Chromium/.test(b.brand))) {
  document.documentElement.classList.add("liquid");
}
const canvas = $("out");
const dpr = window.devicePixelRatio || 1;
const r = new AsciiRenderer(canvas);
const S = r.settings;
const store = {
  get(k, d) { try { return localStorage.getItem(k) ?? d; } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch {} },
};

// ---- clock ----
function clock() {
  const now = new Date();
  $("time").textContent = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  $("date").textContent = now.toLocaleDateString([], { weekday: "long", day: "numeric", month: "long" });
}
clock();
setInterval(clock, 1000);
document.body.classList.toggle("hide-clock", store.get("ntp-hide-clock") === "1");
$("toggle-clock").onclick = () => {
  const hide = !document.body.classList.contains("hide-clock");
  document.body.classList.toggle("hide-clock", hide);
  store.set("ntp-hide-clock", hide ? "1" : "0");
};

// ---- what's showing ----
let picture = null;
try { picture = await loadWallpaper(); } catch {}
if (picture && (picture.mode === "rain" || !picture.blob)) picture = null;   // old "rain" = built-in now

let scene = null, sceneId = null, mediaUrl = null;
const grid = new Grid();

function show(choice) {
  if (choice === "custom" && !picture) choice = "water";
  store.set("ascii-wallpaper", choice);
  scene = null; sceneId = null;
  if (mediaUrl) { URL.revokeObjectURL(mediaUrl); mediaUrl = null; }
  r.setSource(null);

  if (choice === "custom") {
    Object.assign(S, picture.settings, { mode: "source" });
    S.cell = (picture.settings.cell || 7) * dpr;    // same character size on screen as in the studio
    mediaUrl = URL.createObjectURL(picture.blob);
    if (picture.isVideo) {
      const v = Object.assign(document.createElement("video"), { src: mediaUrl, loop: true, muted: true, playsInline: true, autoplay: true });
      v.addEventListener("loadeddata", () => r.setSource(v));
      v.play().catch(() => {});
    } else {
      const img = new Image();
      img.onload = () => r.setSource(img);
      img.src = mediaUrl;
    }
    hint("");
  } else {
    const def = SCENES[choice] || SCENES.water;
    sceneId = SCENES[choice] ? choice : "water";
    Object.assign(S, { cell: 7 * dpr, glow: def.glow, fps: 30, period: 10, shimmer: 0 });
    scene = def.make();
    sized = null;                                    // forces resize() on the next frame
    hint(def.hint);
  }
  document.querySelectorAll(".tile").forEach((t) => t.classList.toggle("on", t.dataset.id === choice));
}

let hintTimer;
function hint(text) {
  clearTimeout(hintTimer);
  $("hint").textContent = text;
  $("hint").classList.toggle("show", !!text);
  if (text) hintTimer = setTimeout(() => $("hint").classList.remove("show"), 5000);
}

// ---- picker ----
const tiles = $("tiles");
const addTile = (id, name, desc) => {
  const b = Object.assign(document.createElement("button"), { className: "tile glass" });
  b.dataset.id = id;
  b.innerHTML = `<strong></strong><span></span>`;
  b.querySelector("strong").textContent = name;
  b.querySelector("span").textContent = desc;
  b.onclick = () => { show(id); };
  tiles.appendChild(b);
};
for (const [id, s] of Object.entries(SCENES)) addTile(id, s.name, s.hint);
if (picture) addTile("custom", "Your picture", "The photo or video you set in ASCII Studio.");
$("wallpapers").onclick = () => $("sheet").toggleAttribute("open");
$("sheet-close").onclick = () => $("sheet").removeAttribute("open");
document.addEventListener("keydown", (e) => { if (e.key === "Escape") $("sheet").removeAttribute("open"); });

// ---- pointer: screen pixels -> character cells ----
let sized = null;
function toCell(e) {
  const [cols, rows] = r.gridSize();
  const ox = Math.floor((canvas.width - cols * r.cellW) / 2), oy = Math.floor((canvas.height - rows * r.cellH) / 2);
  return [(e.clientX * dpr - ox) / r.cellW, (e.clientY * dpr - oy) / r.cellH];
}
canvas.addEventListener("pointermove", (e) => scene && scene.pointer(...toCell(e), "move"));
canvas.addEventListener("pointerdown", (e) => scene && scene.pointer(...toCell(e), "down"));

// ---- loop ----
let paused = false, last = performance.now(), lastTick = -1;
$("pause").onclick = (e) => { paused = !paused; e.target.textContent = paused ? "Play" : "Pause"; };

function frame(ms) {
  requestAnimationFrame(frame);
  if (paused) return;
  const tick = Math.floor((ms / 1000) * S.fps);
  if (tick === lastTick) return;
  lastTick = tick;
  const dt = Math.min(0.05, (ms - last) / 1000);
  last = ms;
  r.resize(Math.round(innerWidth * dpr), Math.round(innerHeight * dpr));
  const t = ms / 1000;
  if (scene) {
    const [cols, rows] = r.gridSize();
    if (!sized || sized[0] !== cols || sized[1] !== rows) {
      scene.resize(cols, rows);
      grid.resize(cols, rows);
      sized = [cols, rows];
    }
    scene.step(dt, t);
    grid.clear();
    scene.draw(grid, r.charMap(), t);
    r.renderDirect(grid.pack(), t);
  } else {
    r.render(((tick / S.fps) % S.period + S.period) % S.period);
  }
}

show(store.get("ascii-wallpaper", picture ? "custom" : "water"));
requestAnimationFrame(frame);
