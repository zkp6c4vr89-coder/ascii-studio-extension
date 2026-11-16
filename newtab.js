// New Tab page: an interactive built-in wallpaper (water, butterflies…) or the user's own
// picture from the studio, with a clock. Everything you pick is remembered in localStorage.
import { AsciiRenderer } from "./renderer.js";
import { loadWallpaper } from "./wallpaper-store.js";
import { Grid, SCENES } from "./scenes.js";
import { Clock, CLOCK_DEFAULTS, el, sceneControls, clockControls } from "./customise.js";

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
  json(k, d) { try { return { ...d, ...JSON.parse(localStorage.getItem(k) || "{}") }; } catch { return { ...d }; } },
};

// ================================================================ clock
const clock = new Clock($("clock"), $("time"), $("date"), store.json("ntp-clock", CLOCK_DEFAULTS));
const saveClock = (opts) => store.set("ntp-clock", JSON.stringify(opts));
document.body.classList.toggle("hide-clock", store.get("ntp-hide-clock") === "1");
function showClock(on) {
  document.body.classList.toggle("hide-clock", !on);
  store.set("ntp-hide-clock", on ? "0" : "1");
  const sw = $("show-clock");
  if (sw) sw.checked = on;
}
$("toggle-clock").onclick = () => showClock(document.body.classList.contains("hide-clock"));

// ================================================================ what's showing
let picture = null;
try { picture = await loadWallpaper(); } catch {}
if (picture && (picture.mode === "rain" || !picture.blob)) picture = null;   // old "rain" = built-in now

let scene = null, sceneId = null, mediaUrl = null, sized = null;
const grid = new Grid();
const sceneOpts = store.json("ntp-scene-opts", { water: {}, rain: {} });

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
    scene = def.make(sceneOpts[sceneId]);
    sized = null;                                    // forces resize() on the next frame
    hint(def.hint);
  }
  document.querySelectorAll(".tile").forEach((t) => t.classList.toggle("on", t.dataset.id === choice));
  buildSceneOptions(choice);
}

let hintTimer;
function hint(text) {
  clearTimeout(hintTimer);
  $("hint").textContent = text;
  $("hint").classList.toggle("show", !!text);
  if (text) hintTimer = setTimeout(() => $("hint").classList.remove("show"), 5000);
}

// ================================================================ Customise tab
function setSceneOpt(id, patch) {
  sceneOpts[id] = { ...sceneOpts[id], ...patch };
  store.set("ntp-scene-opts", JSON.stringify(sceneOpts));
  if (sceneId === id && scene && scene.setOptions) scene.setOptions(patch);
}
function buildSceneOptions(choice) {
  $("scene-title").textContent = choice === "custom" ? "Your picture" : (SCENES[choice] || SCENES.water).name;
  $("scene-opts").replaceChildren(...sceneControls(choice, sceneOpts[choice], (patch) => setSceneOpt(choice, patch)));
}
function buildClockOptions() {
  const shown = store.get("ntp-hide-clock") !== "1";
  const reset = el("button", { className: "reset glass", textContent: "Reset clock to default" });
  reset.onclick = () => { clock.reset(); saveClock(clock.opts); buildClockOptions(); };
  $("clock-opts").replaceChildren(...clockControls(clock, saveClock, [shown, showClock]), reset);
}
buildClockOptions();

// ================================================================ sheet: tabs, picker
document.querySelectorAll(".tabs button").forEach((b) => {
  b.onclick = () => {
    document.querySelectorAll(".tabs button").forEach((x) => x.classList.toggle("on", x === b));
    document.querySelectorAll(".pane").forEach((p) => (p.hidden = p.dataset.pane !== b.dataset.tab));
  };
});
const tiles = $("tiles");
const addTile = (id, name, desc) => {
  const b = el("button", { className: "tile glass" }, el("strong", { textContent: name }), el("span", { textContent: desc }));
  b.dataset.id = id;
  b.onclick = () => show(id);
  tiles.appendChild(b);
};
for (const [id, s] of Object.entries(SCENES)) addTile(id, s.name, s.hint);
if (picture) addTile("custom", "Your picture", "The photo or video you set in ASCII Studio.");
$("wallpapers").onclick = () => $("sheet").toggleAttribute("open");
$("sheet-close").onclick = () => $("sheet").removeAttribute("open");
document.addEventListener("keydown", (e) => { if (e.key === "Escape") $("sheet").removeAttribute("open"); });

// ================================================================ pointer: screen pixels -> character cells
function toCell(e) {
  const [cols, rows] = r.gridSize();
  const ox = Math.floor((canvas.width - cols * r.cellW) / 2), oy = Math.floor((canvas.height - rows * r.cellH) / 2);
  return [(e.clientX * dpr - ox) / r.cellW, (e.clientY * dpr - oy) / r.cellH];
}
canvas.addEventListener("pointermove", (e) => scene && sized && scene.pointer(...toCell(e), "move"));
canvas.addEventListener("pointerdown", (e) => scene && sized && scene.pointer(...toCell(e), "down"));

// ================================================================ loop
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
