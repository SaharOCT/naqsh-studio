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
function createLoop(el, ctx, tick, opts = {}) {
  let speed = ctx.speed ?? 1;
  let visible = true;
  let raf = 0;
  let last = 0;
  let time = 0;
  let dead = false;
  const frame = (now) => {
    raf = 0;
    if (dead) return;
    const dt = last ? Math.min(0.05, (now - last) / 1e3) * speed : 0;
    last = now;
    time += dt;
    tick(dt, time);
    schedule();
  };
  const running = () => visible && !document.hidden && !(ctx.reducedMotion && !opts.allowReduced);
  const schedule = () => {
    if (!raf && running()) raf = requestAnimationFrame(frame);
  };
  const io = new IntersectionObserver(
    (entries) => {
      visible = entries[entries.length - 1].isIntersecting;
      last = 0;
      schedule();
    },
    { rootMargin: "100px" }
  );
  io.observe(el);
  const onVis = () => {
    last = 0;
    schedule();
  };
  document.addEventListener("visibilitychange", onVis);
  tick(0, 0);
  schedule();
  return {
    setSpeed(s) {
      speed = s;
    },
    get time() {
      return time;
    },
    destroy() {
      dead = true;
      cancelAnimationFrame(raf);
      io.disconnect();
      document.removeEventListener("visibilitychange", onVis);
    }
  };
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

// src/library/items/infinite-carousel/runtime.ts
var mount = (el, props, ctx) => {
  let p = { ...props };
  prepareHost(el);
  el.style.touchAction = "pan-y";
  const track = document.createElement("div");
  track.style.cssText = "display:flex;height:100%;align-items:center;will-change:transform;cursor:grab;user-select:none";
  el.appendChild(track);
  let x = 0, v = 0, setW = 1, dragging = false, lastX = 0, hover = false;
  const build = () => {
    const imgs = list(p, "images"), w = num(p, "itemWidth", 260), gap = num(p, "gap", 16), r = num(p, "radius", 16);
    const item = (src, i, hidden) => `<div ${hidden ? 'aria-hidden="true"' : ""} style="flex:0 0 ${w}px;margin-inline-end:${gap}px;aspect-ratio:4/5;max-height:92%;border-radius:${r}px;overflow:hidden;background:#1a1a1f"><img draggable="false" alt="" loading="lazy" src="${resolveImage(src, i)}" style="width:100%;height:100%;object-fit:cover;pointer-events:none"></div>`;
    const one = imgs.map((s, i) => item(s, i, false)).join("");
    setW = imgs.length * (w + gap) || 1;
    const copies = Math.max(2, Math.ceil(el.getBoundingClientRect().width / setW) + 1);
    track.innerHTML = one + Array.from({ length: copies - 1 }, () => imgs.map((s, i) => item(s, i, true)).join("")).join("");
    el.style.maskImage = el.style.webkitMaskImage = bool(p, "fade", true) ? "linear-gradient(90deg,transparent,#000 10%,#000 90%,transparent)" : "none";
  };
  build();
  const down = (e) => {
    dragging = true;
    lastX = e.clientX;
    v = 0;
    track.style.cursor = "grabbing";
    track.setPointerCapture(e.pointerId);
  };
  const move = (e) => {
    if (!dragging) return;
    const dx = e.clientX - lastX;
    lastX = e.clientX;
    x += dx;
    v = dx * 60;
  };
  const up = () => {
    dragging = false;
    track.style.cursor = "grab";
  };
  track.addEventListener("pointerdown", down);
  track.addEventListener("pointermove", move);
  track.addEventListener("pointerup", up);
  track.addEventListener("pointercancel", up);
  const enter = () => hover = true, leave = () => hover = false;
  el.addEventListener("mouseenter", enter);
  el.addEventListener("mouseleave", leave);
  const ro = new ResizeObserver(build);
  ro.observe(el);
  const loop = createLoop(el, ctx, (dt) => {
    if (!dragging) {
      const auto = hover && bool(p, "pauseOnHover", true) ? 0 : -num(p, "velocity", 40);
      v = v + (auto - v) * Math.min(1, dt * 3);
      x += v * dt;
    }
    x = (x % setW - setW) % setW;
    track.style.transform = `translateX(${x}px)`;
  });
  return {
    update(n) {
      p = { ...p, ...n };
      build();
    },
    setSpeed: loop.setSpeed,
    destroy() {
      loop.destroy();
      ro.disconnect();
      el.removeEventListener("mouseenter", enter);
      el.removeEventListener("mouseleave", leave);
      track.remove();
    }
  };
};
var runtime_default = mount;
export {
  runtime_default as default
};
