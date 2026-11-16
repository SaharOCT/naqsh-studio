// src/library/_shared/kit.ts
var num = (p, k, d = 0) => {
  const v = Number(p[k]);
  return Number.isFinite(v) ? v : d;
};
var str = (p, k, d = "") => p[k] === void 0 || p[k] === null ? d : String(p[k]);
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

// src/library/items/image-trail/runtime.ts
var mount = (el, props, ctx) => {
  let p = { ...props };
  prepareHost(el);
  const title = document.createElement("h2");
  title.dir = "auto";
  title.style.cssText = "position:absolute;inset:0;margin:0;display:grid;place-items:center;font-size:clamp(28px,6vw,96px);letter-spacing:-.045em;font-weight:700;pointer-events:none;z-index:50;mix-blend-mode:difference;color:#fff";
  el.appendChild(title);
  let lx = -1e4, ly = -1e4, k = 0, demoT = 0, last = performance.now();
  const apply = () => {
    el.style.background = str(p, "bg");
    title.textContent = str(p, "title");
    title.style.color = "#fff";
  };
  const spawn = (x, y) => {
    const im = list(p, "images");
    if (!im.length) return;
    const s = num(p, "size", 180), life = num(p, "life", 1100);
    const img = document.createElement("img");
    img.alt = "";
    img.src = resolveImage(im[k++ % im.length], k);
    img.style.cssText = `position:absolute;left:${x - s / 2}px;top:${y - s * 0.65}px;width:${s}px;aspect-ratio:3/4;object-fit:cover;border-radius:10px;pointer-events:none;box-shadow:0 20px 40px -14px rgba(0,0,0,.45);z-index:${k % 40}`;
    el.appendChild(img);
    const rot = (Math.random() - 0.5) * 16;
    img.animate([
      { transform: `scale(.4) rotate(${rot}deg)`, opacity: 0 },
      { transform: `scale(1.04) rotate(${rot}deg)`, opacity: 1, offset: 0.18 },
      { transform: `scale(1) rotate(${rot}deg)`, opacity: 1, offset: 0.6 },
      { transform: `scale(.85) translateY(30px) rotate(${rot * 1.4}deg)`, opacity: 0 }
    ], { duration: life / ctx.speed, easing: "cubic-bezier(.2,.8,.2,1)" }).onfinish = () => img.remove();
  };
  const move = (e) => {
    last = performance.now();
    const r = el.getBoundingClientRect();
    const x = e.clientX - r.left, y = e.clientY - r.top;
    if (Math.hypot(x - lx, y - ly) > num(p, "distance", 90)) {
      spawn(x, y);
      lx = x;
      ly = y;
    }
  };
  el.addEventListener("pointermove", move);
  apply();
  const loop = createLoop(el, ctx, (dt) => {
    if (performance.now() - last < 2500 || ctx.reducedMotion) return;
    demoT += dt;
    const W = el.clientWidth, H = el.clientHeight;
    const x = W / 2 + Math.cos(demoT * 1.3) * W * 0.32, y = H / 2 + Math.sin(demoT * 2.1) * H * 0.22;
    if (Math.hypot(x - lx, y - ly) > num(p, "distance", 90) * 1.4) {
      spawn(x, y);
      lx = x;
      ly = y;
    }
  });
  void escapeHTML;
  return { update(n) {
    p = { ...p, ...n };
    apply();
  }, setSpeed: loop.setSpeed, destroy() {
    loop.destroy();
    el.removeEventListener("pointermove", move);
    el.querySelectorAll("img").forEach((i) => i.remove());
    title.remove();
  } };
};
var runtime_default = mount;
export {
  runtime_default as default
};
