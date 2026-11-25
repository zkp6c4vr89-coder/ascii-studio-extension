// New Tab page: an interactive built-in wallpaper (water, butterflies…) or the user's own
// picture from the studio, with a clock. Everything you pick is remembered in localStorage.
import { AsciiRenderer } from "./renderer.js";
import { loadWallpaper } from "./wallpaper-store.js";
import { Grid, SCENES } from "./scenes.js";
import { Clock, CLOCK_DEFAULTS, el, sceneControls, clockControls, festiveControls, stoneDots, scenesInOrder } from "./customise.js";
import { christmasSeason, autoSwitchDecision, doomsdayText } from "./seasonal.js";
import { Festive, FESTIVE_DEFAULTS, Stones, STONES, Snap } from "./festive.js";

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

// festive extras (December and over New Year), the hidden stones, and the snap
let inSeason = christmasSeason();
setInterval(() => { inSeason = christmasSeason(); }, 60000);
const festive = new Festive(store.json("ntp-festive", FESTIVE_DEFAULTS));
let haveStones = [];
try { haveStones = JSON.parse(store.get("ntp-stones", "[]")).filter((id) => STONES[id]); } catch {}
const stones = new Stones(haveStones, (id, have) => {
  store.set("ntp-stones", JSON.stringify(have));
  hint(have.length === 6 ? "All six stones. Double-click anywhere to snap." : `You found the ${STONES[id].name} stone. ${have.length} of 6.`, 7000);
  buildSceneOptions(store.get("ascii-wallpaper", "water"));
});
const snap = new Snap((phase) => {
  if (phase === "start") { document.body.classList.add("snapping"); hint(""); }
  if (phase === "doom") showLine(doomsdayText());
  if (phase === "back") { showLine(""); document.body.classList.remove("snapping"); }
});
function startSnap() {
  if (!scene || !sized || snap.active) return;
  $("sheet").removeAttribute("open");
  snap.start(grid);
}
let lineTimer;
function showLine(text, hideAfter = 0) {          // types a line out, one character at a time
  const line = $("snap-line");
  clearInterval(lineTimer);
  if (!text) { line.classList.remove("show"); return; }
  line.textContent = ""; line.classList.add("show");
  let n = 0;
  lineTimer = setInterval(() => {
    line.textContent = text.slice(0, ++n);
    if (n >= text.length) {
      clearInterval(lineTimer);
      if (hideAfter) lineTimer = setTimeout(() => line.classList.remove("show"), hideAfter);
    }
  }, 45);
}

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
    festive.sceneId = stones.sceneId = "custom";
  } else {
    const def = SCENES[choice] || SCENES.water;
    sceneId = SCENES[choice] ? choice : "water";
    Object.assign(S, { cell: (def.cell || 7) * dpr, glow: def.glow, fps: 30, period: 10, shimmer: 0 });
    scene = def.make(sceneOpts[sceneId]);
    festive.sceneId = stones.sceneId = sceneId;
    sized = null;                                    // forces resize() on the next frame
    hint(def.hint);
  }
  document.querySelectorAll(".tile").forEach((t) => t.classList.toggle("on", t.dataset.id === choice));
  buildSceneOptions(choice);
}

let hintTimer;
function hint(text, ms = 5000) {
  clearTimeout(hintTimer);
  $("hint").textContent = text;
  $("hint").classList.toggle("show", !!text);
  if (text) hintTimer = setTimeout(() => $("hint").classList.remove("show"), ms);
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
  // festive extras: only while it's the season
  $("festive-group").hidden = !inSeason;
  if (inSeason) $("festive-opts").replaceChildren(...festiveControls(festive.opts, (patch) => {
    festive.set(patch);
    store.set("ntp-festive", JSON.stringify(festive.opts));
  }));
  // the stones: nothing at all until the first one is found
  const found = [...stones.have];
  $("stones-group").hidden = !found.length;
  if (found.length) {
    const kids = [stoneDots(found)];
    if (stones.all) {
      const b = el("button", { className: "reset glass", textContent: "Snap" });
      b.onclick = startSnap;
      kids.push(b);
    } else kids.push(el("p", { className: "note", textContent: `${found.length} of 6 found. Each one hides in a different wallpaper.` }));
    $("stones-opts").replaceChildren(...kids);
  }
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
const addTile = (id, name, desc, badge = "") => {
  const title = el("strong", { textContent: name });
  if (badge) title.append(el("span", { className: "badge", textContent: badge }));
  const b = el("button", { className: "tile glass" }, title, el("span", { textContent: desc }));
  b.dataset.id = id;
  b.onclick = () => show(id);
  tiles.appendChild(b);
};
for (const s of scenesInOrder()) addTile(s.id, s.name, s.hint, s.badge);
if (picture) addTile("custom", "Your picture", "The photo or video you set in ASCII Studio.");
$("wallpapers").onclick = () => $("sheet").toggleAttribute("open");
$("sheet-close").onclick = () => $("sheet").removeAttribute("open");
let typed = "";
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") { $("sheet").removeAttribute("open"); snap.skip(); return; }
  const tag = e.target && e.target.tagName;
  if (e.metaKey || e.ctrlKey || e.altKey || /INPUT|TEXTAREA|SELECT/.test(tag || "") || e.key.length !== 1) return;
  typed = (typed + e.key.toLowerCase()).slice(-4);
  if (typed === "doom" && !snap.active) showLine(doomsdayText(), 3500);
  if (typed === "snap") {
    if (stones.all) startSnap();
    else if (stones.have.size) hint(`${stones.have.size} of 6 stones. You need all six to snap.`);
  }
});

// ================================================================ pointer: screen pixels -> character cells
function toCell(e) {
  const [cols, rows] = r.gridSize();
  const ox = Math.floor((canvas.width - cols * r.cellW) / 2), oy = Math.floor((canvas.height - rows * r.cellH) / 2);
  return [(e.clientX * dpr - ox) / r.cellW, (e.clientY * dpr - oy) / r.cellH];
}
canvas.addEventListener("pointermove", (e) => {
  if (!scene || !sized || snap.active) return;
  const [x, y] = toCell(e);
  stones.pointer(x, y, "move");
  scene.pointer(x, y, "move");
});
canvas.addEventListener("pointerdown", (e) => {
  if (!scene || !sized) return;
  if (snap.active) { snap.skip(); return; }
  const [x, y] = toCell(e);
  if (!stones.pointer(x, y, "down")) scene.pointer(x, y, "down");
});
canvas.addEventListener("dblclick", () => { if (stones.all) startSnap(); });

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
      if (snap.active) snap.active = false;          // the window changed size mid-snap: just stop
      scene.resize(cols, rows);
      grid.resize(cols, rows);
      festive.resize(cols, rows);
      stones.resize(cols, rows);
      sized = [cols, rows];
      document.body.classList.remove("snapping");
    }
    const C = r.charMap();
    if (snap.active) {                               // time stands still while the snap plays
      snap.step(dt);
      snap.draw(grid, C);
    } else {
      scene.step(dt, t);
      festive.step(dt, t);
      stones.step(dt);
      grid.clear();
      scene.draw(grid, C, t);
      festive.draw(grid, C, t, inSeason);
      stones.draw(grid, C, t);
    }
    r.renderDirect(grid.pack(), t);
  } else {
    r.render(((tick / S.fps) % S.period + S.period) % S.period);
  }
}

show(store.get("ascii-wallpaper", picture ? "custom" : "water"));

// December: switch to a festive wallpaper once, with Undo. After the season, switch back,
// but only if the festive one is still showing. Someone's own picture is never replaced.
function seasonCheck() {
  const current = store.get("ascii-wallpaper", "water");
  const d = autoSwitchDecision(current, store.json("ntp-season", {}));
  if (!d) return;
  store.set("ntp-season", JSON.stringify(d.season));
  if (d.restore) show(d.restore);
  if (!d.switch) return;
  show(d.switch);
  hint("");
  const toast = $("toast");
  $("toast-text").textContent = d.christmasDay ? "Merry Christmas! Today your wallpaper is the Christmas tree."
    : `It's December, so your wallpaper is now ${SCENES[d.switch].name}.`;
  toast.hidden = false;
  const close = () => { toast.hidden = true; };
  $("toast-undo").onclick = () => { show(d.season.prev); close(); };
  $("toast-keep").onclick = close;
  setTimeout(close, 15000);
}
seasonCheck();
requestAnimationFrame(frame);
