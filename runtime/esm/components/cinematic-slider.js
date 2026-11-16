// src/library/_shared/kit.ts
var num = (p, k, d = 0) => {
  const v = Number(p[k]);
  return Number.isFinite(v) ? v : d;
};
var str = (p, k, d = "") => p[k] === void 0 || p[k] === null ? d : String(p[k]);
var bool = (p, k, d = false) => p[k] === void 0 ? d : p[k] === true || p[k] === "true";
var list = (p, k) => str(p, k).split(/\n|\|/).map((s) => s.trim()).filter(Boolean);
function escapeHTML(s) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
}
function safeURL(u) {
  const s = u.trim();
  if (/^https?:\/\//i.test(s) || /^\/\//.test(s) || /^data:(image|video|model)\//i.test(s) || /^blob:/i.test(s)) return s;
  if (/^[\w./%-][\w./%~-]*$/.test(s) && !s.includes(":")) return s;
  return "";
}
function prepareHost(el, opts = {}) {
  const cs = getComputedStyle(el);
  if (cs.position === "static") el.style.position = "relative";
  if (opts.clip !== false) el.style.overflow = "hidden";
}
var PALETTES = [
  ["#0f0c29", "#ff6a3d", "#ffd36e"],
  ["#06121f", "#2bd9c4", "#5b6cff"],
  ["#1a0b2e", "#c13cff", "#ff8fd8"],
  ["#0b1a12", "#7dff9b", "#e6ff6e"],
  ["#140d06", "#ff9d2e", "#ff4d4d"],
  ["#050816", "#3d7bff", "#9ad1ff"],
  ["#1d0f0f", "#ff5c8a", "#ffc2a8"],
  ["#0a0a0a", "#f2f2f2", "#8a8a8a"],
  ["#071a1f", "#00c2ff", "#00ffa3"],
  ["#1b1206", "#e0b15a", "#7a4b1f"],
  ["#0d0221", "#ff2a6d", "#05d9e8"],
  ["#10141c", "#a6b8ff", "#ffe08a"]
];
function artwork(i, label = "") {
  const [bg, a, b] = PALETTES[(i % PALETTES.length + PALETTES.length) % PALETTES.length];
  const r = (n) => (Math.sin(i * 12.9898 + n * 78.233) * 43758.5453 % 1 + 1) % 1;
  const circles = Array.from({ length: 4 }, (_, k) => {
    const cx = Math.round(r(k) * 800), cy = Math.round(r(k + 9) * 600), rad = Math.round(120 + r(k + 3) * 260);
    return `<circle cx='${cx}' cy='${cy}' r='${rad}' fill='${k % 2 ? a : b}' opacity='${(0.45 + r(k + 5) * 0.5).toFixed(2)}'/>`;
  }).join("");
  const lines = Array.from({ length: 9 }, (_, k) => `<path d='M0 ${80 + k * 60} Q400 ${40 + k * 60 + r(k) * 90} 800 ${80 + k * 60}' stroke='white' stroke-opacity='.08' fill='none'/>`).join("");
  const text = label ? `<text x='40' y='560' font-family='system-ui,sans-serif' font-size='34' font-weight='600' fill='white' opacity='.9'>${escapeHTML(label)}</text>` : "";
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 800 600' preserveAspectRatio='xMidYMid slice'><defs><filter id='b'><feGaussianBlur stdDeviation='70'/></filter></defs><rect width='800' height='600' fill='${bg}'/><g filter='url(#b)'>${circles}</g>${lines}${text}</svg>`;
  return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
}
function resolveImage(src, i = 0) {
  const m = /^art:(\d+)$/.exec(src.trim());
  if (m) return artwork(Number(m[1]));
  return safeURL(src) || artwork(i);
}

// src/library/items/cinematic-slider/runtime.ts
var EASE = "cubic-bezier(.77,0,.18,1)";
var mount = (el, props, ctx) => {
  let p = { ...props };
  prepareHost(el);
  el.tabIndex = 0;
  el.setAttribute("role", "region");
  el.setAttribute("aria-roledescription", "carousel");
  el.style.touchAction = "pan-y";
  el.style.background = "#000";
  let i = 0, timer = 0, busy = false, slides = [], startAt = performance.now();
  let speed = ctx.speed;
  const build = () => {
    const im = list(p, "images"), t = list(p, "titles"), s = list(p, "subtitles"), acc = escapeHTML(str(p, "accent"));
    el.innerHTML = im.map((src, k) => `<div class="sl" aria-hidden="${k !== i}" style="position:absolute;inset:0;overflow:hidden;visibility:${k === i ? "visible" : "hidden"}">
        <img alt="" src="${resolveImage(src, k)}" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;transform-origin:${k % 2 ? "30% 40%" : "70% 60%"}">
        <div style="position:absolute;inset:0;background:linear-gradient(0deg,rgba(0,0,0,.6),transparent 55%)"></div>
        <div style="position:absolute;inset-inline:6%;bottom:14%;color:#fff">
          <div class="sub" style="overflow:hidden"><span style="display:inline-block;font:500 13px/1.4 ui-monospace,monospace;letter-spacing:.12em;text-transform:uppercase;opacity:.8">${escapeHTML(s[k] ?? "")}</span></div>
          <h2 class="ttl" dir="auto" style="margin:.2em 0 0;font-size:clamp(36px,7vw,108px);line-height:.95;letter-spacing:-.045em;font-weight:700">${escapeHTML(t[k] ?? "").split(" ").map((w) => `<span style="display:inline-block;overflow:hidden;vertical-align:top;padding-bottom:.08em"><span style="display:inline-block">${w}</span></span>`).join(" ")}</h2>
        </div></div>`).join("") + `<div class="ui" style="position:absolute;inset-inline:6%;bottom:6%;display:flex;align-items:center;gap:18px;color:#fff;z-index:5">
        ${bool(p, "counter", true) ? `<span class="cnt" style="font:600 13px ui-monospace,monospace;min-width:54px"></span>` : ""}
        <div style="display:flex;gap:8px;flex:1">${im.map((_, k) => `<button aria-label="Slide ${k + 1}" data-k="${k}" style="all:unset;cursor:pointer;flex:1;height:2px;background:rgba(255,255,255,.25);position:relative;overflow:hidden"><i style="position:absolute;inset:0;transform-origin:left;transform:scaleX(0);background:${acc}"></i></button>`).join("")}</div>
        <button class="prev" aria-label="Previous" style="all:unset;cursor:pointer;width:44px;height:44px;border-radius:50%;border:1px solid rgba(255,255,255,.3);display:grid;place-items:center">←</button>
        <button class="next" aria-label="Next" style="all:unset;cursor:pointer;width:44px;height:44px;border-radius:50%;border:1px solid rgba(255,255,255,.3);display:grid;place-items:center">→</button>
      </div>`;
    slides = Array.from(el.querySelectorAll(".sl"));
    el.querySelectorAll("[data-k]").forEach((b) => b.onclick = () => go(Number(b.dataset.k)));
    el.querySelector(".prev").onclick = () => go(i - 1);
    el.querySelector(".next").onclick = () => go(i + 1);
    enterContent(slides[i], true);
    kenBurns(slides[i]);
    ui();
  };
  const kenBurns = (s) => {
    const img = s.querySelector("img");
    if (ctx.reducedMotion) return;
    img.animate([{ transform: "scale(1.02)" }, { transform: "scale(1.14)" }], { duration: (num(p, "interval", 5500) + 2e3) / speed, easing: "linear", fill: "forwards" });
  };
  const enterContent = (s, instant = false) => {
    const words = s.querySelectorAll(".ttl > span > span"), sub = s.querySelector(".sub span");
    if (ctx.reducedMotion || instant) return;
    sub.animate([{ transform: "translateY(100%)" }, { transform: "none" }], { duration: 700 / speed, delay: 250 / speed, easing: "cubic-bezier(.16,1,.3,1)", fill: "both" });
    words.forEach((w, k) => w.animate([{ transform: "translateY(105%) rotate(4deg)" }, { transform: "none" }], { duration: 1e3 / speed, delay: (350 + k * 70) / speed, easing: "cubic-bezier(.16,1,.3,1)", fill: "both" }));
  };
  const ui = () => {
    const n = slides.length;
    const c = el.querySelector(".cnt");
    if (c) c.textContent = `${String(i + 1).padStart(2, "0")} / ${String(n).padStart(2, "0")}`;
    el.querySelectorAll("[data-k] i").forEach((b, k) => {
      b.getAnimations().forEach((a) => a.cancel());
      b.style.transform = k < i ? "scaleX(1)" : "scaleX(0)";
    });
    const cur = el.querySelectorAll("[data-k] i")[i];
    const iv = num(p, "interval", 5500);
    if (cur && iv > 0 && !ctx.reducedMotion) cur.animate([{ transform: "scaleX(0)" }, { transform: "scaleX(1)" }], { duration: iv / speed, easing: "linear", fill: "forwards" });
  };
  const go = async (to) => {
    const n = slides.length;
    if (busy || !n) return;
    to = (to % n + n) % n;
    if (to === i) return;
    busy = true;
    const dir = to > i || i === n - 1 && to === 0 ? 1 : -1;
    const from = slides[i], next = slides[to];
    next.style.visibility = "visible";
    next.style.zIndex = "2";
    from.style.zIndex = "1";
    next.setAttribute("aria-hidden", "false");
    from.setAttribute("aria-hidden", "true");
    const tr = str(p, "transition", "wipe"), d = (ctx.reducedMotion ? 1 : 1100) / speed;
    const frames = {
      wipe: [[{ clipPath: dir > 0 ? "inset(0 0 0 100%)" : "inset(0 100% 0 0)" }, { clipPath: "inset(0 0 0 0)" }], [{ transform: "none" }, { transform: `translateX(${-dir * 18}%)` }]],
      fade: [[{ opacity: 0, transform: "scale(1.12)" }, { opacity: 1, transform: "scale(1)" }], [{ opacity: 1 }, { opacity: 1 }]],
      slide: [[{ transform: `translateX(${dir * 100}%)` }, { transform: "none" }], [{ transform: "none" }, { transform: `translateX(${-dir * 35}%)` }]],
      circle: [[{ clipPath: "circle(0% at 50% 50%)" }, { clipPath: "circle(75% at 50% 50%)" }], [{ transform: "scale(1)" }, { transform: "scale(1.08)" }]]
    };
    const [inK, outK] = frames[tr] ?? frames.wipe;
    kenBurns(next);
    enterContent(next);
    const a = next.animate(inK, { duration: d, easing: EASE });
    from.animate(outK, { duration: d, easing: EASE, fill: "forwards" });
    i = to;
    ui();
    await a.finished.catch(() => {
    });
    from.style.visibility = "hidden";
    from.getAnimations().forEach((x) => x.cancel());
    busy = false;
    schedule();
  };
  const schedule = () => {
    clearTimeout(timer);
    const iv = num(p, "interval", 5500);
    startAt = performance.now();
    if (iv > 0 && !ctx.reducedMotion) timer = window.setTimeout(() => go(i + 1), iv / speed);
  };
  let sx = 0, sy = 0;
  const down = (e) => {
    sx = e.clientX;
    sy = e.clientY;
  };
  const up = (e) => {
    const dx = e.clientX - sx;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(e.clientY - sy)) go(i + (dx < 0 ? 1 : -1) * (getComputedStyle(el).direction === "rtl" ? -1 : 1));
  };
  const key = (e) => {
    if (e.key === "ArrowRight") go(i + 1);
    if (e.key === "ArrowLeft") go(i - 1);
  };
  el.addEventListener("pointerdown", down);
  el.addEventListener("pointerup", up);
  el.addEventListener("keydown", key);
  build();
  schedule();
  void startAt;
  return {
    update(n) {
      p = { ...p, ...n };
      i = Math.min(i, list(p, "images").length - 1);
      build();
      schedule();
    },
    replay() {
      go(i + 1);
    },
    setSpeed(s) {
      speed = s;
      schedule();
    },
    destroy() {
      clearTimeout(timer);
      el.removeEventListener("pointerdown", down);
      el.removeEventListener("pointerup", up);
      el.removeEventListener("keydown", key);
      el.innerHTML = "";
    }
  };
};
var runtime_default = mount;
export {
  runtime_default as default
};
