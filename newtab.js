// New Tab page: an interactive built-in wallpaper (water, butterflies…) or the user's own
// picture from the studio, with a clock. Everything you pick is remembered in localStorage.
import { AsciiRenderer } from "./renderer.js";
import { loadWallpaper } from "./wallpaper-store.js";
import { Grid, SCENES, WATER_DEFAULTS, RAIN_DEFAULTS } from "./scenes.js";

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
const FONTS = {
  modern: '-apple-system, BlinkMacSystemFont, "SF Pro Display", system-ui, "Segoe UI", Roboto, sans-serif',
  serif: '"New York", ui-serif, "Iowan Old Style", Georgia, "Times New Roman", serif',
  mono: 'ui-monospace, "SF Mono", Menlo, Consolas, monospace',
  rounded: 'ui-rounded, "SF Pro Rounded", "Arial Rounded MT Bold", "Nunito", system-ui, sans-serif',
  typewriter: '"American Typewriter", "Courier New", Courier, monospace',
  ascii: 'ui-monospace, "SF Mono", Menlo, Consolas, monospace',
};
const CLOCK_DEFAULTS = {
  font: "modern", weight: 600, size: 1, color: "#f4f3f8",
  hours: "auto", seconds: false, date: "long", position: "center", panel: false,
};
let clockOpts = store.json("ntp-clock", CLOCK_DEFAULTS);

// big digits drawn with "#" for the ASCII font (3 wide, 5 tall)
const GLYPHS = {
  0: ["###", "# #", "# #", "# #", "###"], 1: [" # ", "## ", " # ", " # ", "###"],
  2: ["###", "  #", "###", "#  ", "###"], 3: ["###", "  #", "###", "  #", "###"],
  4: ["# #", "# #", "###", "  #", "  #"], 5: ["###", "#  ", "###", "  #", "###"],
  6: ["###", "#  ", "###", "# #", "###"], 7: ["###", "  #", "  #", "  #", "  #"],
  8: ["###", "# #", "###", "# #", "###"], 9: ["###", "# #", "###", "  #", "###"],
  ":": [" ", "#", " ", "#", " "],
};
const asciiDigits = (text) =>
  [0, 1, 2, 3, 4].map((row) => [...text].map((ch) => (GLYPHS[ch] || ["   "])[row]).join(" ")).join("\n");

const localeUses12h = (() => {
  try { return !!new Intl.DateTimeFormat([], { hour: "numeric" }).resolvedOptions().hour12; } catch { return false; }
})();

function clock() {
  const now = new Date();
  const use12 = clockOpts.hours === "12" || (clockOpts.hours === "auto" && localeUses12h);
  let h = now.getHours();
  const ampm = use12 ? (h >= 12 ? "PM" : "AM") : "";
  if (use12) h = h % 12 || 12;
  const pad = (n) => String(n).padStart(2, "0");
  const text = `${use12 ? h : pad(h)}:${pad(now.getMinutes())}${clockOpts.seconds ? ":" + pad(now.getSeconds()) : ""}`;

  const t = $("time");
  if (clockOpts.font === "ascii") {
    t.replaceChildren(Object.assign(document.createElement("pre"), { textContent: asciiDigits(text) }));
  } else {
    t.replaceChildren(document.createTextNode(text));
  }
  if (ampm) t.append(Object.assign(document.createElement("span"), { className: "ampm", textContent: ampm }));

  const dateFormats = {
    long: { weekday: "long", day: "numeric", month: "long" },
    short: { weekday: "short", day: "numeric", month: "short" },
    numeric: { year: "numeric", month: "2-digit", day: "2-digit" },
  };
  $("date").hidden = clockOpts.date === "hidden";
  if (clockOpts.date !== "hidden") $("date").textContent = now.toLocaleDateString([], dateFormats[clockOpts.date] || dateFormats.long);
}

function applyClock() {
  const c = $("clock"), root = document.documentElement.style;
  root.setProperty("--clock-font", FONTS[clockOpts.font] || FONTS.modern);
  root.setProperty("--clock-weight", clockOpts.weight);
  root.setProperty("--clock-scale", clockOpts.size);
  root.setProperty("--clock-color", clockOpts.color);
  c.className = `clock pos-${clockOpts.position}${clockOpts.panel ? " panel glass" : ""}`;
  store.set("ntp-clock", JSON.stringify(clockOpts));
  clock();
}
function setClock(patch) { Object.assign(clockOpts, patch); applyClock(); }

applyClock();
setInterval(clock, 1000);
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

// ================================================================ little control builders
function el(tag, props = {}, ...kids) {
  const e = Object.assign(document.createElement(tag), props);
  e.append(...kids);
  return e;
}
const opt = (label, control, inline = false) =>
  el("div", { className: inline ? "opt inline" : "opt" }, el("span", { className: "opt-label", textContent: label }), control);

function toggle(value, onchange, id) {
  const i = el("input", { type: "checkbox", className: "switch", checked: !!value });
  if (id) i.id = id;
  i.onchange = () => onchange(i.checked);
  return i;
}
function slider(min, max, step, value, fmt, oninput) {
  const i = el("input", { type: "range", min, max, step, value });
  const out = el("output");
  const sync = () => {
    out.textContent = fmt(+i.value);
    i.style.setProperty("--p", `${((i.value - min) / (max - min)) * 100}%`);
  };
  i.oninput = () => { sync(); oninput(+i.value); };
  sync();
  return el("div", { className: "slider" }, i, out);
}
function seg(options, value, onchange) {
  const w = el("div", { className: "seg" });
  for (const [v, label] of options) {
    const b = el("button", { textContent: label, className: String(v) === String(value) ? "on" : "" });
    b.onclick = () => {
      w.querySelectorAll("button").forEach((x) => x.classList.toggle("on", x === b));
      onchange(v);
    };
    w.append(b);
  }
  return w;
}
function swatches(colors, value, onchange) {
  const w = el("div", { className: "swatches" });
  const custom = el("input", { type: "color", title: "Any colour you like", value });
  const mark = (v) => w.querySelectorAll(".sw").forEach((s) => s.classList.toggle("on", s.dataset.v.toLowerCase() === String(v).toLowerCase()));
  for (const [v, name] of colors) {
    const b = el("button", { className: "sw", title: name, ariaLabel: name });
    b.dataset.v = v;
    b.style.background = v;
    b.onclick = () => { mark(v); custom.value = v; onchange(v); };
    w.append(b);
  }
  custom.oninput = () => { mark(custom.value); onchange(custom.value); };
  w.append(custom);
  mark(value);
  return w;
}

// ================================================================ Customise: scene options
const WATER_COLORS = [["#1fa6ff", "Ocean"], ["#18d6c3", "Teal"], ["#3ee07a", "Lagoon"], ["#ff6fae", "Rose"],
  ["#ff7a2f", "Lava"], ["#9b7bff", "Violet"], ["#dfe7ff", "Moonlight"]];
const RAIN_COLORS = [["#39e07a", "Matrix"], ["#3fd6ff", "Cyan"], ["#ffb347", "Amber"], ["#ff6fae", "Pink"],
  ["#a98bff", "Violet"], ["#e8ecff", "White"]];

function setSceneOpt(id, patch) {
  sceneOpts[id] = { ...sceneOpts[id], ...patch };
  store.set("ntp-scene-opts", JSON.stringify(sceneOpts));
  if (sceneId === id && scene && scene.setOptions) scene.setOptions(patch);
}

function buildSceneOptions(choice) {
  const box = $("scene-opts");
  const name = choice === "custom" ? "Your picture" : (SCENES[choice] || SCENES.water).name;
  $("scene-title").textContent = name;
  box.replaceChildren();
  if (choice === "water") {
    const o = { ...WATER_DEFAULTS, ...sceneOpts.water };
    box.append(
      opt("Ripple colour", swatches(WATER_COLORS, o.color, (v) => setSceneOpt("water", { color: v }))),
      opt("Ripple size", slider(0.5, 2, 0.1, o.size, (v) => `${Math.round(v * 100)}%`, (v) => setSceneOpt("water", { size: v }))),
      opt("Raindrops on their own", toggle(o.raindrops, (v) => setSceneOpt("water", { raindrops: v })), true),
    );
  } else if (choice === "rain") {
    const o = { ...RAIN_DEFAULTS, ...sceneOpts.rain };
    const strength = opt("Flow strength", slider(0.4, 2, 0.1, o.strength, (v) => `${Math.round(v * 100)}%`, (v) => setSceneOpt("rain", { strength: v })));
    strength.hidden = !o.fluid;
    box.append(
      opt("Umbrella around the cursor", toggle(o.umbrella, (v) => setSceneOpt("rain", { umbrella: v })), true),
      opt("Rain flows around the cursor", toggle(o.fluid, (v) => { setSceneOpt("rain", { fluid: v }); strength.hidden = !v; }), true),
      strength,
      opt("Rain colour", swatches(RAIN_COLORS, o.color, (v) => setSceneOpt("rain", { color: v }))),
    );
  } else {
    box.append(el("p", { className: "note", textContent: "No extra options for this one yet. Try Water or Rain!" }));
  }
}

// ================================================================ Customise: clock options
function buildClockOptions() {
  const box = $("clock-opts");
  const o = clockOpts;
  box.replaceChildren(
    opt("Show the clock", toggle(store.get("ntp-hide-clock") !== "1", (v) => showClock(v), "show-clock"), true),
    opt("Font", seg([["modern", "Modern"], ["serif", "Serif"], ["mono", "Mono"], ["rounded", "Rounded"], ["typewriter", "Typewriter"], ["ascii", "ASCII"]], o.font, (v) => setClock({ font: v }))),
    opt("Weight", seg([[300, "Light"], [600, "Regular"], [800, "Bold"]], o.weight, (v) => setClock({ weight: v }))),
    opt("Size", slider(0.5, 2, 0.05, o.size, (v) => `${Math.round(v * 100)}%`, (v) => setClock({ size: v }))),
    opt("Colour", swatches([["#f4f3f8", "White"], ["#ffd27a", "Gold"], ["#ff8fb3", "Pink"], ["#8fe3ff", "Ice"],
      ["#9dff9a", "Mint"], ["#c3a6ff", "Lilac"], ["#1a1a1a", "Ink"]], o.color, (v) => setClock({ color: v }))),
    opt("Hours", seg([["auto", "Automatic"], ["12", "12-hour"], ["24", "24-hour"]], o.hours, (v) => setClock({ hours: v }))),
    opt("Show seconds", toggle(o.seconds, (v) => setClock({ seconds: v })), true),
    opt("Date", seg([["long", "Long"], ["short", "Short"], ["numeric", "Numbers"], ["hidden", "Hidden"]], o.date, (v) => setClock({ date: v }))),
    opt("Position", seg([["center", "Centre"], ["top-left", "Top left"], ["bottom-left", "Bottom left"]], o.position, (v) => setClock({ position: v }))),
    opt("Glass panel behind it", toggle(o.panel, (v) => setClock({ panel: v })), true),
  );
  const reset = el("button", { className: "reset glass", textContent: "Reset clock to default" });
  reset.onclick = () => { clockOpts = { ...CLOCK_DEFAULTS }; applyClock(); buildClockOptions(); };
  box.append(reset);
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
