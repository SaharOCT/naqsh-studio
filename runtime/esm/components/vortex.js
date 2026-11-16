// src/library/_shared/kit.ts
var num = (p, k, d = 0) => {
  const v = Number(p[k]);
  return Number.isFinite(v) ? v : d;
};
var str = (p, k, d = "") => p[k] === void 0 || p[k] === null ? d : String(p[k]);
function hexToRgb(hex) {
  let h = hex.trim().replace("#", "");
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  const n = parseInt(h.slice(0, 6), 16);
  if (!Number.isFinite(n)) return [1, 1, 1];
  return [(n >> 16 & 255) / 255, (n >> 8 & 255) / 255, (n & 255) / 255];
}
var rgba = (hex, a) => {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${Math.round(r * 255)},${Math.round(g * 255)},${Math.round(b * 255)},${a})`;
};
var lerp = (a, b, t) => a + (b - a) * t;
function prepareHost(el, opts = {}) {
  const cs = getComputedStyle(el);
  if (cs.position === "static") el.style.position = "relative";
  if (opts.clip !== false) el.style.overflow = "hidden";
}
function createCanvas(el, onResize, maxDpr = 2) {
  prepareHost(el);
  const canvas = document.createElement("canvas");
  canvas.setAttribute("aria-hidden", "true");
  Object.assign(canvas.style, { position: "absolute", inset: "0", width: "100%", height: "100%", display: "block" });
  el.prepend(canvas);
  const handle = {
    canvas,
    width: 1,
    height: 1,
    dpr: 1,
    destroy() {
      ro.disconnect();
      canvas.remove();
    }
  };
  const measure = (notify = true) => {
    const r = el.getBoundingClientRect();
    handle.dpr = Math.min(window.devicePixelRatio || 1, maxDpr);
    handle.width = Math.max(1, Math.round(r.width));
    handle.height = Math.max(1, Math.round(r.height));
    canvas.width = Math.round(handle.width * handle.dpr);
    canvas.height = Math.round(handle.height * handle.dpr);
    if (notify) onResize(handle);
  };
  const ro = new ResizeObserver(() => measure());
  ro.observe(el);
  measure(false);
  return handle;
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
function makeNoise(seed = 1) {
  const perm = new Uint8Array(512);
  let s = seed * 9301 + 49297;
  const rand = () => (s = (s * 9301 + 49297) % 233280) / 233280;
  const p = Array.from({ length: 256 }, (_, i) => i);
  for (let i = 255; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [p[i], p[j]] = [p[j], p[i]];
  }
  for (let i = 0; i < 512; i++) perm[i] = p[i & 255];
  const grad = (h, x, y) => (h & 1 ? -x : x) + (h & 2 ? -y : y);
  const fade = (t) => t * t * t * (t * (t * 6 - 15) + 10);
  return (x, y) => {
    const X = Math.floor(x) & 255, Y = Math.floor(y) & 255;
    x -= Math.floor(x);
    y -= Math.floor(y);
    const u = fade(x), v = fade(y);
    const a = perm[X] + Y, b = perm[X + 1] + Y;
    return lerp(lerp(grad(perm[a], x, y), grad(perm[b], x - 1, y), u), lerp(grad(perm[a + 1], x, y - 1), grad(perm[b + 1], x - 1, y - 1), u), v);
  };
}

// src/library/items/vortex/runtime.ts
var mount = (el, props, ctx) => {
  let p = { ...props };
  const noise = makeNoise(3);
  let parts = [];
  const cv = createCanvas(el, () => {
    g.fillStyle = str(p, "bg");
    g.fillRect(0, 0, cv.canvas.width, cv.canvas.height);
  }, 1.5);
  const g = cv.canvas.getContext("2d");
  const spawn = () => ({ x: Math.random() * cv.width, y: Math.random() * cv.height, life: Math.random() * 200 });
  const seed = () => {
    parts = Array.from({ length: Math.round(num(p, "count", 1400)) }, spawn);
  };
  seed();
  g.fillStyle = str(p, "bg");
  g.fillRect(0, 0, cv.canvas.width, cv.canvas.height);
  const loop = createLoop(el, ctx, (dt, t) => {
    const W = cv.width, H = cv.height, cx = W / 2, cy = H / 2, sw = num(p, "swirl", 1), sp = num(p, "speed", 1) * 60;
    g.setTransform(cv.dpr, 0, 0, cv.dpr, 0, 0);
    g.fillStyle = rgba(str(p, "bg"), num(p, "trail", 0.12));
    g.fillRect(0, 0, W, H);
    const A = hexToRgb(str(p, "c1")), B = hexToRgb(str(p, "c2")), R = Math.hypot(cx, cy);
    for (const q of parts) {
      const dx = q.x - cx, dy = q.y - cy, d = Math.hypot(dx, dy) || 1;
      const n = noise(q.x * 4e-3, q.y * 4e-3 + t * 0.1) * 2;
      const vx = -dy / d * sw + Math.cos(n * 3.14) * 0.6 - dx / d * 0.15;
      const vy = dx / d * sw + Math.sin(n * 3.14) * 0.6 - dy / d * 0.15;
      const nx = q.x + vx * dt * sp, ny = q.y + vy * dt * sp;
      const k = Math.min(1, d / R);
      g.strokeStyle = `rgba(${[0, 1, 2].map((i) => Math.round(lerp(A[i], B[i], k) * 255)).join(",")},0.7)`;
      g.beginPath();
      g.moveTo(q.x, q.y);
      g.lineTo(nx, ny);
      g.stroke();
      q.x = nx;
      q.y = ny;
      q.life -= dt * 60;
      if (q.life < 0 || d < 6 || nx < 0 || ny < 0 || nx > W || ny > H) Object.assign(q, spawn(), { life: 100 + Math.random() * 200 });
    }
  });
  return {
    update(n) {
      const re = n.count !== void 0 && n.count !== p.count;
      p = { ...p, ...n };
      if (re) seed();
    },
    setSpeed: loop.setSpeed,
    destroy() {
      loop.destroy();
      cv.destroy();
    }
  };
};
var runtime_default = mount;
export {
  runtime_default as default
};
