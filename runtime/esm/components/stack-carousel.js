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
function springValue(initial = 0, stiffness = 170, damping = 22) {
  const s = { value: initial, target: initial, velocity: 0 };
  return {
    s,
    set(t) {
      s.target = t;
    },
    jump(v) {
      s.value = s.target = v;
      s.velocity = 0;
    },
    step(dt) {
      const h = Math.min(dt, 1 / 30);
      const a = -stiffness * (s.value - s.target) - damping * s.velocity;
      s.velocity += a * h;
      s.value += s.velocity * h;
      return s.value;
    },
    get settled() {
      return Math.abs(s.value - s.target) < 1e-3 && Math.abs(s.velocity) < 1e-3;
    }
  };
}

// src/library/items/stack-carousel/runtime.ts
var mount = (el, props, ctx) => {
  let p = { ...props };
  prepareHost(el, { clip: false });
  el.style.perspective = "1400px";
  el.style.touchAction = "pan-y";
  el.tabIndex = 0;
  const stage = document.createElement("div");
  stage.style.cssText = "position:absolute;inset:0;transform-style:preserve-3d";
  el.appendChild(stage);
  const pos = springValue(0, 120, 18);
  let cards = [], timer = 0;
  const build = () => {
    const im = list(p, "images"), t = list(p, "titles"), q = list(p, "quotes"), w = num(p, "cardWidth", 340);
    stage.innerHTML = im.map((s, i) => `<article style="position:absolute;left:50%;top:50%;width:${w}px;height:${w * 1.18}px;margin:${-w * 0.59}px 0 0 ${-w / 2}px;border-radius:24px;overflow:hidden;background:#141418;color:#fff;box-shadow:0 30px 60px -20px rgba(0,0,0,.6);will-change:transform;backface-visibility:hidden">
      <img alt="" src="${resolveImage(s, i)}" style="width:100%;height:58%;object-fit:cover;display:block">
      <div style="padding:20px 22px"><h3 style="margin:0 0 8px;font-size:22px;letter-spacing:-.02em">${escapeHTML(t[i] ?? "")}</h3><p dir="auto" style="margin:0;opacity:.7;line-height:1.5;font-size:15px">“${escapeHTML(q[i] ?? "")}”</p></div></article>`).join("");
    cards = Array.from(stage.children);
  };
  const go = (d) => {
    pos.set(Math.round(pos.s.target) + d);
    auto();
  };
  const auto = () => {
    clearInterval(timer);
    const iv = num(p, "interval", 4e3);
    if (iv > 0 && !ctx.reducedMotion) timer = window.setInterval(() => pos.set(Math.round(pos.s.target) + 1), iv / ctx.speed);
  };
  let sx = 0;
  const down = (e) => sx = e.clientX;
  const up = (e) => {
    const dx = e.clientX - sx;
    if (Math.abs(dx) > 40) go(dx < 0 ? 1 : -1);
    else if (Math.abs(dx) < 6) go(1);
  };
  const key = (e) => {
    if (e.key === "ArrowRight") go(1);
    if (e.key === "ArrowLeft") go(-1);
  };
  el.addEventListener("pointerdown", down);
  el.addEventListener("pointerup", up);
  el.addEventListener("keydown", key);
  build();
  auto();
  const loop = createLoop(el, ctx, (dt) => {
    const v = pos.step(dt || 1 / 60), n = cards.length, depth = num(p, "depth", 60);
    cards.forEach((c, i) => {
      let d = ((i - v) % n + n) % n;
      if (d > n - 1) d -= n;
      const leaving = d > n - 1.5 ? d - n : d;
      const x = leaving < 0 ? leaving * -460 : leaving * 18;
      const rot = leaving < 0 ? leaving * -25 : 0;
      c.style.transform = `translate3d(${x}px, ${-leaving * 16}px, ${-leaving * depth}px) rotateZ(${rot}deg) rotateY(${leaving < 0 ? leaving * -20 : 0}deg)`;
      c.style.opacity = String(leaving < -0.9 ? 0 : d > 4 ? 0 : 1 - Math.max(0, d - 2) * 0.4);
      c.style.zIndex = String(100 - Math.round(leaving * 10));
      c.style.filter = `brightness(${1 - Math.max(0, leaving) * 0.12})`;
    });
  }, { allowReduced: true });
  return { update(n) {
    p = { ...p, ...n };
    build();
    auto();
  }, replay: () => go(1), setSpeed: loop.setSpeed, destroy() {
    loop.destroy();
    clearInterval(timer);
    el.removeEventListener("pointerdown", down);
    el.removeEventListener("pointerup", up);
    el.removeEventListener("keydown", key);
    stage.remove();
  } };
};
var runtime_default = mount;
export {
  runtime_default as default
};
