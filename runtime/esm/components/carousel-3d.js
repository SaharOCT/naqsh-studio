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

// src/library/items/carousel-3d/runtime.ts
var mount = (el, props, ctx) => {
  let p = { ...props };
  prepareHost(el);
  el.style.perspective = "1100px";
  el.style.touchAction = "pan-y";
  el.style.cursor = "grab";
  const stage = document.createElement("div");
  stage.style.cssText = "position:absolute;inset:0;display:grid;place-items:center;transform-style:preserve-3d";
  const ring = document.createElement("div");
  ring.style.cssText = "position:relative;transform-style:preserve-3d;will-change:transform";
  stage.appendChild(ring);
  el.appendChild(stage);
  let angle = 0, vel = 0, dragging = false, lastX = 0, n = 1, step = 360, idle = 0;
  const build = () => {
    const imgs = list(p, "images");
    n = Math.max(3, imgs.length);
    step = 360 / n;
    const w = num(p, "cardWidth", 200), h = w * 1.35;
    const radius = Math.round(w / 2 / Math.tan(Math.PI / n)) + 24;
    ring.style.width = `${w}px`;
    ring.style.height = `${h}px`;
    const refl = bool(p, "reflection", true) ? "-webkit-box-reflect:below 10px linear-gradient(transparent 60%,rgba(255,255,255,.25));" : "";
    ring.innerHTML = imgs.map((s, i) => `<div style="position:absolute;inset:0;border-radius:14px;overflow:hidden;transform:rotateY(${i * step}deg) translateZ(${radius}px);backface-visibility:hidden;box-shadow:0 20px 40px -10px rgba(0,0,0,.5);${refl}"><img draggable="false" alt="" src="${resolveImage(s, i)}" style="width:100%;height:100%;object-fit:cover;pointer-events:none"></div>`).join("");
  };
  build();
  const down = (e) => {
    dragging = true;
    lastX = e.clientX;
    vel = 0;
    el.style.cursor = "grabbing";
    el.setPointerCapture(e.pointerId);
  };
  const move = (e) => {
    if (!dragging) return;
    const dx = e.clientX - lastX;
    lastX = e.clientX;
    angle += dx * 0.3;
    vel = dx * 0.3 * 60;
    idle = 0;
  };
  const up = () => {
    dragging = false;
    el.style.cursor = "grab";
  };
  el.addEventListener("pointerdown", down);
  el.addEventListener("pointermove", move);
  el.addEventListener("pointerup", up);
  el.addEventListener("pointercancel", up);
  const loop = createLoop(el, ctx, (dt) => {
    if (!dragging) {
      idle += dt;
      vel *= Math.pow(0.04, dt);
      const auto = idle > 2 ? num(p, "autoRotate", 8) : 0;
      angle += (vel + auto) * dt;
      if (bool(p, "snap", true) && Math.abs(vel) < 20 && auto === 0) {
        const target = Math.round(angle / step) * step;
        angle += (target - angle) * Math.min(1, dt * 6);
      }
    }
    ring.style.transform = `rotateX(${num(p, "tilt", -8)}deg) rotateY(${angle}deg)`;
  });
  return {
    update(nw) {
      p = { ...p, ...nw };
      build();
    },
    setSpeed: loop.setSpeed,
    destroy() {
      loop.destroy();
      stage.remove();
      el.removeEventListener("pointerdown", down);
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerup", up);
      el.removeEventListener("pointercancel", up);
    }
  };
};
var runtime_default = mount;
export {
  runtime_default as default
};
